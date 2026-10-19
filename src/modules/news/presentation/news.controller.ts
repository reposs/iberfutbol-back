import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  GetNewsUseCase,
  GetTimelineUseCase,
} from '../application/news.use-cases';
import {
  NewsItem,
  TimelineEventItem,
  TimelineEventType,
} from '../domain/news.entity';

@ApiTags('News & Actuality')
@Controller('news')
export class NewsController {
  constructor(
    private readonly getNewsUseCase: GetNewsUseCase,
    private readonly getTimelineUseCase: GetTimelineUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar noticias de fuentes permitidas y contenido editorial estructurado con filtros',
  })
  @ApiQuery({ name: 'team', required: false })
  @ApiQuery({ name: 'player', required: false })
  @ApiQuery({ name: 'competition', required: false })
  @ApiQuery({ name: 'sourceType', required: false, enum: ['all', 'official', 'ai'] })
  async findAll(
    @Query('team') teamSlug?: string,
    @Query('player') playerSlug?: string,
    @Query('competition') competitionSlug?: string,
    @Query('sourceType') sourceType?: 'all' | 'official' | 'ai',
  ): Promise<NewsItem[]> {
    return this.getNewsUseCase.execute({
      teamSlug,
      playerSlug,
      competitionSlug,
      onlyOfficial: sourceType === 'official',
      onlyAi: sourceType === 'ai',
    });
  }

  @Get('timeline')
  @ApiOperation({
    summary: 'Obtener timeline en tiempo real de "Qué está pasando"',
  })
  @ApiQuery({ name: 'type', required: false })
  async getTimeline(
    @Query('type') type?: TimelineEventType,
  ): Promise<TimelineEventItem[]> {
    return this.getTimelineUseCase.execute(type);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener detalle de noticia permitida por slug' })
  async getBySlug(@Param('slug') slug: string): Promise<NewsItem> {
    return this.getNewsUseCase.getBySlug(slug);
  }
}
