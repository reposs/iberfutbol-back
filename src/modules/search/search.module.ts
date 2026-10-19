import { Controller, Get, Inject, Injectable, Module, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  COMPETITION_REPOSITORY,
  CompetitionRepository,
} from '../competitions/domain/competition.repository';
import {
  TEAM_REPOSITORY,
  TeamRepository,
} from '../teams/domain/team.repository';
import {
  MATCH_REPOSITORY,
  MatchRepository,
} from '../matches/domain/match.repository';
import {
  PLAYER_REPOSITORY,
  PlayerRepository,
} from '../players/domain/player.entity';
import {
  NEWS_REPOSITORY,
  NewsRepository,
} from '../news/domain/news.entity';
import { CompetitionsModule } from '../competitions/competitions.module';
import { TeamsModule } from '../teams/teams.module';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { NewsModule } from '../news/news.module';

@Injectable()
export class SearchFootballUseCase {
  constructor(
    @Inject(COMPETITION_REPOSITORY)
    private readonly competitionRepo: CompetitionRepository,
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepo: TeamRepository,
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepo: PlayerRepository,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepo: MatchRepository,
    @Inject(NEWS_REPOSITORY)
    private readonly newsRepo: NewsRepository,
  ) {}

  async execute(query: string) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return {
        query: '',
        teams: [],
        players: [],
        competitions: [],
        matches: [],
        news: [],
      };
    }

    const [allCompetitions, teams, players, matches, news] = await Promise.all([
      this.competitionRepo.findAll(),
      this.teamRepo.search(q),
      this.playerRepo.search(q),
      this.matchRepo.search(q),
      this.newsRepo.search(q),
    ]);

    const competitions = allCompetitions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.slug.includes(q),
    );

    return {
      query: q,
      teams: teams.slice(0, 6),
      players: players.slice(0, 6),
      competitions: competitions.slice(0, 4),
      matches: matches.slice(0, 6),
      news: news.slice(0, 4),
    };
  }
}

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchFootballUseCase: SearchFootballUseCase) {}

  @Get()
  @ApiOperation({
    summary:
      'Buscador global agrupado por Equipos, Jugadores, Competiciones, Partidos y Noticias',
  })
  @ApiQuery({ name: 'q', required: true })
  async search(@Query('q') q: string) {
    return this.searchFootballUseCase.execute(q);
  }
}

@Module({
  imports: [
    CompetitionsModule,
    TeamsModule,
    MatchesModule,
    PlayersModule,
    NewsModule,
  ],
  controllers: [SearchController],
  providers: [SearchFootballUseCase],
})
export class SearchModule {}
