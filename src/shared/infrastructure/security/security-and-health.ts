import {
  ArgumentsHost,
  BadRequestException,
  CallHandler,
  CanActivate,
  Catch,
  Controller,
  ExceptionFilter,
  ExecutionContext,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import {
  CACHE_PORT,
  CachePort,
} from '../../domain/ports/cache.port';
import { loadEnvConfig } from '../../../config/env.config';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SAFE_PARAM_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

export function sanitizeInputString(input: string, maxLength = 120): string {
  return input
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/(?:javascript|vbscript|data):/gi, '')
    .trim()
    .slice(0, maxLength);
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly mutationBuckets = new Map<string, RateLimitBucket>();
  private readonly windowMs = 60_000;
  private readonly maxRequestsPerWindow = 180;
  private readonly maxMutationsPerWindow = 12;
  private readonly maxTrackedClients = 5_000;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<{
      ip?: string;
      method?: string;
      url?: string;
      socket?: { remoteAddress?: string };
      headers?: Record<string, string | string[] | undefined>;
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
    }>();
    const res = http.getResponse<{
      setHeader?: (name: string, value: string) => void;
    }>();

    // 1. Validate route parameters against path traversal, SQL/NoSQL injection & prototype pollution
    if (req?.params && typeof req.params === 'object') {
      for (const [key, val] of Object.entries(req.params)) {
        if (DANGEROUS_KEYS.has(key)) {
          throw new BadRequestException('Parámetro de ruta no permitido.');
        }
        if (typeof val === 'string') {
          if (val.includes('..') || val.includes('\0') || !SAFE_PARAM_REGEX.test(val)) {
            throw new BadRequestException('Formato de parámetro inválido.');
          }
        }
      }
    }

    // 2. Sanitize & bound string query parameters against XSS, parameter pollution & prototype pollution
    if (req?.query && typeof req.query === 'object') {
      for (const [key, val] of Object.entries(req.query)) {
        if (DANGEROUS_KEYS.has(key)) {
          delete req.query[key];
          continue;
        }
        if (typeof val === 'string') {
          req.query[key] = sanitizeInputString(val, 120);
        } else if (Array.isArray(val)) {
          // Prevent HTTP Parameter Pollution (HPP) arrays
          const firstStr = val.find((v): v is string => typeof v === 'string');
          req.query[key] = firstStr ? sanitizeInputString(firstStr, 120) : '';
        }
      }
    }

    // 3. Resolve client IP safely (only trust X-Forwarded-For when TRUST_PROXY=true)
    let clientKey = req?.ip || req?.socket?.remoteAddress || 'local-client';
    if (process.env.TRUST_PROXY === 'true') {
      const forwarded = req?.headers?.['x-forwarded-for'];
      const rawForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      if (rawForwarded) {
        clientKey = rawForwarded.split(',')[0].trim() || clientKey;
      }
    }

    const now = Date.now();
    this.pruneBucketsIfNeeded(now);

    // 4. Strict rate limit on expensive AI generation / refresh / POST requests
    const isExpensiveRequest =
      req?.method === 'POST' || req?.query?.refresh === 'true';
    if (isExpensiveRequest) {
      const mutAllowed = this.consumeBucket(
        this.mutationBuckets,
        `${clientKey}:mut`,
        now,
        this.maxMutationsPerWindow,
      );
      if (!mutAllowed.allowed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message:
              'Has alcanzado el límite de actualizaciones por minuto. Espera unos segundos.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 5. General per-IP rate limit
    const result = this.consumeBucket(
      this.buckets,
      clientKey,
      now,
      this.maxRequestsPerWindow,
    );

    res?.setHeader?.('X-RateLimit-Limit', String(this.maxRequestsPerWindow));
    res?.setHeader?.('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            'Límite de peticiones superado. Por favor, espera unos segundos antes de volver a consultar.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private consumeBucket(
    map: Map<string, RateLimitBucket>,
    key: string,
    now: number,
    limit: number,
  ): { allowed: boolean; remaining: number } {
    const current = map.get(key);
    if (!current || now > current.resetAt) {
      map.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: Math.max(0, limit - 1) };
    }
    current.count += 1;
    const remaining = Math.max(0, limit - current.count);
    return { allowed: current.count <= limit, remaining };
  }

  private pruneBucketsIfNeeded(now: number): void {
    if (this.buckets.size > this.maxTrackedClients) {
      for (const [k, v] of this.buckets.entries()) {
        if (now > v.resetAt) {
          this.buckets.delete(k);
        }
      }
      if (this.buckets.size > this.maxTrackedClients) {
        this.buckets.clear();
      }
    }
    if (this.mutationBuckets.size > this.maxTrackedClients) {
      this.mutationBuckets.clear();
    }
  }
}

@Injectable()
export class SecurityAndObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest<{ method?: string; originalUrl?: string; url?: string }>();
    const res = http.getResponse<{
      statusCode?: number;
      setHeader?: (name: string, value: string) => void;
    }>();

    res?.setHeader?.('X-Content-Type-Options', 'nosniff');
    res?.setHeader?.('X-Frame-Options', 'DENY');
    res?.setHeader?.('Referrer-Policy', 'strict-origin-when-cross-origin');
    res?.setHeader?.(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    );
    res?.setHeader?.('X-XSS-Protection', '0');

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        const method = req?.method ?? 'GET';
        const url = (req?.originalUrl ?? req?.url ?? '/').split('?')[0];
        const status = res?.statusCode ?? 200;
        if (durationMs > 250) {
          this.logger.warn(`${method} ${url} ${status} - ${durationMs}ms (SLOW)`);
        }
      }),
    );
  }
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const request = ctx.getRequest<{ url?: string; method?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'No se pudo procesar la solicitud en este momento.';
    if (status < 500) {
      if (typeof rawResponse === 'string') {
        message = rawResponse;
      } else if (
        rawResponse &&
        typeof rawResponse === 'object' &&
        'message' in rawResponse
      ) {
        const m = (rawResponse as { message: string | string[] }).message;
        message = Array.isArray(m) ? m.join(', ') : m;
      } else if (exception instanceof Error) {
        message = exception.message;
      }
    }

    const safePath = sanitizeInputString(
      (request?.url ?? '/').split('?')[0],
      100,
    );

    if (status >= 500) {
      this.logger.error(
        `[${request?.method ?? 'GET'} ${safePath}] ${
          exception instanceof Error ? exception.message : 'Unknown error'
        }`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      path: safePath,
      timestamp: new Date().toISOString(),
    });
  }
}

@Controller('health')
export class HealthController {
  private readonly bootTime = Date.now();

  constructor(
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  @Get()
  async checkHealth() {
    const config = loadEnvConfig();
    if (config.nodeEnv === 'production') {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    }
    const cacheMetrics = await this.cache.getMetrics();
    return {
      status: 'ok',
      service: 'iberfutbol-backend',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - this.bootTime) / 1000),
      timestamp: new Date().toISOString(),
      environment: {
        persistenceMode: config.persistenceMode,
        cacheMode: cacheMetrics.mode,
        footballProvider: config.footballProvider,
        aiProvider: config.aiProvider,
      },
      cacheMetrics,
    };
  }
}

