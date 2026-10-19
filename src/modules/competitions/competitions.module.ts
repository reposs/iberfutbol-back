import { Module } from '@nestjs/common';
import { COMPETITION_REPOSITORY } from './domain/competition.repository';
import { CompetitionPersistenceRepository } from './infrastructure/competition-persistence.repository';
import {
  GetCompetitionBySlugUseCase,
  GetCompetitionsUseCase,
} from './application/competition.use-cases';
import { CompetitionsController } from './presentation/competitions.controller';

@Module({
  controllers: [CompetitionsController],
  providers: [
    {
      provide: COMPETITION_REPOSITORY,
      useClass: CompetitionPersistenceRepository,
    },
    GetCompetitionsUseCase,
    GetCompetitionBySlugUseCase,
  ],
  exports: [COMPETITION_REPOSITORY, GetCompetitionsUseCase, GetCompetitionBySlugUseCase],
})
export class CompetitionsModule {}
