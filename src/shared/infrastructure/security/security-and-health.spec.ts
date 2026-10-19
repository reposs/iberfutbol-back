import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import {
  GlobalHttpExceptionFilter,
  HealthController,
  RateLimitGuard,
  sanitizeInputString,
} from './security-and-health';
import { HybridCacheAdapter } from '../cache/hybrid-cache.adapter';

describe('Fase 8: Security, Rate Limiting, Input Sanitization & Health Monitoring', () => {
  it('sanitizes XSS script tags and angle brackets from query strings', () => {
    const dirty = '  <script>alert("xss")</script>Real Madrid <b>CF</b>  ';
    expect(sanitizeInputString(dirty)).toBe('Real Madrid bCF/b');
  });

  it('tracks client request rate limits and sets X-RateLimit headers', () => {
    const guard = new RateLimitGuard();
    const headersSet: Record<string, string> = {};
    const queryObj: Record<string, unknown> = {
      q: '<script>evil()</script>barcelona',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          headers: {},
          query: queryObj,
        }),
        getResponse: () => ({
          setHeader: (name: string, val: string) => {
            headersSet[name] = val;
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const allowed = guard.canActivate(mockContext);
    expect(allowed).toBe(true);
    expect(queryObj.q).toBe('barcelona');
    expect(headersSet['X-RateLimit-Limit']).toBe('180');
    expect(headersSet['X-RateLimit-Remaining']).toBe('179');
  });

  it('formats exceptions cleanly without leaking stack traces via GlobalHttpExceptionFilter', () => {
    const filter = new GlobalHttpExceptionFilter();
    let capturedStatus = 0;
    let capturedJson: Record<string, unknown> = {};

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: (code: number) => {
            capturedStatus = code;
            return {
              json: (body: Record<string, unknown>) => {
                capturedJson = body;
              },
            };
          },
        }),
        getRequest: () => ({
          url: '/api/matches/unknown',
          method: 'GET',
        }),
      }),
    };

    filter.catch(
      new HttpException('Partido no encontrado', HttpStatus.NOT_FOUND),
      host as never,
    );

    expect(capturedStatus).toBe(404);
    expect(capturedJson.statusCode).toBe(404);
    expect(capturedJson.message).toBe('Partido no encontrado');
    expect(capturedJson.path).toBe('/api/matches/unknown');
  });

  it('returns system readiness and cache telemetry from HealthController', async () => {
    const cache = new HybridCacheAdapter();
    const controller = new HealthController(cache);

    const status = await controller.checkHealth();
    expect(status.status).toBe('ok');
    expect(status.service).toBe('iberfutbol-backend');
    expect(status.cacheMetrics.mode).toBe('memory');

    await cache.onModuleDestroy();
  });
});
