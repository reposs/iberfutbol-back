import { Module } from '@nestjs/common';
import { STANDINGS_REPOSITORY } from './domain/standings.repository';
import { StandingsPersistenceRepository } from './infrastructure/standings-persistence.repository';
import { GetStandingsUseCase } from './application/get-standings.use-case';
import { StandingsController } from './presentation/standings.controller';

@Module({
  controllers: [StandingsController],
  providers: [
    {
      provide: STANDINGS_REPOSITORY,
      useClass: StandingsPersistenceRepository,
    },
    GetStandingsUseCase,
  ],
  exports: [STANDINGS_REPOSITORY, GetStandingsUseCase],
})
export class StandingsModule {}
