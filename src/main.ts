import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { loadEnvConfig } from './config/env.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const config = loadEnvConfig();

  const app = await NestFactory.create(AppModule);

  // 1. Ocultar cabecera X-Powered-By para evitar fingerprinting del servidor
  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.disable === 'function') {
    expressApp.disable('x-powered-by');
  }

  // 2. Limitar tamaño de payloads para mitigar ataques de denegación de servicio (DoS)
  app.use(json({ limit: '16kb' }));
  app.use(urlencoded({ extended: true, limit: '16kb' }));

  // 3. Cabeceras defensivas OWASP en todas las respuestas HTTP (incluidos errores y 404)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });

  app.setGlobalPrefix('api');

  // 4. Lista blanca estricta de orígenes CORS (nunca reflejar orígenes arbitrarios)
  const allowedOrigins = config.corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const trustedOrigins = new Set([
    ...allowedOrigins,
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'https://iberfutbol.es',
    'https://www.iberfutbol.es',
  ]);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || trustedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origen no autorizado por política CORS'), false);
      }
    },
    methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: false,
    maxAge: 86400,
  });

  // 5. Validación estricta de DTOs y parámetros de entrada
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 6. Exponer documentación OpenAPI solo fuera de producción
  if (config.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('IberFútbol API — Plataforma del Fútbol Español')
      .setDescription(
        'API oficial para partidos en directo, resultados, clasificaciones, equipos, jugadores y actualidad del fútbol español.',
      )
      .setVersion('1.0.0')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(config.port);
  logger.log(`🚀 Backend running on http://localhost:${config.port}/api`);
}

bootstrap();

