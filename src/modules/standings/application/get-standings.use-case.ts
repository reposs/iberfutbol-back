import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { StandingTable } from '../domain/standing.entity';
import {
  STANDINGS_REPOSITORY,
  StandingsRepository,
} from '../domain/standings.repository';
import {
  CACHE_PORT,
  CACHE_TTL,
  CachePort,
} from '../../../shared/domain/ports/cache.port';

@Injectable()
export class GetStandingsUseCase {
  constructor(
    @Inject(STANDINGS_REPOSITORY)
    private readonly repository: StandingsRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(competitionSlug: string): Promise<StandingTable> {
    const cacheKey = `standings:${competitionSlug.toLowerCase()}`;
    const cached = await this.cache.get<StandingTable>(cacheKey);
    if (cached) return cached;

    const table = await this.repository.findByCompetitionSlug(competitionSlug);
    if (!table) {
      throw new NotFoundException(
        `Clasificación para "${competitionSlug}" no encontrada`,
      );
    }

    await this.cache.set(cacheKey, table, CACHE_TTL.STANDINGS);
    return table;
  }
}
