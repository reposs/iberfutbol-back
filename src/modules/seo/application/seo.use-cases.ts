import { Inject, Injectable } from '@nestjs/common';
import {
  CACHE_PORT,
  CACHE_TTL,
  CachePort,
} from '../../../shared/domain/ports/cache.port';
import {
  COMPETITION_REPOSITORY,
  CompetitionRepository,
} from '../../competitions/domain/competition.repository';
import {
  TEAM_REPOSITORY,
  TeamRepository,
} from '../../teams/domain/team.repository';
import {
  PLAYER_REPOSITORY,
  PlayerRepository,
} from '../../players/domain/player.entity';
import {
  MATCH_REPOSITORY,
  MatchRepository,
} from '../../matches/domain/match.repository';

export interface SeoSitemapEntry {
  loc: string;
  path: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly';
  priority: string;
  category: 'STATIC' | 'COMPETITION' | 'STANDINGS' | 'TEAM' | 'PLAYER' | 'MATCH';
}

export interface SeoCatalogSummary {
  baseUrl: string;
  generatedAt: string;
  totalIndexableUrls: number;
  countsByCategory: Record<SeoSitemapEntry['category'], number>;
  entries: SeoSitemapEntry[];
}

@Injectable()
export class GenerateSeoSitemapUseCase {
  private readonly baseUrl =
    process.env.PUBLIC_SITE_URL || 'https://iberfutbol.es';

  constructor(
    @Inject(COMPETITION_REPOSITORY)
    private readonly competitionRepository: CompetitionRepository,
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: TeamRepository,
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: MatchRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async getCatalog(): Promise<SeoCatalogSummary> {
    const cacheKey = 'seo:catalog:v1';
    const cached = await this.cache.get<SeoCatalogSummary>(cacheKey);
    if (cached) return cached;

    const todayIso = new Date().toISOString().split('T')[0];

    const [competitions, teams, players, matches] = await Promise.all([
      this.competitionRepository.findAll(),
      this.teamRepository.findAll(),
      this.playerRepository.findAll(),
      this.matchRepository.findAll(),
    ]);

    const entries: SeoSitemapEntry[] = [];

    const addEntry = (
      path: string,
      changefreq: SeoSitemapEntry['changefreq'],
      priority: string,
      category: SeoSitemapEntry['category'],
      lastmod = todayIso,
    ) => {
      entries.push({
        loc: `${this.baseUrl}${path}`,
        path,
        lastmod,
        changefreq,
        priority,
        category,
      });
    };

    // 1. Core Static Indexable Routes
    addEntry('/', 'hourly', '1.0', 'STATIC');
    addEntry('/partidos/hoy', 'always', '0.95', 'STATIC');
    addEntry('/partidos/ayer', 'daily', '0.85', 'STATIC');
    addEntry('/partidos/manana', 'hourly', '0.85', 'STATIC');
    addEntry('/calendario', 'daily', '0.85', 'STATIC');
    addEntry('/competiciones', 'daily', '0.90', 'STATIC');
    addEntry('/equipos', 'daily', '0.90', 'STATIC');
    addEntry('/jugadores', 'daily', '0.85', 'STATIC');
    addEntry('/noticias', 'hourly', '0.90', 'STATIC');
    addEntry('/actualidad', 'always', '0.90', 'STATIC');

    // 2. Competitions & Standings
    for (const comp of competitions) {
      addEntry(`/competiciones/${comp.slug}`, 'daily', '0.90', 'COMPETITION');
      if (comp.type === 'LEAGUE') {
        addEntry(`/clasificacion/${comp.slug}`, 'hourly', '0.90', 'STANDINGS');
      }
    }

    // 3. Teams (Only real clubs with full data)
    for (const team of teams) {
      addEntry(`/equipos/${team.slug}`, 'daily', '0.85', 'TEAM');
    }

    // 4. Players (Only real players with verified stats)
    for (const player of players) {
      addEntry(`/jugadores/${player.slug}`, 'daily', '0.80', 'PLAYER');
    }

    // 5. Matches (Full match sheets with events/lineups/AI summaries)
    for (const match of matches) {
      addEntry(
        `/partidos/${match.slug}`,
        match.status === 'LIVE' ? 'always' : 'daily',
        '0.85',
        'MATCH',
        match.dateIso || todayIso,
      );
    }

    const countsByCategory: Record<SeoSitemapEntry['category'], number> = {
      STATIC: 0,
      COMPETITION: 0,
      STANDINGS: 0,
      TEAM: 0,
      PLAYER: 0,
      MATCH: 0,
    };

    for (const entry of entries) {
      countsByCategory[entry.category] += 1;
    }

    const summary: SeoCatalogSummary = {
      baseUrl: this.baseUrl,
      generatedAt: new Date().toISOString(),
      totalIndexableUrls: entries.length,
      countsByCategory,
      entries,
    };

    await this.cache.set(cacheKey, summary, CACHE_TTL.STANDINGS);
    return summary;
  }

  async generateSitemapXml(): Promise<string> {
    const catalog = await this.getCatalog();
    const urlNodes = catalog.entries
      .map(
        (u) => `  <url>
    <loc>${this.escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;
  }

  generateRobotsTxt(): string {
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /buscar?*',
      'Disallow: /*?refresh=true',
      '',
      `Sitemap: ${this.baseUrl}/sitemap.xml`,
    ].join('\n');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
