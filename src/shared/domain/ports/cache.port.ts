export const CACHE_PORT = Symbol('CACHE_PORT');

/**
 * Estrategia de TTL (en segundos) según naturaleza del dato deportivo:
 * - LIVE_MATCHES: 20s (partidos en juego)
 * - UPCOMING_MATCHES: 120s (próximos partidos y marcadores del día)
 * - NEWS_AND_TIMELINE: 180s (actualidad y noticias)
 * - STANDINGS: 600s (clasificaciones)
 * - TEAMS_AND_PLAYERS: 3600s (fichas de equipos y jugadores)
 */
export const CACHE_TTL = {
  LIVE_MATCHES: 20,
  UPCOMING_MATCHES: 120,
  NEWS_AND_TIMELINE: 180,
  STANDINGS: 600,
  TEAMS_AND_PLAYERS: 3600,
  GENERATED_CONTENT: 7200,
} as const;

export interface CacheMetrics {
  mode: 'redis' | 'memory';
  hits: number;
  misses: number;
  hitRatePercent: number;
  activeKeysCount: number;
  lastEvictionAt: string | null;
}

export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePrefix(prefix: string): Promise<void>;
  evictExpired(): Promise<number>;
  getMetrics(): Promise<CacheMetrics>;
}
