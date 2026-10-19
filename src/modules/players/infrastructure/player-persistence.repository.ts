import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  Player,
  PlayerFilterOptions,
  PlayerRepository,
} from '../domain/player.entity';
import {
  FOOTBALL_DATA_PROVIDER,
  FootballDataProvider,
} from '../../../shared/domain/ports/football-data-provider.port';

@Injectable()
export class PlayerPersistenceRepository
  implements PlayerRepository, OnModuleInit
{
  private store: Player[] = [];

  constructor(
    @Inject(FOOTBALL_DATA_PROVIDER)
    private readonly provider: FootballDataProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    this.store = await this.provider.fetchPlayers();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.store.length === 0) {
      this.store = await this.provider.fetchPlayers();
    }
  }

  async findAll(filters?: PlayerFilterOptions | string): Promise<Player[]> {
    await this.ensureLoaded();

    const normalizedFilter: PlayerFilterOptions =
      typeof filters === 'string' ? { teamSlug: filters } : filters || {};

    let result = this.store.filter((p) => {
      if (normalizedFilter.teamSlug && normalizedFilter.teamSlug !== 'todos') {
        const teamSlug =
          normalizedFilter.teamSlug === 'barcelona'
            ? 'fc-barcelona'
            : normalizedFilter.teamSlug.toLowerCase();
        if (p.teamSlug !== teamSlug) return false;
      }

      if (
        normalizedFilter.competitionSlug &&
        normalizedFilter.competitionSlug !== 'todos'
      ) {
        if (p.competitionSlug !== normalizedFilter.competitionSlug) return false;
      }

      if (
        normalizedFilter.positionCode &&
        normalizedFilter.positionCode !== 'TODOS'
      ) {
        if (p.positionCode !== normalizedFilter.positionCode) return false;
      }

      if (normalizedFilter.query) {
        const q = normalizedFilter.query.toLowerCase().trim();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.teamName.toLowerCase().includes(q) &&
          !p.nationality.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });

    const sortBy = normalizedFilter.sortBy || 'goals';
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'assists':
          return b.stats.assists - a.stats.assists || b.stats.goals - a.stats.goals;
        case 'rating':
          return b.stats.rating - a.stats.rating || b.stats.goals - a.stats.goals;
        case 'minutes':
          return b.stats.minutesPlayed - a.stats.minutesPlayed;
        case 'goals':
        default:
          return b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists;
      }
    });

    return result;
  }

  async findBySlug(slug: string): Promise<Player | null> {
    await this.ensureLoaded();
    return this.store.find((p) => p.slug === slug.toLowerCase()) || null;
  }

  async findTopScorers(
    limit: number = 6,
    competitionSlug?: string,
  ): Promise<Player[]> {
    await this.ensureLoaded();
    const filtered =
      competitionSlug && competitionSlug !== 'todos'
        ? this.store.filter((p) => p.competitionSlug === competitionSlug)
        : this.store;

    return [...filtered]
      .sort(
        (a, b) =>
          b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists,
      )
      .slice(0, limit);
  }

  async search(query: string): Promise<Player[]> {
    await this.ensureLoaded();
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.store.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.nationality.toLowerCase().includes(q) ||
        p.slug.includes(q),
    );
  }

  async saveMany(players: Player[]): Promise<void> {
    this.store = players;
  }
}
