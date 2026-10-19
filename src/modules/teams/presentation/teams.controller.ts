import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  GetTeamsUseCase,
  GetTeamUseCase,
  TeamFullProfileResponse,
} from '../application/team.use-cases';
import { Team } from '../domain/team.entity';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly getTeamsUseCase: GetTeamsUseCase,
    private readonly getTeamUseCase: GetTeamUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar equipos (opcionalmente filtrados por competición)' })
  @ApiQuery({ name: 'competition', required: false })
  async findAll(@Query('competition') competition?: string): Promise<Team[]> {
    return this.getTeamsUseCase.execute(competition);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Obtener clubes destacados del fútbol español' })
  async getFeatured(): Promise<Team[]> {
    return this.getTeamsUseCase.getFeatured();
  }

  @Get(':slug')
  @ApiOperation({
    summary:
      'Obtener página completa de un equipo por slug SEO (estadísticas, forma, partidos, plantilla, clasificación y noticias)',
  })
  async getBySlug(@Param('slug') slug: string): Promise<TeamFullProfileResponse> {
    return this.getTeamUseCase.execute(slug);
  }
}
