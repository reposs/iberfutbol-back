import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PLAYER_REPOSITORY,
  Player,
  PlayerDerivedMetrics,
  PlayerFilterOptions,
  PlayerFullProfile,
  PlayerRepository,
} from '../domain/player.entity';
import {
  MATCH_REPOSITORY,
  MatchRepository,
} from '../../matches/domain/match.repository';
import { MatchStatus } from '../../matches/domain/match.entity';
import {
  NEWS_REPOSITORY,
  NewsRepository,
} from '../../news/domain/news.entity';
import {
  CACHE_PORT,
  CACHE_TTL,
  CachePort,
} from '../../../shared/domain/ports/cache.port';

@Injectable()
export class GetPlayersUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly repository: PlayerRepository,
  ) {}

  async execute(filters?: PlayerFilterOptions): Promise<Player[]> {
    return this.repository.findAll(filters);
  }

  async getTopScorers(
    limit: number = 6,
    competitionSlug?: string,
  ): Promise<Player[]> {
    return this.repository.findTopScorers(limit, competitionSlug);
  }
}

@Injectable()
export class GetPlayerUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: MatchRepository,
    @Inject(NEWS_REPOSITORY)
    private readonly newsRepository: NewsRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  public calculateDerivedMetrics(player: Player): PlayerDerivedMetrics {
    const { appearances, minutesPlayed, goals, assists } = player.stats;
    const goalContributions = goals + assists;
    const nineties = minutesPlayed > 0 ? minutesPlayed / 90 : 0;

    return {
      goalContributions,
      goalsPer90: nineties > 0 ? Number((goals / nineties).toFixed(2)) : 0,
      assistsPer90: nineties > 0 ? Number((assists / nineties).toFixed(2)) : 0,
      contributionsPer90:
        nineties > 0 ? Number((goalContributions / nineties).toFixed(2)) : 0,
      minutesPerGoal: goals > 0 ? Math.round(minutesPlayed / goals) : null,
      minutesPerAppearance:
        appearances > 0 ? Math.round(minutesPlayed / appearances) : 0,
    };
  }

  async execute(slug: string): Promise<PlayerFullProfile> {
    const cacheKey = `players:profile:${slug.toLowerCase()}`;
    const cached = await this.cache.get<PlayerFullProfile>(cacheKey);
    if (cached) return cached;

    const player = await this.playerRepository.findBySlug(slug);
    if (!player) {
      throw new NotFoundException(`Jugador "${slug}" no encontrado`);
    }

    const [teamMatches, directPlayerNews, teamNews, teamSquad] =
      await Promise.all([
        this.matchRepository.findByTeamSlug(player.teamSlug),
        this.newsRepository.findAll({ playerSlug: player.slug }),
        this.newsRepository.findAll({ teamSlug: player.teamSlug }),
        this.playerRepository.findAll({ teamSlug: player.teamSlug }),
      ]);

    const mergedNewsMap = new Map<string, (typeof directPlayerNews)[number]>();
    for (const item of [...directPlayerNews, ...teamNews]) {
      mergedNewsMap.set(item.id, item);
    }

    const profile: PlayerFullProfile = {
      player,
      derivedMetrics: this.calculateDerivedMetrics(player),
      liveMatches: teamMatches.filter((m) => m.status === MatchStatus.LIVE),
      upcomingMatches: teamMatches.filter(
        (m) => m.status === MatchStatus.UPCOMING,
      ),
      recentMatches: teamMatches.filter(
        (m) => m.status === MatchStatus.FINISHED,
      ),
      relatedNews: Array.from(mergedNewsMap.values()),
      teammates: teamSquad.filter((p) => p.slug !== player.slug),
    };

    await this.cache.set(cacheKey, profile, CACHE_TTL.TEAMS_AND_PLAYERS);
    return profile;
  }
}
