import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CACHE_PORT } from './domain/ports/cache.port';
import { FOOTBALL_DATA_PROVIDER } from './domain/ports/football-data-provider.port';
import { HybridCacheAdapter } from './infrastructure/cache/hybrid-cache.adapter';
import { RealisticSpanishFootballProvider } from './infrastructure/providers/realistic-spanish-football.provider';
import { LiveSpanishFootballProvider } from './infrastructure/providers/live-spanish-football.provider';
import { ExternalHttpFootballProvider } from './infrastructure/providers/external-http-football.provider';
import {
  GlobalHttpExceptionFilter,
  HealthController,
  RateLimitGuard,
  SecurityAndObservabilityInterceptor,
} from './infrastructure/security/security-and-health';
import { loadEnvConfig } from '../config/env.config';

@Global()
@Module({
  controllers: [HealthController],
  providers: [
    RealisticSpanishFootballProvider,
    LiveSpanishFootballProvider,
    ExternalHttpFootballProvider,
    RateLimitGuard,
    SecurityAndObservabilityInterceptor,
    GlobalHttpExceptionFilter,
    {
      provide: APP_GUARD,
      useExisting: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useExisting: SecurityAndObservabilityInterceptor,
    },
    {
      provide: APP_FILTER,
      useExisting: GlobalHttpExceptionFilter,
    },
    {
      provide: CACHE_PORT,
      useClass: HybridCacheAdapter,
    },
    {
      provide: FOOTBALL_DATA_PROVIDER,
      useFactory: (
        liveSpanish: LiveSpanishFootballProvider,
        realistic: RealisticSpanishFootballProvider,
        externalHttp: ExternalHttpFootballProvider,
      ) => {
        const config = loadEnvConfig();
        if (config.footballProvider === 'realistic-spanish') {
          return realistic;
        }
        if (
          config.footballProvider === 'football-data' ||
          config.footballProvider === 'api-football'
        ) {
          return externalHttp;
        }
        return liveSpanish;
      },
      inject: [
        LiveSpanishFootballProvider,
        RealisticSpanishFootballProvider,
        ExternalHttpFootballProvider,
      ],
    },
  ],
  exports: [
    CACHE_PORT,
    FOOTBALL_DATA_PROVIDER,
    RateLimitGuard,
    SecurityAndObservabilityInterceptor,
    GlobalHttpExceptionFilter,
  ],
})
export class SharedModule {}
