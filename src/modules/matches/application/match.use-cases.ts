import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Match } from '../domain/match.entity';
import {
  MATCH_REPOSITORY,
  MatchRepository,
} from '../domain/match.repository';
import {
  STANDINGS_REPOSITORY,
  StandingsRepository,
} from '../../standings/domain/standings.repository';
import { StandingTable } from '../../standings/domain/standing.entity';
import {
  CACHE_PORT,
  CACHE_TTL,
  CachePort,
} from '../../../shared/domain/ports/cache.port';

export interface MatchDetailsResponse {
  match: Match;
  standings: StandingTable | null;
}

@Injectable()
export class GetTodayMatchesUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly repository: MatchRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  private resolveDateIso(dayParam: 'hoy' | 'ayer' | 'manana' | string): string {
    const now = new Date();
    let offset = 0;
    if (dayParam === 'ayer') offset = -1;
    else if (dayParam === 'manana') offset = 1;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(dayParam)) {
      return dayParam;
    }

    const target = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset),
    );
    return target.toISOString().slice(0, 10);
  }

  async execute(
    dayParam: string = 'hoy',
    competitionSlug?: string,
  ): Promise<{ dateIso: string; matches: Match[] }> {
    const dateIso = this.resolveDateIso(dayParam);
    const compKey = competitionSlug || 'todos';
    const cacheKey = `matches:date:${dateIso}:comp:${compKey}`;

    const cached = await this.cache.get<{ dateIso: string; matches: Match[] }>(
      cacheKey,
    );
    if (cached) return cached;

    let matches = await this.repository.findAll({
      dateIso,
      competitionSlug,
    });

    let effectiveDateIso = dateIso;
    if (matches.length === 0) {
      const allForComp = await this.repository.findAll({ competitionSlug });
      if (dayParam === 'manana') {
        const upcoming = allForComp.filter((m) => m.dateIso >= dateIso);
        if (upcoming.length > 0) {
          effectiveDateIso = upcoming[0].dateIso;
          matches = upcoming.slice(0, 12);
        }
      } else if (dayParam === 'ayer' || dayParam === 'hoy') {
        const recent = [...allForComp]
          .filter((m) => m.dateIso <= dateIso)
          .sort((a, b) => b.dateIso.localeCompare(a.dateIso));
        if (recent.length > 0) {
          effectiveDateIso = recent[0].dateIso;
          matches = recent.filter((m) => m.dateIso === effectiveDateIso);
        }
      }
    }

    const result = { dateIso: effectiveDateIso, matches };
    await this.cache.set(cacheKey, result, CACHE_TTL.LIVE_MATCHES);
    return result;
  }
}

@Injectable()
export class GetLiveMatchesUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly repository: MatchRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(): Promise<Match[]> {
    const cacheKey = 'matches:live';
    const cached = await this.cache.get<Match[]>(cacheKey);
    if (cached) return cached;

    const liveMatches = await this.repository.findLive();
    await this.cache.set(cacheKey, liveMatches, CACHE_TTL.LIVE_MATCHES);
    return liveMatches;
  }
}

@Injectable()
export class GetFeaturedMatchesUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly repository: MatchRepository,
  ) {}

  async execute(): Promise<Match[]> {
    return this.repository.findFeatured();
  }
}

@Injectable()
export class GetAllMatchesCalendarUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly repository: MatchRepository,
  ) {}

  async execute(competitionSlug?: string): Promise<Match[]> {
    return this.repository.findAll({ competitionSlug });
  }
}

@Injectable()
export class GetMatchDetailsUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: MatchRepository,
    @Inject(STANDINGS_REPOSITORY)
    private readonly standingsRepository: StandingsRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(slug: string): Promise<MatchDetailsResponse> {
    const cacheKey = `matches:detail:${slug.toLowerCase()}`;
    const cached = await this.cache.get<MatchDetailsResponse>(cacheKey);
    if (cached) return cached;

    const match = await this.matchRepository.findBySlug(slug);
    if (!match) {
      throw new NotFoundException(`Partido "${slug}" no encontrado`);
    }

    const standings = await this.standingsRepository.findByCompetitionSlug(
      match.competitionSlug,
    );

    const response: MatchDetailsResponse = {
      match,
      standings,
    };

    const ttl =
      match.status === 'LIVE'
        ? CACHE_TTL.LIVE_MATCHES
        : CACHE_TTL.UPCOMING_MATCHES;
    await this.cache.set(cacheKey, response, ttl);
    return response;
  }
}
