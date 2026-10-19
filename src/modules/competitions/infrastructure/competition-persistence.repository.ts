import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Competition } from '../domain/competition.entity';
import { CompetitionRepository } from '../domain/competition.repository';
import {
  FOOTBALL_DATA_PROVIDER,
  FootballDataProvider,
} from '../../../shared/domain/ports/football-data-provider.port';

@Injectable()
export class CompetitionPersistenceRepository
  implements CompetitionRepository, OnModuleInit
{
  private store: Competition[] = [];

  constructor(
    @Inject(FOOTBALL_DATA_PROVIDER)
    private readonly provider: FootballDataProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    this.store = await this.provider.fetchCompetitions();
  }

  async findAll(): Promise<Competition[]> {
    if (this.store.length === 0) {
      this.store = await this.provider.fetchCompetitions();
    }
    return this.store;
  }

  async findBySlug(slug: string): Promise<Competition | null> {
    const all = await this.findAll();
    const aliasMap: Record<string, string> = {
      laliga: 'laliga-ea-sports',
      segunda: 'laliga-hypermotion',
      copa: 'copa-del-rey',
      seleccion: 'seleccion-espanola',
    };
    const normalized = aliasMap[slug.toLowerCase()] || slug.toLowerCase();
    return all.find((c) => c.slug === normalized) || null;
  }

  async saveMany(competitions: Competition[]): Promise<void> {
    this.store = competitions;
  }
}
