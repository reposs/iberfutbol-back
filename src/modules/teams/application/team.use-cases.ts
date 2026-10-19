import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Team } from '../domain/team.entity';
import { TEAM_REPOSITORY, TeamRepository } from '../domain/team.repository';
import {
  MATCH_REPOSITORY,
  MatchRepository,
} from '../../matches/domain/match.repository';
import { Match, MatchStatus } from '../../matches/domain/match.entity';
import {
  PLAYER_REPOSITORY,
  Player,
  PlayerRepository,
} from '../../players/domain/player.entity';
import {
  STANDINGS_REPOSITORY,
  StandingsRepository,
} from '../../standings/domain/standings.repository';
import { StandingTable } from '../../standings/domain/standing.entity';
import {
  NEWS_REPOSITORY,
  NewsItem,
  NewsRepository,
} from '../../news/domain/news.entity';
import {
  CACHE_PORT,
  CACHE_TTL,
  CachePort,
} from '../../../shared/domain/ports/cache.port';

export interface TeamFullProfileResponse {
  team: Team;
  liveMatches: Match[];
  recentMatches: Match[];
  upcomingMatches: Match[];
  squad: Player[];
  standings: StandingTable | null;
  news: NewsItem[];
}

@Injectable()
export class GetTeamsUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly repository: TeamRepository,
  ) {}

  async execute(competitionSlug?: string): Promise<Team[]> {
    return this.repository.findAll(competitionSlug);
  }

  async getFeatured(): Promise<Team[]> {
    return this.repository.findFeatured();
  }
}

@Injectable()
export class GetTeamUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: TeamRepository,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: MatchRepository,
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    @Inject(STANDINGS_REPOSITORY)
    private readonly standingsRepository: StandingsRepository,
    @Inject(NEWS_REPOSITORY)
    private readonly newsRepository: NewsRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(slug: string): Promise<TeamFullProfileResponse> {
    const cacheKey = `teams:profile:${slug.toLowerCase()}`;
    const cached = await this.cache.get<TeamFullProfileResponse>(cacheKey);
    if (cached) return cached;

    const team = await this.teamRepository.findBySlug(slug);
    if (!team) {
      throw new NotFoundException(`Equipo "${slug}" no encontrado`);
    }

    const [teamMatches, squad, standings, news] = await Promise.all([
      this.matchRepository.findByTeamSlug(team.slug),
      this.playerRepository.findAll(team.slug),
      this.standingsRepository.findByCompetitionSlug(team.competitionSlug),
      this.newsRepository.findAll({ teamSlug: team.slug }),
    ]);

    const liveMatches = teamMatches.filter((m) => m.status === MatchStatus.LIVE);
    const recentMatches = teamMatches.filter(
      (m) => m.status === MatchStatus.FINISHED,
    );
    const upcomingMatches = teamMatches.filter(
      (m) => m.status === MatchStatus.UPCOMING,
    );

    const response: TeamFullProfileResponse = {
      team,
      liveMatches,
      recentMatches,
      upcomingMatches,
      squad,
      standings,
      news,
    };

    await this.cache.set(cacheKey, response, CACHE_TTL.TEAMS_AND_PLAYERS);
    return response;
  }
}
