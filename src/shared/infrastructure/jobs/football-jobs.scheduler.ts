import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  CACHE_PORT,
  CACHE_TTL,
  CacheMetrics,
  CachePort,
} from '../../domain/ports/cache.port';
import {
  MATCH_REPOSITORY,
  MatchRepository,
} from '../../../modules/matches/domain/match.repository';
import { MatchStatus } from '../../../modules/matches/domain/match.entity';
import {
  STANDINGS_REPOSITORY,
  StandingsRepository,
} from '../../../modules/standings/domain/standings.repository';
import {
  COMPETITION_REPOSITORY,
  CompetitionRepository,
} from '../../../modules/competitions/domain/competition.repository';
import {
  NEWS_REPOSITORY,
  NewsRepository,
} from '../../../modules/news/domain/news.entity';
import {
  GenerateMatchSummaryUseCase,
  GenerateRoundSummaryUseCase,
} from '../../../modules/content/application/content.use-cases';

export type JobIdentifier =
  | 'live-matches'
  | 'post-match-ai'
  | 'standings-round'
  | 'news-timeline'
  | 'cache-cleanup';

export interface JobExecutionLog {
  jobName: JobIdentifier;
  description: string;
  cronExpression: string;
  lastRunAt: string | null;
  lastDurationMs: number;
  runsCount: number;
  lastStatus: 'IDLE' | 'SUCCESS' | 'ERROR';
  lastDetail: string;
}

export interface SystemObservabilitySnapshot {
  timestamp: string;
  cacheMetrics: CacheMetrics;
  ttlPolicySeconds: typeof CACHE_TTL;
  jobs: JobExecutionLog[];
}

@Injectable()
export class FootballJobsScheduler implements OnModuleInit {
  private readonly logger = new Logger(FootballJobsScheduler.name);
  private readonly processedFinishedMatches = new Set<string>();

  private readonly jobLogs = new Map<JobIdentifier, JobExecutionLog>([
    [
      'live-matches',
      {
        jobName: 'live-matches',
        description:
          'Actualización de marcadores en directo y detección de final de partido',
        cronExpression: '*/30 * * * * *',
        lastRunAt: null,
        lastDurationMs: 0,
        runsCount: 0,
        lastStatus: 'IDLE',
        lastDetail: 'Pendiente de primera ejecución',
      },
    ],
    [
      'post-match-ai',
      {
        jobName: 'post-match-ai',
        description:
          'Pipeline fin de partido -> Clasificación -> Contexto -> IA -> Validación -> Publicación',
        cronExpression: '0 */2 * * * *',
        lastRunAt: null,
        lastDurationMs: 0,
        runsCount: 0,
        lastStatus: 'IDLE',
        lastDetail: 'Pendiente de primera ejecución',
      },
    ],
    [
      'standings-round',
      {
        jobName: 'standings-round',
        description:
          'Sincronización de clasificaciones y generación de resumen editorial de jornada',
        cronExpression: '0 */10 * * * *',
        lastRunAt: null,
        lastDurationMs: 0,
        runsCount: 0,
        lastStatus: 'IDLE',
        lastDetail: 'Pendiente de primera ejecución',
      },
    ],
    [
      'news-timeline',
      {
        jobName: 'news-timeline',
        description:
          'Actualización de noticias permitidas y timeline en tiempo casi real',
        cronExpression: '0 */5 * * * *',
        lastRunAt: null,
        lastDurationMs: 0,
        runsCount: 0,
        lastStatus: 'IDLE',
        lastDetail: 'Pendiente de primera ejecución',
      },
    ],
    [
      'cache-cleanup',
      {
        jobName: 'cache-cleanup',
        description:
          'Purga preventiva de entradas expiradas en caché y actualización de métricas',
        cronExpression: '0 */15 * * * *',
        lastRunAt: null,
        lastDurationMs: 0,
        runsCount: 0,
        lastStatus: 'IDLE',
        lastDetail: 'Pendiente de primera ejecución',
      },
    ],
  ]);

  constructor(
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: MatchRepository,
    @Inject(STANDINGS_REPOSITORY)
    private readonly standingsRepository: StandingsRepository,
    @Inject(COMPETITION_REPOSITORY)
    private readonly competitionRepository: CompetitionRepository,
    @Inject(NEWS_REPOSITORY)
    private readonly newsRepository: NewsRepository,
    private readonly generateMatchSummaryUseCase: GenerateMatchSummaryUseCase,
    private readonly generateRoundSummaryUseCase: GenerateRoundSummaryUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    // Warm up initial pipeline asynchronously so editorial summaries and cache are populated on boot
    await this.runPostMatchAiPipeline();
    await this.syncStandingsAndRoundSummaries();
  }

