import { GenerateSeoSitemapUseCase } from './seo.use-cases';
import { RealisticSpanishFootballProvider } from '../../../shared/infrastructure/providers/realistic-spanish-football.provider';
import { CompetitionPersistenceRepository } from '../../competitions/infrastructure/competition-persistence.repository';
import { TeamPersistenceRepository } from '../../teams/infrastructure/team-persistence.repository';
import { PlayerPersistenceRepository } from '../../players/infrastructure/player-persistence.repository';
import { MatchPersistenceRepository } from '../../matches/infrastructure/match-persistence.repository';
import { HybridCacheAdapter } from '../../../shared/infrastructure/cache/hybrid-cache.adapter';

describe('Fase 7: SEO Sitemap, Robots.txt & Indexable Catalog', () => {
  let seoUseCase: GenerateSeoSitemapUseCase;
  let cache: HybridCacheAdapter;

  beforeEach(async () => {
    cache = new HybridCacheAdapter();
    const provider = new RealisticSpanishFootballProvider();
    const compRepo = new CompetitionPersistenceRepository(provider);
    const teamRepo = new TeamPersistenceRepository(provider);
    const playerRepo = new PlayerPersistenceRepository(provider);
    const matchRepo = new MatchPersistenceRepository(provider);

    await Promise.all([
      compRepo.onModuleInit(),
      teamRepo.onModuleInit(),
      playerRepo.onModuleInit(),
      matchRepo.onModuleInit(),
    ]);

    seoUseCase = new GenerateSeoSitemapUseCase(
      compRepo,
      teamRepo,
      playerRepo,
      matchRepo,
      cache,
    );
  });

  afterEach(async () => {
    await cache.onModuleDestroy();
  });

  it('builds a complete SEO catalog containing only real entities with content', async () => {
    const catalog = await seoUseCase.getCatalog();

    expect(catalog.totalIndexableUrls).toBeGreaterThan(35);
    expect(catalog.countsByCategory.STATIC).toBe(10);
    expect(catalog.countsByCategory.COMPETITION).toBe(6);
    expect(catalog.countsByCategory.STANDINGS).toBeGreaterThanOrEqual(4);
    expect(catalog.countsByCategory.TEAM).toBeGreaterThanOrEqual(12);
    expect(catalog.countsByCategory.PLAYER).toBeGreaterThanOrEqual(12);
    expect(catalog.countsByCategory.MATCH).toBeGreaterThanOrEqual(8);

    const paths = catalog.entries.map((e) => e.path);
    expect(paths).toContain('/equipos/fc-barcelona');
    expect(paths).toContain('/equipos/real-madrid');
    expect(paths).toContain('/jugadores/lamine-yamal');
    expect(paths).toContain('/partidos/barcelona-sevilla');
    expect(paths).toContain('/clasificacion/laliga-ea-sports');
    expect(paths).toContain('/actualidad');
  });

  it('generates valid XML Sitemap 0.9 and robots.txt', async () => {
    const xml = await seoUseCase.generateSitemapXml();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://iberfutbol.es/partidos/barcelona-sevilla</loc>');

    const robots = seoUseCase.generateRobotsTxt();
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://iberfutbol.es/sitemap.xml');
  });
});
