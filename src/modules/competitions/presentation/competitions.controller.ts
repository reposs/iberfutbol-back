import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GetCompetitionBySlugUseCase,
  GetCompetitionsUseCase,
} from '../application/competition.use-cases';
import { Competition } from '../domain/competition.entity';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(
    private readonly getCompetitionsUseCase: GetCompetitionsUseCase,
    private readonly getCompetitionBySlugUseCase: GetCompetitionBySlugUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las competiciones del fútbol español soportadas' })
  async findAll(): Promise<Competition[]> {
    return this.getCompetitionsUseCase.execute();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener detalle de una competición por slug SEO' })
  async findBySlug(@Param('slug') slug: string): Promise<Competition> {
    return this.getCompetitionBySlugUseCase.execute(slug);
  }
}
