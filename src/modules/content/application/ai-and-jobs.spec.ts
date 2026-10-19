import {
  MatchContextBuilder,
  PlayerContextBuilder,
  RoundContextBuilder,
  TeamContextBuilder,
} from '../../ai/application/context-builders';
import { AiOutputValidator } from '../../ai/application/ai-output.validator';
import {
  PromptLoaderService,
  StructuredDataAiAdapter,
} from '../../ai/infrastructure/ai-providers.adapter';
import { HybridCacheAdapter } from '../../../shared/infrastructure/cache/hybrid-cache.adapter';
import { RealisticSpanishFootballProvider } from '../../../shared/infrastructure/providers/realistic-spanish-football.provider';
import { MatchPersistenceRepository } from '../../matches/infrastructure/match-persistence.repository';
import { StandingsPersistenceRepository } from '../../standings/infrastructure/standings-persistence.repository';
import { CompetitionPersistenceRepository } from '../../competitions/infrastructure/competition-persistence.repository';
import { TeamPersistenceRepository } from '../../teams/infrastructure/team-persistence.repository';
import { PlayerPersistenceRepository } from '../../players/infrastructure/player-persistence.repository';
import { NewsPersistenceRepository } from '../../news/infrastructure/news-persistence.repository';
import { PermittedSpanishNewsProvider } from '../../news/infrastructure/permitted-spanish-news.provider';
import { ContentPersistenceRepository } from '../infrastructure/content-persistence.repository';
import {
  GenerateMatchSummaryUseCase,
  GeneratePlayerSummaryUseCase,
  GenerateRoundSummaryUseCase,
  GenerateTeamSummaryUseCase,
} from './content.use-cases';
import {
  GeneratedContentStatus,
  GeneratedContentType,
} from '../domain/generated-content.entity';
import { FootballJobsScheduler } from '../../../shared/infrastructure/jobs/football-jobs.scheduler';

