import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from './shared/shared.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { StandingsModule } from './modules/standings/standings.module';
import { MatchesModule } from './modules/matches/matches.module';
import { TeamsModule } from './modules/teams/teams.module';
import { PlayersModule } from './modules/players/players.module';
import { NewsModule } from './modules/news/news.module';
import { SearchModule } from './modules/search/search.module';
import { AiModule } from './modules/ai/ai.module';
import { ContentModule } from './modules/content/content.module';
import { SeoModule } from './modules/seo/seo.module';
import { JobsModule } from './shared/infrastructure/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SharedModule,
    CompetitionsModule,
    StandingsModule,
    MatchesModule,
    TeamsModule,
    PlayersModule,
    NewsModule,
    SearchModule,
    AiModule,
    ContentModule,
    SeoModule,
    JobsModule,
  ],
})
export class AppModule {}
