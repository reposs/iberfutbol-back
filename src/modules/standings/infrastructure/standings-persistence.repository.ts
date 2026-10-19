import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { StandingTable } from '../domain/standing.entity';
import { StandingsRepository } from '../domain/standings.repository';
import {
  FOOTBALL_DATA_PROVIDER,
  FootballDataProvider,
} from '../../../shared/domain/ports/football-data-provider.port';

@Injectable()
export class StandingsPersistenceRepository
  implements StandingsRepository, OnModuleInit
{
  private readonly store = new Map<string, StandingTable>();

  constructor(
    @Inject(FOOTBALL_DATA_PROVIDER)
    private readonly provider: FootballDataProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    const slugs = [
      'laliga-ea-sports',
      'laliga-hypermotion',
      'primera-federacion',
      'segunda-federacion',
    ];
    for (const slug of slugs) {
      const table = await this.provider.fetchStandings(slug);
      if (table) {
        this.store.set(slug, table);
      }
    }
  }

  private normalizeSlug(slug: string): string {
    const aliases: Record<string, string> = {
      laliga: 'laliga-ea-sports',
      segunda: 'laliga-hypermotion',
    };
    return aliases[slug.toLowerCase()] || slug.toLowerCase();
  }

  async findByCompetitionSlug(competitionSlug: string): Promise<StandingTable | null> {
    const normalized = this.normalizeSlug(competitionSlug);
    if (this.store.has(normalized)) {
      return this.store.get(normalized)!;
    }

    const fetched = await this.provider.fetchStandings(normalized);
    if (fetched) {
      this.store.set(normalized, fetched);
    }
    return fetched;
  }

  async findAll(): Promise<StandingTable[]> {
    if (this.store.size === 0) {
      await this.onModuleInit();
    }
    return Array.from(this.store.values());
  }

  async save(standingTable: StandingTable): Promise<void> {
    this.store.set(standingTable.competitionSlug, standingTable);
  }
}
