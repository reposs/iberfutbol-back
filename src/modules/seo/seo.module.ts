import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module';
import { TeamsModule } from '../teams/teams.module';
import { PlayersModule } from '../players/players.module';
import { MatchesModule } from '../matches/matches.module';
import { GenerateSeoSitemapUseCase } from './application/seo.use-cases';
import { SeoController } from './presentation/seo.controller';

@Module({
  imports: [CompetitionsModule, TeamsModule, PlayersModule, MatchesModule],
  controllers: [SeoController],
  providers: [GenerateSeoSitemapUseCase],
  exports: [GenerateSeoSitemapUseCase],
})
export class SeoModule {}
