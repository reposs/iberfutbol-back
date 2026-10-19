import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ContentEntityType,
  GeneratedContent,
  GeneratedContentStatus,
  GeneratedContentType,
} from '../domain/generated-content.entity';
import { GetGeneratedContentUseCase } from '../application/content.use-cases';

@Controller('content')
export class ContentController {
  constructor(
    private readonly getGeneratedContentUseCase: GetGeneratedContentUseCase,
  ) {}

  @Get()
  async findAll(
    @Query('type') type?: GeneratedContentType,
    @Query('entityType') entityType?: ContentEntityType,
    @Query('entityId') entityId?: string,
    @Query('status') status?: GeneratedContentStatus,
  ): Promise<GeneratedContent[]> {
    return this.getGeneratedContentUseCase.findAll({
      type,
      entityType,
      entityId,
      status,
    });
  }

  @Get('match/:slug')
  async getMatchContent(
    @Param('slug') slug: string,
    @Query('refresh') refresh?: string,
  ): Promise<GeneratedContent> {
    return this.getGeneratedContentUseCase.getForMatch(
      slug,
      refresh === 'true',
    );
  }

  @Post('match/:slug/generate')
  async forceGenerateMatchContent(
    @Param('slug') slug: string,
  ): Promise<GeneratedContent> {
    return this.getGeneratedContentUseCase.getForMatch(slug, true);
  }

  @Get('round/:competitionSlug')
  async getRoundContent(
    @Param('competitionSlug') competitionSlug: string,
    @Query('refresh') refresh?: string,
  ): Promise<GeneratedContent> {
    return this.getGeneratedContentUseCase.getForRound(
      competitionSlug,
      refresh === 'true',
    );
  }

  @Get('team/:slug')
  async getTeamContent(
    @Param('slug') slug: string,
    @Query('refresh') refresh?: string,
  ): Promise<GeneratedContent> {
    return this.getGeneratedContentUseCase.getForTeam(
      slug,
      refresh === 'true',
    );
  }

  @Get('player/:slug')
  async getPlayerContent(
    @Param('slug') slug: string,
    @Query('refresh') refresh?: string,
  ): Promise<GeneratedContent> {
    return this.getGeneratedContentUseCase.getForPlayer(
      slug,
      refresh === 'true',
    );
  }
}
