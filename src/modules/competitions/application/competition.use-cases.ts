import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Competition } from '../domain/competition.entity';
import {
  COMPETITION_REPOSITORY,
  CompetitionRepository,
} from '../domain/competition.repository';
import {
  CACHE_PORT,
  CACHE_TTL,
  CachePort,
} from '../../../shared/domain/ports/cache.port';

@Injectable()
export class GetCompetitionsUseCase {
  constructor(
    @Inject(COMPETITION_REPOSITORY)
    private readonly repository: CompetitionRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(): Promise<Competition[]> {
    const cacheKey = 'competitions:all';
    const cached = await this.cache.get<Competition[]>(cacheKey);
    if (cached) return cached;

    const competitions = await this.repository.findAll();
    await this.cache.set(cacheKey, competitions, CACHE_TTL.STANDINGS);
    return competitions;
  }
}

@Injectable()
export class GetCompetitionBySlugUseCase {
  constructor(
    @Inject(COMPETITION_REPOSITORY)
    private readonly repository: CompetitionRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(slug: string): Promise<Competition> {
    const cacheKey = `competitions:slug:${slug}`;
    const cached = await this.cache.get<Competition>(cacheKey);
    if (cached) return cached;

    const competition = await this.repository.findBySlug(slug);
    if (!competition) {
      throw new NotFoundException(`Competición "${slug}" no encontrada`);
    }

    await this.cache.set(cacheKey, competition, CACHE_TTL.STANDINGS);
    return competition;
  }
}
