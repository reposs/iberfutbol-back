import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../../../modules/competitions/competitions.module';
import { MatchesModule } from '../../../modules/matches/matches.module';
import { StandingsModule } from '../../../modules/standings/standings.module';
import { NewsModule } from '../../../modules/news/news.module';
import { ContentModule } from '../../../modules/content/content.module';
import { FootballJobsScheduler } from './football-jobs.scheduler';
import { JobsController } from './jobs.controller';

@Module({
  imports: [
    CompetitionsModule,
    MatchesModule,
    StandingsModule,
    NewsModule,
    ContentModule,
  ],
  controllers: [JobsController],
  providers: [FootballJobsScheduler],
  exports: [FootballJobsScheduler],
})
export class JobsModule {}
