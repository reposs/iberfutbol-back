import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Match, MatchStatus } from '../domain/match.entity';
import {
  MatchFilterOptions,
  MatchRepository,
} from '../domain/match.repository';
import {
  FOOTBALL_DATA_PROVIDER,
  FootballDataProvider,
} from '../../../shared/domain/ports/football-data-provider.port';

@Injectable()
export class MatchPersistenceRepository implements MatchRepository, OnModuleInit {
  private store: Match[] = [];

  constructor(
    @Inject(FOOTBALL_DATA_PROVIDER)
    private readonly provider: FootballDataProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    this.store = await this.provider.fetchAllMatches();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.store.length === 0) {
      this.store = await this.provider.fetchAllMatches();
    }
  }

  private normalizeCompetitionFilter(slug?: string): string | undefined {
    if (!slug || slug === 'todos' || slug === 'all') return undefined;
    const map: Record<string, string> = {
      laliga: 'laliga-ea-sports',
      segunda: 'laliga-hypermotion',
      copa: 'copa-del-rey',
      seleccion: 'seleccion-espanola',
    };
    return map[slug.toLowerCase()] || slug.toLowerCase();
  }

  async findAll(filters?: MatchFilterOptions): Promise<Match[]> {
    await this.ensureLoaded();
    const compFilter = this.normalizeCompetitionFilter(filters?.competitionSlug);

    return this.store.filter((match) => {
      if (filters?.dateIso && match.dateIso !== filters.dateIso) {
        return false;
      }
      if (compFilter && match.competitionSlug !== compFilter) {
        return false;
      }
      if (filters?.status && match.status !== filters.status) {
        return false;
      }
      if (
        filters?.teamSlug &&
        match.homeTeam.slug !== filters.teamSlug &&
        match.awayTeam.slug !== filters.teamSlug
      ) {
        return false;
      }
      return true;
    });
  }

  async findLive(): Promise<Match[]> {
    await this.ensureLoaded();
    return this.store.filter((m) => m.status === MatchStatus.LIVE);
  }

  async findFeatured(): Promise<Match[]> {
    await this.ensureLoaded();
    const featured = this.store.filter((m) => m.isFeatured);
    const todayIso = new Date().toISOString().slice(0, 10);
    const topSlugs = new Set([
      'fc-barcelona',
      'real-madrid',
      'atletico-de-madrid',
      'athletic-club',
      'real-sociedad',
      'real-betis',
      'villarreal-cf',
      'sevilla-fc',
    ]);

    return [...featured].sort((a, b) => {
      const scoreMatch = (m: Match): number => {
        let pts = 0;
        if (m.status === MatchStatus.LIVE) pts += 100;
        if (m.dateIso === todayIso) pts += 40;
        const diffDays = Math.abs(
          (new Date(m.dateIso).getTime() - new Date(todayIso).getTime()) /
            86400000,
        );
        pts += Math.max(0, 20 - diffDays * 3);
        if (topSlugs.has(m.homeTeam.slug)) pts += 15;
        if (topSlugs.has(m.awayTeam.slug)) pts += 15;
        return pts;
      };
      return scoreMatch(b) - scoreMatch(a);
    });
  }

  async findBySlug(slug: string): Promise<Match | null> {
    await this.ensureLoaded();
    const normalized = slug.toLowerCase();
    const found =
      this.store.find(
        (m) =>
          m.slug === normalized ||
          `${m.homeTeam.slug}-${m.awayTeam.slug}` === normalized,
      ) || null;

    if (
      found &&
      !found.homeLineup &&
      this.provider.enrichMatchWithSummary
    ) {
      await this.provider.enrichMatchWithSummary(found);
    }

    return found;
  }

  async findByTeamSlug(teamSlug: string): Promise<Match[]> {
    await this.ensureLoaded();
    const normalized =
      teamSlug === 'barcelona' ? 'fc-barcelona' : teamSlug.toLowerCase();
    return this.store.filter(
      (m) => m.homeTeam.slug === normalized || m.awayTeam.slug === normalized,
    );
  }

  async search(query: string): Promise<Match[]> {
    await this.ensureLoaded();
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.store.filter(
      (m) =>
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q) ||
        m.homeTeam.shortName.toLowerCase().includes(q) ||
        m.awayTeam.shortName.toLowerCase().includes(q) ||
        m.competitionName.toLowerCase().includes(q) ||
        m.slug.includes(q),
    );
  }

  async saveMany(matches: Match[]): Promise<void> {
    this.store = matches;
  }
}
