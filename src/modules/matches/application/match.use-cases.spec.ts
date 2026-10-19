import {
  GetLiveMatchesUseCase,
  GetMatchDetailsUseCase,
  GetTodayMatchesUseCase,
} from './match.use-cases';
import { RealisticSpanishFootballProvider } from '../../../shared/infrastructure/providers/realistic-spanish-football.provider';
import { MatchPersistenceRepository } from '../infrastructure/match-persistence.repository';
import { StandingsPersistenceRepository } from '../../standings/infrastructure/standings-persistence.repository';
import { HybridCacheAdapter } from '../../../shared/infrastructure/cache/hybrid-cache.adapter';
import { MatchStatus } from '../domain/match.entity';

describe('Matches Application Use Cases (Fase 1 & Fase 2)', () => {
  let provider: RealisticSpanishFootballProvider;
  let matchRepo: MatchPersistenceRepository;
  let standingsRepo: StandingsPersistenceRepository;
  let cache: HybridCacheAdapter;

  beforeEach(async () => {
    provider = new RealisticSpanishFootballProvider();
    matchRepo = new MatchPersistenceRepository(provider);
    standingsRepo = new StandingsPersistenceRepository(provider);
    cache = new HybridCacheAdapter();
    await matchRepo.onModuleInit();
    await standingsRepo.onModuleInit();
  });

  afterEach(async () => {
    await cache.onModuleDestroy();
  });

  it('GetLiveMatchesUseCase should return currently live matches', async () => {
    const useCase = new GetLiveMatchesUseCase(matchRepo, cache);
    const liveMatches = await useCase.execute();

    expect(liveMatches.length).toBeGreaterThanOrEqual(2);
    expect(liveMatches.every((m) => m.status === MatchStatus.LIVE)).toBe(true);
  });

  it('GetTodayMatchesUseCase should filter matches by today and competition', async () => {
    const useCase = new GetTodayMatchesUseCase(matchRepo, cache);
    const allToday = await useCase.execute('hoy', 'todos');
    const laligaToday = await useCase.execute('hoy', 'laliga-ea-sports');

    expect(allToday.matches.length).toBeGreaterThan(laligaToday.matches.length);
    expect(
      laligaToday.matches.every((m) => m.competitionSlug === 'laliga-ea-sports'),
    ).toBe(true);
  });

  it('GetMatchDetailsUseCase should return match details with competition standings context', async () => {
    const useCase = new GetMatchDetailsUseCase(matchRepo, standingsRepo, cache);
    const detail = await useCase.execute('barcelona-sevilla');

    expect(detail.match.slug).toBe('barcelona-sevilla');
    expect(detail.match.events.length).toBeGreaterThan(0);
    expect(detail.standings).not.toBeNull();
    expect(detail.standings?.competitionSlug).toBe('laliga-ea-sports');
  });
});
