import { Module } from '@nestjs/common';
import { PLAYER_REPOSITORY } from './domain/player.entity';
import { PlayerPersistenceRepository } from './infrastructure/player-persistence.repository';
import {
  GetPlayersUseCase,
  GetPlayerUseCase,
} from './application/player.use-cases';
import { PlayersController } from './presentation/players.controller';
import { MatchesModule } from '../matches/matches.module';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [MatchesModule, NewsModule],
  controllers: [PlayersController],
  providers: [
    {
      provide: PLAYER_REPOSITORY,
      useClass: PlayerPersistenceRepository,
    },
    GetPlayersUseCase,
    GetPlayerUseCase,
  ],
  exports: [PLAYER_REPOSITORY, GetPlayersUseCase, GetPlayerUseCase],
})
export class PlayersModule {}
