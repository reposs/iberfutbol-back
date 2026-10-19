import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Team } from '../domain/team.entity';
import { TeamRepository } from '../domain/team.repository';
import {
  FOOTBALL_DATA_PROVIDER,
  FootballDataProvider,
} from '../../../shared/domain/ports/football-data-provider.port';

@Injectable()
export class TeamPersistenceRepository implements TeamRepository, OnModuleInit {
  private store: Team[] = [];

  constructor(
    @Inject(FOOTBALL_DATA_PROVIDER)
    private readonly provider: FootballDataProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    this.store = await this.provider.fetchAllTeams();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.store.length === 0) {
      this.store = await this.provider.fetchAllTeams();
    }
  }

  async findAll(competitionSlug?: string): Promise<Team[]> {
    await this.ensureLoaded();
    if (!competitionSlug || competitionSlug === 'todos') {
      return this.store;
    }
    const aliasMap: Record<string, string> = {
      laliga: 'laliga-ea-sports',
      segunda: 'laliga-hypermotion',
      copa: 'copa-del-rey',
      seleccion: 'seleccion-espanola',
    };
    const normalized =
      aliasMap[competitionSlug.toLowerCase()] || competitionSlug.toLowerCase();
    return this.store.filter((t) => t.competitionSlug === normalized);
  }

  async findFeatured(): Promise<Team[]> {
    await this.ensureLoaded();
    return this.store.filter((t) => t.isFeatured);
  }

  async findBySlug(slug: string): Promise<Team | null> {
    await this.ensureLoaded();
    const aliases: Record<string, string> = {
      barcelona: 'fc-barcelona',
      'atletico-madrid': 'atletico-de-madrid',
      athletic: 'athletic-club',
      sevilla: 'sevilla-fc',
      betis: 'real-betis',
      villarreal: 'villarreal-cf',
      valencia: 'valencia-cf',
      girona: 'girona-fc',
      racing: 'racing-de-santander',
      zaragoza: 'real-zaragoza',
      deportivo: 'deportivo-de-la-coruna',
      espana: 'seleccion-espanola',
    };
    const normalized = aliases[slug.toLowerCase()] || slug.toLowerCase();
    return this.store.find((t) => t.slug === normalized) || null;
  }

  async search(query: string): Promise<Team[]> {
    await this.ensureLoaded();
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.store.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.stadium.toLowerCase().includes(q) ||
        t.slug.includes(q),
    );
  }

  async saveMany(teams: Team[]): Promise<void> {
    this.store = teams;
  }
}
