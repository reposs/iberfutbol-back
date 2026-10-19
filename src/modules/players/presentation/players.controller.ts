import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  GetPlayersUseCase,
  GetPlayerUseCase,
} from '../application/player.use-cases';
import { Player, PlayerFullProfile } from '../domain/player.entity';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly getPlayersUseCase: GetPlayersUseCase,
    private readonly getPlayerUseCase: GetPlayerUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar jugadores con filtros por equipo, competición, demarcación y criterio de ordenación',
  })
  @ApiQuery({ name: 'team', required: false })
  @ApiQuery({ name: 'competition', required: false })
  @ApiQuery({ name: 'position', required: false })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['goals', 'assists', 'rating', 'minutes'],
  })
  @ApiQuery({ name: 'q', required: false })
  async findAll(
    @Query('team') teamSlug?: string,
    @Query('competition') competitionSlug?: string,
    @Query('position') positionCode?: string,
    @Query('sortBy') sortBy?: 'goals' | 'assists' | 'rating' | 'minutes',
    @Query('q') query?: string,
  ): Promise<Player[]> {
    return this.getPlayersUseCase.execute({
      teamSlug,
      competitionSlug,
      positionCode,
      sortBy,
      query,
    });
  }

  @Get('top-scorers')
  @ApiOperation({ summary: 'Obtener tabla de máximos goleadores del fútbol español' })
  @ApiQuery({ name: 'competition', required: false })
  async getTopScorers(
    @Query('competition') competition?: string,
  ): Promise<Player[]> {
    return this.getPlayersUseCase.getTopScorers(8, competition);
  }

  @Get(':slug')
  @ApiOperation({
    summary:
      'Obtener ficha completa de un jugador por slug SEO (estadísticas, ratios por 90m, próximos partidos y noticias)',
  })
  async getBySlug(@Param('slug') slug: string): Promise<PlayerFullProfile> {
    return this.getPlayerUseCase.execute(slug);
  }
}
