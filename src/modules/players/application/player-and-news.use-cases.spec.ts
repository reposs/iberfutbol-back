import { GetPlayerUseCase, GetPlayersUseCase } from './player.use-cases';
import { RealisticSpanishFootballProvider } from '../../../shared/infrastructure/providers/realistic-spanish-football.provider';
import { PlayerPersistenceRepository } from '../infrastructure/player-persistence.repository';
import { MatchPersistenceRepository } from '../../matches/infrastructure/match-persistence.repository';
import { PermittedSpanishNewsProvider } from '../../news/infrastructure/permitted-spanish-news.provider';
import { NewsPersistenceRepository } from '../../news/infrastructure/news-persistence.repository';
import { ExternalNewsMapper } from '../../news/infrastructure/external-news.mapper';
import { GetTimelineUseCase } from '../../news/application/news.use-cases';
import { HybridCacheAdapter } from '../../../shared/infrastructure/cache/hybrid-cache.adapter';

describe('Fase 3 (Player Data) & Fase 4 (News & Timeline) Use Cases', () => {
  let footballProvider: RealisticSpanishFootballProvider;
  let playerRepo: PlayerPersistenceRepository;
  let matchRepo: MatchPersistenceRepository;
  let newsProvider: PermittedSpanishNewsProvider;
  let newsRepo: NewsPersistenceRepository;
  let cache: HybridCacheAdapter;

  beforeEach(async () => {
    footballProvider = new RealisticSpanishFootballProvider();
    playerRepo = new PlayerPersistenceRepository(footballProvider);
    matchRepo = new MatchPersistenceRepository(footballProvider);
    newsProvider = new PermittedSpanishNewsProvider();
    newsRepo = new NewsPersistenceRepository(newsProvider);
    cache = new HybridCacheAdapter();

    await Promise.all([
      playerRepo.onModuleInit(),
      matchRepo.onModuleInit(),
      newsRepo.onModuleInit(),
    ]);
  });

  afterEach(async () => {
    await cache.onModuleDestroy();
  });

  it('GetPlayerUseCase should return full player profile with derived metrics, matches, news, and teammates', async () => {
    const useCase = new GetPlayerUseCase(
      playerRepo,
      matchRepo,
      newsRepo,
      cache,
    );
    const profile = await useCase.execute('lamine-yamal');

    expect(profile.player.name).toBe('Lamine Yamal');
    expect(profile.derivedMetrics.goalContributions).toBe(12); // 5 goals + 7 assists
    expect(profile.derivedMetrics.goalsPer90).toBeGreaterThan(0);
    expect(profile.liveMatches.length).toBeGreaterThanOrEqual(1);
    expect(profile.relatedNews.length).toBeGreaterThanOrEqual(1);
    expect(profile.teammates.some((t) => t.slug === 'robert-lewandowski')).toBe(
      true,
    );
  });

  it('GetPlayersUseCase should filter by competition, positionCode and sortBy', async () => {
    const useCase = new GetPlayersUseCase(playerRepo);
    const segundaForwards = await useCase.execute({
      competitionSlug: 'laliga-hypermotion',
      positionCode: 'DEL',
      sortBy: 'goals',
    });

    expect(segundaForwards.length).toBeGreaterThanOrEqual(2);
    expect(segundaForwards[0].slug).toBe('andres-martin');
  });

  it('ExternalNewsMapper should strip HTML tags and never include fullBodyHtml', () => {
    const mapped = ExternalNewsMapper.toDomainNews({
      guid: 'test-1',
      headline: 'Comunicado Oficial RFEF',
      excerpt: '<p>Resumen permitido con <strong>etiquetas HTML</strong>.</p>',
      fullBodyHtml: '<div>Texto completo protegido por derechos de autor</div>',
      publisherName: 'RFEF',
      canonicalUrl: 'https://rfef.es',
      pubDateIso: '2026-10-18T18:00:00Z',
      categoryLabel: 'Selección',
    });

    expect(mapped.summary).toBe('Resumen permitido con etiquetas HTML.');
    expect('fullBodyHtml' in mapped).toBe(false);
  });

  it('GetTimelineUseCase should filter timeline events by type', async () => {
    const useCase = new GetTimelineUseCase(newsRepo, cache);
    const liveAlerts = await useCase.execute('LIVE_ALERT');

    expect(liveAlerts.length).toBeGreaterThanOrEqual(2);
    expect(liveAlerts.every((ev) => ev.type === 'LIVE_ALERT')).toBe(true);
  });
});
