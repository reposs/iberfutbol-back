import { Module } from '@nestjs/common';
import { MATCH_REPOSITORY } from './domain/match.repository';
import { MatchPersistenceRepository } from './infrastructure/match-persistence.repository';
import {
  GetAllMatchesCalendarUseCase,
  GetFeaturedMatchesUseCase,
  GetLiveMatchesUseCase,
  GetMatchDetailsUseCase,
  GetTodayMatchesUseCase,
} from './application/match.use-cases';
import { MatchesController } from './presentation/matches.controller';
import { StandingsModule } from '../standings/standings.module';

@Module({
  imports: [StandingsModule],
  controllers: [MatchesController],
  providers: [
    {
      provide: MATCH_REPOSITORY,
      useClass: MatchPersistenceRepository,
    },
    GetTodayMatchesUseCase,
    GetLiveMatchesUseCase,
    GetFeaturedMatchesUseCase,
    GetAllMatchesCalendarUseCase,
    GetMatchDetailsUseCase,
  ],
  exports: [
    MATCH_REPOSITORY,
    GetTodayMatchesUseCase,
    GetLiveMatchesUseCase,
    GetFeaturedMatchesUseCase,
    GetMatchDetailsUseCase,
  ],
})
export class MatchesModule {}
