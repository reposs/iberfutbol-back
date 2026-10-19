import { Module } from '@nestjs/common';
import { TEAM_REPOSITORY } from './domain/team.repository';
import { TeamPersistenceRepository } from './infrastructure/team-persistence.repository';
import { GetTeamsUseCase, GetTeamUseCase } from './application/team.use-cases';
import { TeamsController } from './presentation/teams.controller';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { StandingsModule } from '../standings/standings.module';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [MatchesModule, PlayersModule, StandingsModule, NewsModule],
  controllers: [TeamsController],
  providers: [
    {
      provide: TEAM_REPOSITORY,
      useClass: TeamPersistenceRepository,
    },
    GetTeamsUseCase,
    GetTeamUseCase,
  ],
  exports: [TEAM_REPOSITORY, GetTeamsUseCase, GetTeamUseCase],
})
export class TeamsModule {}
