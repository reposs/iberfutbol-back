import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheMetrics, CachePort } from '../../domain/ports/cache.port';
import { loadEnvConfig } from '../../../config/env.config';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class HybridCacheAdapter implements CachePort, OnModuleDestroy {
  private readonly logger = new Logger(HybridCacheAdapter.name);
  private readonly memoryStore = new Map<string, MemoryCacheEntry>();
  private redisClient: Redis | null = null;
  private useRedis = false;
  private hits = 0;
  private misses = 0;
  private lastEvictionAt: string | null = null;

  constructor() {
    const config = loadEnvConfig();
    if (config.cacheMode === 'redis') {
      try {
        this.redisClient = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        });

        this.redisClient.on('error', (err) => {
          if (this.useRedis) {
            this.logger.warn(
              `Redis connection unavailable (${err.message}). Falling back to In-Memory TTL cache.`,
            );
            this.useRedis = false;
          }
        });

        this.redisClient
          .connect()
          .then(() => {
            this.useRedis = true;
            this.logger.log(
              `Connected to Redis cache at ${config.redis.host}:${config.redis.port}`,
            );
          })
          .catch(() => {
            this.useRedis = false;
            this.logger.warn(
              'Redis not reachable on startup; operating in In-Memory TTL cache mode.',
            );
          });
      } catch {
        this.useRedis = false;
      }
    } else {
      this.logger.log('Cache initialized in fast In-Memory TTL mode (CACHE_MODE=memory)');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && this.redisClient) {
      const raw = await this.redisClient.get(key);
      if (raw) {
        this.hits += 1;
        return JSON.parse(raw) as T;
      }
      this.misses += 1;
      return null;
    }

    const entry = this.memoryStore.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      this.misses += 1;
      return null;
    }

    this.hits += 1;
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.useRedis && this.redisClient) {
      await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
      return;
    }

    this.memoryStore.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    if (this.useRedis && this.redisClient) {
      await this.redisClient.del(key);
      return;
    }
    this.memoryStore.delete(key);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (this.useRedis && this.redisClient) {
      const keys = await this.redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
      return;
    }

    for (const key of this.memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryStore.delete(key);
      }
    }
  }

  async evictExpired(): Promise<number> {
    this.lastEvictionAt = new Date().toISOString();
    if (this.useRedis) {
      // Redis handles native TTL eviction automatically
      return 0;
    }

    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now > entry.expiresAt) {
        this.memoryStore.delete(key);
        evicted += 1;
      }
    }
    return evicted;
  }

  async getMetrics(): Promise<CacheMetrics> {
    let activeKeysCount = this.memoryStore.size;
    if (this.useRedis && this.redisClient) {
      try {
        activeKeysCount = await this.redisClient.dbsize();
      } catch {
        activeKeysCount = 0;
      }
    } else {
      const now = Date.now();
      activeKeysCount = Array.from(this.memoryStore.values()).filter(
        (entry) => entry.expiresAt > now,
      ).length;
    }

    const total = this.hits + this.misses;
    const hitRatePercent = total > 0 ? Math.round((this.hits / total) * 1000) / 10 : 0;

    return {
      mode: this.useRedis ? 'redis' : 'memory',
      hits: this.hits,
      misses: this.misses,
      hitRatePercent,
      activeKeysCount,
      lastEvictionAt: this.lastEvictionAt,
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit().catch(() => undefined);
    }
  }
}