  @Cron('*/30 * * * * *')
  async syncLiveMatchesAndResults(): Promise<JobExecutionLog> {
    return this.executeTrackedJob('live-matches', async () => {
      await this.cache.invalidatePrefix('matches:live');
      const liveMatches = await this.matchRepository.findLive();
      await this.cache.set('matches:live', liveMatches, CACHE_TTL.LIVE_MATCHES);

      const allMatches = await this.matchRepository.findAll();
      const newlyFinished = allMatches.filter(
        (m) =>
          m.status === MatchStatus.FINISHED &&
          !this.processedFinishedMatches.has(m.slug),
      );

      if (newlyFinished.length > 0) {
        await this.runPostMatchAiPipeline();
      }

      return `${liveMatches.length} partidos en directo sincronizados (${newlyFinished.length} nuevos finalizados detectados)`;
    });
  }

  @Cron('0 */2 * * * *')
  async runPostMatchAiPipeline(): Promise<JobExecutionLog> {
    return this.executeTrackedJob('post-match-ai', async () => {
      const finishedMatches = await this.matchRepository.findAll({
        status: MatchStatus.FINISHED,
      });

      let generatedCount = 0;
      for (const match of finishedMatches) {
        await this.standingsRepository.findByCompetitionSlug(
          match.competitionSlug,
        );
        await this.generateMatchSummaryUseCase.execute(match.slug, false);
        this.processedFinishedMatches.add(match.slug);
        generatedCount += 1;
      }

      return `Pipeline post-partido verificado para ${generatedCount} encuentros finalizados`;
    });
  }

  @Cron('0 */10 * * * *')
  async syncStandingsAndRoundSummaries(): Promise<JobExecutionLog> {
    return this.executeTrackedJob('standings-round', async () => {
      const competitions = await this.competitionRepository.findAll();
      let roundSummaries = 0;

      for (const comp of competitions) {
        const table = await this.standingsRepository.findByCompetitionSlug(
          comp.slug,
        );
        if (table) {
          await this.cache.set(
            `standings:${comp.slug}`,
            table,
            CACHE_TTL.STANDINGS,
          );
          await this.generateRoundSummaryUseCase.execute(comp.slug, false);
          roundSummaries += 1;
        }
      }

      return `Clasificaciones cacheadas y ${roundSummaries} resúmenes de jornada validados`;
    });
  }

  @Cron('0 */5 * * * *')
  async syncPermittedNewsAndTimeline(): Promise<JobExecutionLog> {
    return this.executeTrackedJob('news-timeline', async () => {
      await this.cache.invalidatePrefix('news:');
      const news = await this.newsRepository.findAll();
      await this.cache.set(
        'news:list:all:all:all:all:12',
        news,
        CACHE_TTL.NEWS_AND_TIMELINE,
      );
      return `${news.length} noticias permitidas verificadas y cacheadas`;
    });
  }

  @Cron('0 */15 * * * *')
  async cleanExpiredCacheEntries(): Promise<JobExecutionLog> {
    return this.executeTrackedJob('cache-cleanup', async () => {
      const evicted = await this.cache.evictExpired();
      const metrics = await this.cache.getMetrics();
      return `${evicted} claves expiradas purgadas (${metrics.activeKeysCount} claves activas, hit rate ${metrics.hitRatePercent}%)`;
    });
  }

  async runJobByName(jobName: JobIdentifier): Promise<JobExecutionLog> {
    switch (jobName) {
      case 'live-matches':
        return this.syncLiveMatchesAndResults();
      case 'post-match-ai':
        return this.runPostMatchAiPipeline();
      case 'standings-round':
        return this.syncStandingsAndRoundSummaries();
      case 'news-timeline':
        return this.syncPermittedNewsAndTimeline();
      case 'cache-cleanup':
        return this.cleanExpiredCacheEntries();
    }
  }

  async getObservabilitySnapshot(): Promise<SystemObservabilitySnapshot> {
    const cacheMetrics = await this.cache.getMetrics();
    return {
      timestamp: new Date().toISOString(),
      cacheMetrics,
      ttlPolicySeconds: CACHE_TTL,
      jobs: Array.from(this.jobLogs.values()),
    };
  }

  private async executeTrackedJob(
    jobName: JobIdentifier,
    work: () => Promise<string>,
  ): Promise<JobExecutionLog> {
    const current = this.jobLogs.get(jobName)!;
    const start = Date.now();
    try {
      const detail = await work();
      const updated: JobExecutionLog = {
        ...current,
        lastRunAt: new Date().toISOString(),
        lastDurationMs: Date.now() - start,
        runsCount: current.runsCount + 1,
        lastStatus: 'SUCCESS',
        lastDetail: detail,
      };
      this.jobLogs.set(jobName, updated);
      return updated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido en job';
      this.logger.error(`Job ${jobName} failed: ${message}`);
      const updated: JobExecutionLog = {
        ...current,
        lastRunAt: new Date().toISOString(),
        lastDurationMs: Date.now() - start,
        runsCount: current.runsCount + 1,
        lastStatus: 'ERROR',
        lastDetail: message,
      };
      this.jobLogs.set(jobName, updated);
      return updated;
    }
  }
}
