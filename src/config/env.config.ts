export interface AppEnvironmentConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  persistenceMode: 'memory' | 'postgres';
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  cacheMode: 'memory' | 'redis';
  redis: {
    host: string;
    port: number;
  };
  footballProvider:
    | 'live-spanish'
    | 'realistic-spanish'
    | 'football-data'
    | 'api-football';
  footballDataApiKey: string;
  footballDataBaseUrl: string;
  apiFootballKey: string;
  apiFootballBaseUrl: string;
  aiProvider: 'structured-fallback' | 'ollama' | 'gemini' | 'openai';
  ollamaBaseUrl: string;
  ollamaModel: string;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
}

export const loadEnvConfig = (): AppEnvironmentConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  persistenceMode: (process.env.PERSISTENCE_MODE as 'memory' | 'postgres') || 'memory',
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'futbol_user',
    password: process.env.POSTGRES_PASSWORD || 'futbol_secret',
    database: process.env.POSTGRES_DB || 'futbol_db',
  },
  cacheMode: (process.env.CACHE_MODE as 'memory' | 'redis') || 'memory',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  footballProvider:
    (process.env.FOOTBALL_DATA_PROVIDER as
      | 'live-spanish'
      | 'realistic-spanish'
      | 'football-data'
      | 'api-football') || 'live-spanish',
  footballDataApiKey: process.env.FOOTBALL_DATA_API_KEY || '',
  footballDataBaseUrl:
    process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
  apiFootballKey: process.env.API_FOOTBALL_KEY || '',
  apiFootballBaseUrl:
    process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
  aiProvider:
    (process.env.AI_PROVIDER as
      | 'structured-fallback'
      | 'ollama'
      | 'gemini'
      | 'openai') || 'structured-fallback',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
});
