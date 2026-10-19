import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  GetAllMatchesCalendarUseCase,
  GetFeaturedMatchesUseCase,
  GetLiveMatchesUseCase,
  GetMatchDetailsUseCase,
  GetTodayMatchesUseCase,
  MatchDetailsResponse,
} from '../application/match.use-cases';
import { Match } from '../domain/match.entity';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(
    private readonly getTodayMatchesUseCase: GetTodayMatchesUseCase,
    private readonly getLiveMatchesUseCase: GetLiveMatchesUseCase,
    private readonly getFeaturedMatchesUseCase: GetFeaturedMatchesUseCase,
    private readonly getAllMatchesCalendarUseCase: GetAllMatchesCalendarUseCase,
    private readonly getMatchDetailsUseCase: GetMatchDetailsUseCase,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Obtener todos los partidos en directo ahora mismo' })
  async getLive(): Promise<Match[]> {
    return this.getLiveMatchesUseCase.execute();
  }

  @Get('featured')
  @ApiOperation({ summary: 'Obtener partidos destacados de la jornada' })
  async getFeatured(): Promise<Match[]> {
    return this.getFeaturedMatchesUseCase.execute();
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Obtener calendario completo de partidos (ayer, hoy, mañana)' })
  @ApiQuery({ name: 'competition', required: false })
  async getCalendar(
    @Query('competition') competition?: string,
  ): Promise<Match[]> {
    return this.getAllMatchesCalendarUseCase.execute(competition);
  }

  @Get('day/:day')
  @ApiOperation({
    summary: 'Obtener partidos por día (hoy | ayer | manana | YYYY-MM-DD) y competición',
  })
  @ApiQuery({ name: 'competition', required: false })
  async getByDay(
    @Param('day') day: string,
    @Query('competition') competition?: string,
  ): Promise<{ dateIso: string; matches: Match[] }> {
    return this.getTodayMatchesUseCase.execute(day, competition);
  }

  @Get(':slug')
  @ApiOperation({
    summary:
      'Obtener ficha completa de un partido por slug SEO (eventos, alineaciones, estadísticas y clasificación)',
  })
  async getBySlug(@Param('slug') slug: string): Promise<MatchDetailsResponse> {
    return this.getMatchDetailsUseCase.execute(slug);
  }
}