describe('Fase 5 & 6: AI Editorial Layer, Validation, Cache Metrics & Scheduled Jobs', () => {
  let cache: HybridCacheAdapter;
  let footballProvider: RealisticSpanishFootballProvider;
  let matchRepo: MatchPersistenceRepository;
  let standingsRepo: StandingsPersistenceRepository;
  let competitionRepo: CompetitionPersistenceRepository;
  let teamRepo: TeamPersistenceRepository;
  let playerRepo: PlayerPersistenceRepository;
  let newsRepo: NewsPersistenceRepository;
  let contentRepo: ContentPersistenceRepository;
  let validator: AiOutputValidator;
  let aiAdapter: StructuredDataAiAdapter;
  let generateMatchSummary: GenerateMatchSummaryUseCase;
  let generateRoundSummary: GenerateRoundSummaryUseCase;
  let generateTeamSummary: GenerateTeamSummaryUseCase;
  let generatePlayerSummary: GeneratePlayerSummaryUseCase;

  beforeEach(async () => {
    cache = new HybridCacheAdapter();
    footballProvider = new RealisticSpanishFootballProvider();
    matchRepo = new MatchPersistenceRepository(footballProvider);
    standingsRepo = new StandingsPersistenceRepository(footballProvider);
    competitionRepo = new CompetitionPersistenceRepository(footballProvider);
    teamRepo = new TeamPersistenceRepository(footballProvider);
    playerRepo = new PlayerPersistenceRepository(footballProvider);
    newsRepo = new NewsPersistenceRepository(new PermittedSpanishNewsProvider());
    contentRepo = new ContentPersistenceRepository();
    validator = new AiOutputValidator();
    aiAdapter = new StructuredDataAiAdapter();

    await Promise.all([
      matchRepo.onModuleInit(),
      standingsRepo.onModuleInit(),
      competitionRepo.onModuleInit(),
      teamRepo.onModuleInit(),
      playerRepo.onModuleInit(),
      newsRepo.onModuleInit(),
    ]);

    generateMatchSummary = new GenerateMatchSummaryUseCase(
      matchRepo,
      standingsRepo,
      teamRepo,
      contentRepo,
      aiAdapter,
      new MatchContextBuilder(),
      validator,
      cache,
    );

    generateRoundSummary = new GenerateRoundSummaryUseCase(
      competitionRepo,
      matchRepo,
      standingsRepo,
      playerRepo,
      contentRepo,
      aiAdapter,
      new RoundContextBuilder(),
      validator,
      cache,
    );

    generateTeamSummary = new GenerateTeamSummaryUseCase(
      teamRepo,
      contentRepo,
      aiAdapter,
      new TeamContextBuilder(),
      validator,
      cache,
    );

    generatePlayerSummary = new GeneratePlayerSummaryUseCase(
      playerRepo,
      teamRepo,
      contentRepo,
      aiAdapter,
      new PlayerContextBuilder(),
      validator,
      cache,
    );
  });

  afterEach(async () => {
    await cache.onModuleDestroy();
  });

  it('generates a verified MATCH_SUMMARY and skips regeneration when verifiedDataHash is unchanged', async () => {
    const spy = jest.spyOn(aiAdapter, 'generateMatchSummary');

    const first = await generateMatchSummary.execute(
      'real-madrid-atletico-de-madrid',
    );
    expect(first.type).toBe(GeneratedContentType.MATCH_SUMMARY);
    expect(first.status).toBe(GeneratedContentStatus.PUBLISHED);
    expect(first.title).toContain('Atlético de Madrid');
    expect(first.highlights.length).toBeGreaterThanOrEqual(2);
    expect(first.verifiedDataHash).toHaveLength(16);
    expect(spy).toHaveBeenCalledTimes(1);

    // Calling again without forceRegenerate must return existing content without calling AI again
    const second = await generateMatchSummary.execute(
      'real-madrid-atletico-de-madrid',
    );
    expect(second.verifiedDataHash).toBe(first.verifiedDataHash);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('generates a verified MATCH_PREVIEW for upcoming matches', async () => {
    const preview = await generateMatchSummary.execute(
      'real-betis-villarreal-cf',
    );
    expect(preview.type).toBe(GeneratedContentType.MATCH_PREVIEW);
    expect(preview.status).toBe(GeneratedContentStatus.PUBLISHED);
    expect(preview.title).toContain('Previa');
    expect(preview.content).toContain('Real Betis');
    expect(preview.content).toContain('Villarreal CF');
  });

  it('flags AI drafts as REVIEW_REQUIRED when forbidden speculative phrases or mismatched scores appear', () => {
    const badDraft = {
      title: 'Real Madrid vs FC Barcelona (5-0)',
      summary: 'Según rumores hubo polémica arbitral.',
      content:
        'En un encuentro donde Real Madrid y FC Barcelona jugaron en el Bernabéu, declaró en rueda de prensa que fue injusto.',
      highlights: ['Marcador inventado 5-0'],
      provider: 'test',
      model: 'test-model',
    };

    const result = validator.validate(badDraft, [
      'Real Madrid',
      'FC Barcelona',
      '1-2',
    ]);

    expect(result.isValid).toBe(false);
    expect(result.status).toBe(GeneratedContentStatus.REVIEW_REQUIRED);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('generates ROUND_SUMMARY, TEAM_SUMMARY, and PLAYER_SUMMARY with verified highlights', async () => {
    const [round, team, player] = await Promise.all([
      generateRoundSummary.execute('laliga-ea-sports'),
      generateTeamSummary.execute('fc-barcelona'),
      generatePlayerSummary.execute('lamine-yamal'),
    ]);

    expect(round.type).toBe(GeneratedContentType.ROUND_SUMMARY);
    expect(round.status).toBe(GeneratedContentStatus.PUBLISHED);
    expect(team.type).toBe(GeneratedContentType.TEAM_SUMMARY);
    expect(team.content).toContain('FC Barcelona');
    expect(player.type).toBe(GeneratedContentType.PLAYER_SUMMARY);
    expect(player.content).toContain('Lamine Yamal');
  });

  it('tracks cache hit/miss metrics, evicts expired keys, and runs FootballJobsScheduler pipeline', async () => {
    await cache.set('test:short', { ok: true }, -1); // Already expired
    await cache.set('test:active', { ok: true }, 60);

    const miss = await cache.get('test:short');
    const hit = await cache.get<{ ok: boolean }>('test:active');

    expect(miss).toBeNull();
    expect(hit?.ok).toBe(true);

    const metrics = await cache.getMetrics();
    expect(metrics.hits).toBeGreaterThanOrEqual(1);
    expect(metrics.misses).toBeGreaterThanOrEqual(1);

    const scheduler = new FootballJobsScheduler(
      cache,
      matchRepo,
      standingsRepo,
      competitionRepo,
      newsRepo,
      generateMatchSummary,
      generateRoundSummary,
    );

    const log = await scheduler.runJobByName('post-match-ai');
    expect(log.lastStatus).toBe('SUCCESS');
    expect(log.runsCount).toBe(1);

    const snapshot = await scheduler.getObservabilitySnapshot();
    expect(snapshot.jobs.length).toBe(5);
    expect(snapshot.cacheMetrics.mode).toBe('memory');
  });
});
