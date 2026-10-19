import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { MatchesModule } from '../matches/matches.module';
import { StandingsModule } from '../standings/standings.module';
import { TeamsModule } from '../teams/teams.module';
import { PlayersModule } from '../players/players.module';
import { CONTENT_REPOSITORY } from './domain/generated-content.entity';
import { ContentPersistenceRepository } from './infrastructure/content-persistence.repository';
import {
  GenerateMatchSummaryUseCase,
  GeneratePlayerSummaryUseCase,
  GenerateRoundSummaryUseCase,
  GenerateTeamSummaryUseCase,
  GetGeneratedContentUseCase,
} from './application/content.use-cases';
import { ContentController } from './presentation/content.controller';

@Module({
  imports: [
    AiModule,
    CompetitionsModule,
    MatchesModule,
    StandingsModule,
    TeamsModule,
    PlayersModule,
  ],
  controllers: [ContentController],
  providers: [
    {
      provide: CONTENT_REPOSITORY,
      useClass: ContentPersistenceRepository,
    },
    GenerateMatchSummaryUseCase,
    GenerateRoundSummaryUseCase,
    GenerateTeamSummaryUseCase,
    GeneratePlayerSummaryUseCase,
    GetGeneratedContentUseCase,
  ],
  exports: [
    CONTENT_REPOSITORY,
    GenerateMatchSummaryUseCase,
    GenerateRoundSummaryUseCase,
    GenerateTeamSummaryUseCase,
    GeneratePlayerSummaryUseCase,
    GetGeneratedContentUseCase,
  ],
})
export class ContentModule {}
