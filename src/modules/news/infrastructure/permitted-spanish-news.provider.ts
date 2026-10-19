import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  NewsItem,
  NewsProvider,
  TimelineEventItem,
  TimelineEventType,
} from '../domain/news.entity';
import {
  ExternalNewsFeedDto,
  ExternalNewsMapper,
} from './external-news.mapper';
import {
  FOOTBALL_DATA_PROVIDER,
  FootballDataProvider,
} from '../../../shared/domain/ports/football-data-provider.port';
import { MatchEvent, MatchStatus } from '../../matches/domain/match.entity';

interface DetectedEntityTag {
  slug: string;
  name: string;
  keywords: string[];
}

const KNOWN_TEAMS: DetectedEntityTag[] = [
  { slug: 'fc-barcelona', name: 'FC Barcelona', keywords: ['barcelona', 'barça', 'blaugrana', 'flick'] },
  { slug: 'real-madrid', name: 'Real Madrid CF', keywords: ['real madrid', 'madrid', 'bernabéu', 'bernabeu', 'ancelotti', 'arbeloa'] },
  { slug: 'atletico-de-madrid', name: 'Atlético de Madrid', keywords: ['atlético', 'atletico', 'simeone', 'rojiblanco', 'metropolitano'] },
  { slug: 'athletic-club', name: 'Athletic Club', keywords: ['athletic', 'san mamés', 'san mames', 'valverde', 'leones'] },
  { slug: 'real-sociedad', name: 'Real Sociedad', keywords: ['real sociedad', 'anoeta', 'txuri-urdin', 'imanol'] },
  { slug: 'real-betis', name: 'Real Betis Balompié', keywords: ['real betis', 'betis', 'villamarín', 'pellegrini', 'verdiblanco'] },
  { slug: 'villarreal-cf', name: 'Villarreal CF', keywords: ['villarreal', 'cerámica', 'marcelino', 'submarino amarillo'] },
  { slug: 'sevilla-fc', name: 'Sevilla FC', keywords: ['sevilla', 'sánchez-pizjuán', 'nervión'] },
  { slug: 'valencia-cf', name: 'Valencia CF', keywords: ['valencia', 'mestalla', 'che'] },
  { slug: 'girona-fc', name: 'Girona FC', keywords: ['girona', 'montilivi', 'míchel'] },
  { slug: 'rc-celta', name: 'RC Celta de Vigo', keywords: ['celta', 'balaídos', 'vigo'] },
  { slug: 'ca-osasuna', name: 'CA Osasuna', keywords: ['osasuna', 'sadar', 'rojillo'] },
  { slug: 'rcd-mallorca', name: 'RCD Mallorca', keywords: ['mallorca', 'son moix', 'bermellón'] },
  { slug: 'rayo-vallecano', name: 'Rayo Vallecano', keywords: ['rayo vallecano', 'vallecas'] },
  { slug: 'getafe-cf', name: 'Getafe CF', keywords: ['getafe', 'bordalás', 'coliseum'] },
  { slug: 'rcd-espanyol', name: 'RCD Espanyol', keywords: ['espanyol', 'perico', 'cornellà'] },
  { slug: 'deportivo-alaves', name: 'Deportivo Alavés', keywords: ['alavés', 'alaves', 'mendizorrotza'] },
  { slug: 'real-valladolid', name: 'Real Valladolid CF', keywords: ['valladolid', 'zorrilla', 'pucela'] },
  { slug: 'ud-las-palmas', name: 'UD Las Palmas', keywords: ['las palmas', 'gran canaria'] },
  { slug: 'cd-leganes', name: 'CD Leganés', keywords: ['leganés', 'leganes', 'butarque'] },
  { slug: 'racing-de-santander', name: 'Real Racing Club', keywords: ['racing de santander', 'racing', 'sardinero'] },
  { slug: 'real-zaragoza', name: 'Real Zaragoza', keywords: ['real zaragoza', 'zaragoza', 'romareda'] },
  { slug: 'real-sporting', name: 'Real Sporting de Gijón', keywords: ['sporting', 'molinón', 'gijón'] },
  { slug: 'real-oviedo', name: 'Real Oviedo', keywords: ['real oviedo', 'oviedo', 'tartiere'] },
  { slug: 'rc-deportivo', name: 'RC Deportivo', keywords: ['deportivo', 'riazor', 'dépor'] },
  { slug: 'malaga-cf', name: 'Málaga CF', keywords: ['málaga', 'malaga', 'rosaleda'] },
  { slug: 'ud-almeria', name: 'UD Almería', keywords: ['almería', 'almeria'] },
  { slug: 'granada-cf', name: 'Granada CF', keywords: ['granada', 'cármenes'] },
  { slug: 'cadiz-cf', name: 'Cádiz CF', keywords: ['cádiz', 'cadiz', 'mirandilla'] },
  { slug: 'elche-cf', name: 'Elche CF', keywords: ['elche', 'martínez valero'] },
  { slug: 'levante-ud', name: 'Levante UD', keywords: ['levante', 'ciutat de valència'] },
];

const KNOWN_PLAYERS: DetectedEntityTag[] = [
  { slug: 'lamine-yamal', name: 'Lamine Yamal', keywords: ['lamine yamal', 'yamal'] },
  { slug: 'robert-lewandowski', name: 'Robert Lewandowski', keywords: ['lewandowski'] },
  { slug: 'kylian-mbappe', name: 'Kylian Mbappé', keywords: ['mbappé', 'mbappe'] },
  { slug: 'vinicius-junior', name: 'Vinícius Júnior', keywords: ['vinicius', 'vinícius', 'vini'] },
  { slug: 'jude-bellingham', name: 'Jude Bellingham', keywords: ['bellingham'] },
  { slug: 'julian-alvarez', name: 'Julián Alvarez', keywords: ['julián alvarez', 'julian alvarez', 'julián álvarez'] },
  { slug: 'antoine-griezmann', name: 'Antoine Griezmann', keywords: ['griezmann'] },
  { slug: 'nico-williams', name: 'Nico Williams', keywords: ['nico williams'] },
  { slug: 'inaki-williams', name: 'Iñaki Williams', keywords: ['iñaki williams', 'inaki williams'] },
  { slug: 'oihan-sancet', name: 'Oihan Sancet', keywords: ['sancet'] },
  { slug: 'pedri-gonzalez', name: 'Pedri', keywords: ['pedri'] },
  { slug: 'raphinha', name: 'Raphinha', keywords: ['raphinha'] },
  { slug: 'dani-olmo', name: 'Dani Olmo', keywords: ['dani olmo', 'olmo'] },
  { slug: 'alex-baena', name: 'Álex Baena', keywords: ['baena'] },
  { slug: 'ayoze-perez', name: 'Ayoze Pérez', keywords: ['ayoze'] },
  { slug: 'isco-alarcon', name: 'Isco Alarcón', keywords: ['isco'] },
  { slug: 'giovani-lo-celso', name: 'Giovani Lo Celso', keywords: ['lo celso'] },
  { slug: 'takefusa-kubo', name: 'Takefusa Kubo', keywords: ['kubo'] },
  { slug: 'mikel-oyarzabal', name: 'Mikel Oyarzabal', keywords: ['oyarzabal'] },
  { slug: 'ante-budimir', name: 'Ante Budimir', keywords: ['budimir'] },
  { slug: 'iago-aspas', name: 'Iago Aspas', keywords: ['iago aspas', 'aspas'] },
];

@Injectable()
export class PermittedSpanishNewsProvider implements NewsProvider {
  private readonly logger = new Logger(PermittedSpanishNewsProvider.name);

  public readonly providerName =
    'PermittedSpanishNewsProvider (RSS Oficiales Fútbol Español + ESPN Deportes API + Contexto Estructurado)';

  private cachedNews: NewsItem[] | null = null;
  private cachedNewsTimestamp = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    @Optional()
    @Inject(FOOTBALL_DATA_PROVIDER)
    private readonly footballDataProvider?: FootballDataProvider,
  ) {}

  async fetchLatestPermittedNews(): Promise<NewsItem[]> {
    if (
      this.cachedNews &&
      Date.now() - this.cachedNewsTimestamp < this.CACHE_TTL_MS
    ) {
      return this.cachedNews;
    }

    try {
      const liveFeeds = await this.fetchLiveSpanishFeeds();
      if (liveFeeds.length > 0) {
        const mapped = liveFeeds.map((dto) =>
          ExternalNewsMapper.toDomainNews(dto),
        );
        this.cachedNews = mapped;
        this.cachedNewsTimestamp = Date.now();
        return mapped;
      }
    } catch (error) {
      this.logger.warn(
        `Fallo obteniendo feeds en vivo de noticias (${(error as Error).message}). Usando catálogo de respaldo.`,
      );
    }

    return this.getFallbackRawFeeds().map((dto) =>
      ExternalNewsMapper.toDomainNews(dto),
    );
  }

  async fetchTimelineEvents(): Promise<TimelineEventItem[]> {
    try {
      const events: TimelineEventItem[] = [];

      // 1. Add real match events from today/recent matches if FootballDataProvider is injected
      if (this.footballDataProvider) {
        const matches = await this.footballDataProvider.fetchAllMatches();
        const todayIso = new Date().toISOString().slice(0, 10);
        const relevantMatches = matches.filter(
          (m) =>
            m.status === MatchStatus.LIVE ||
            m.status === MatchStatus.FINISHED ||
            m.dateIso <= todayIso,
        );
        const sortedMatches = [...relevantMatches].sort((a, b) => {
          if (a.status === MatchStatus.LIVE && b.status !== MatchStatus.LIVE)
            return -1;
          if (b.status === MatchStatus.LIVE && a.status !== MatchStatus.LIVE)
            return 1;
          const tsA = new Date(`${a.dateIso}T${a.kickoffTime}:00`).getTime();
          const tsB = new Date(`${b.dateIso}T${b.kickoffTime}:00`).getTime();
          return tsB - tsA;
        });

        for (const match of sortedMatches.slice(0, 6)) {
          const timeLabel = match.kickoffTime || '20:00';
          const timestampIso = new Date(
            `${match.dateIso}T${timeLabel}:00`,
          ).toISOString();

          if (match.status === MatchStatus.LIVE) {
            events.push({
              id: `tl-live-${match.id}`,
              timeLabel,
              timestampIso,
              title: `¡EN JUEGO (${match.liveMinute ?? 45}')! ${match.homeTeam.shortName} ${match.homeTeam.score ?? 0}-${match.awayTeam.score ?? 0} ${match.awayTeam.shortName}`,
              description: `Duelo en directo en ${match.stadium} correspondiente a la Jornada ${match.matchday} de ${match.competitionName}.`,
              type: 'LIVE_ALERT',
              relatedRoute: `/partidos/${match.slug}`,
              badgeText: 'EN DIRECTO',
              competitionName: match.competitionName,
            });
          } else if (match.status === MatchStatus.FINISHED) {
            const goalEvents = match.events.filter(
              (e: MatchEvent) => e.type === 'GOAL',
            );
            const goalsText =
              goalEvents.length > 0
                ? `Goles: ${goalEvents
                    .map((g: MatchEvent) => `${g.playerName} (${g.minute}')`)
                    .join(', ')}.`
                : `Encuentro disputado en ${match.stadium}.`;
            events.push({
              id: `tl-fin-${match.id}`,
              timeLabel,
              timestampIso,
              title: `Finalizado: ${match.homeTeam.name} ${match.homeTeam.score ?? 0}-${match.awayTeam.score ?? 0} ${match.awayTeam.name}`,
              description: `${goalsText} (${match.competitionName}, Jornada ${match.matchday}).`,
              type: 'MATCH_FINAL',
              relatedRoute: `/partidos/${match.slug}`,
              badgeText: 'FINALIZADO',
              competitionName: match.competitionName,
            });
          } else {
            events.push({
              id: `tl-up-${match.id}`,
              timeLabel,
              timestampIso,
              title: `Horario confirmado: ${match.homeTeam.name} vs ${match.awayTeam.name} (${timeLabel}h)`,
              description: `Encuentro programado en ${match.stadium} para la Jornada ${match.matchday} de ${match.competitionName}.`,
              type: 'SQUAD_NEWS',
              relatedRoute: `/partidos/${match.slug}`,
              badgeText: 'PRÓXIMO PARTIDO',
              competitionName: match.competitionName,
            });
          }
        }
      }

      // 2. Enrich timeline with latest real news items
      const news = await this.fetchLatestPermittedNews();
      let liveAlertsCount = events.filter((e) => e.type === 'LIVE_ALERT').length;

      for (const [idx, item] of news.slice(0, 8).entries()) {
        const pubDate = new Date(item.publishedAt);
        const timeLabel = `${String(pubDate.getHours()).padStart(2, '0')}:${String(pubDate.getMinutes()).padStart(2, '0')}`;
        const lowerTitle = item.title.toLowerCase();

        let type: TimelineEventType = 'OFFICIAL_CLUB';
        let badgeText = 'ACTUALIDAD';

        if (
          lowerTitle.includes('directo') ||
          lowerTitle.includes('gol') ||
          lowerTitle.includes('última hora') ||
          (liveAlertsCount < 2 && idx < 2)
        ) {
          type = 'LIVE_ALERT';
          badgeText = 'ÚLTIMA HORA';
          liveAlertsCount++;
        } else if (
          item.category.includes('Clasificación') ||
          lowerTitle.includes('líder') ||
          lowerTitle.includes('clasificación')
        ) {
          type = 'STANDINGS_UPDATE';
          badgeText = 'CLASIFICACIÓN';
        } else if (
          lowerTitle.includes('convocatoria') ||
          lowerTitle.includes('once') ||
          lowerTitle.includes('alineación')
        ) {
          type = 'SQUAD_NEWS';
          badgeText = 'CONVOCATORIA';
        }

        const relatedRoute = item.relatedTeamSlug
          ? `/equipos/${item.relatedTeamSlug}`
          : item.relatedCompetitionSlug
            ? `/competiciones/${item.relatedCompetitionSlug}`
            : '/noticias';

        events.push({
          id: `tl-news-${item.id}`,
          timeLabel,
          timestampIso: item.publishedAt,
          title: item.title,
          description: item.summary,
          type,
          relatedRoute,
          badgeText,
          competitionName: item.category,
        });
      }

      if (events.length > 0) {
        return events
          .sort(
            (a, b) =>
              new Date(b.timestampIso).getTime() -
              new Date(a.timestampIso).getTime(),
          )
          .slice(0, 12);
      }
    } catch (error) {
      this.logger.warn(
        `Error construyendo timeline en vivo: ${(error as Error).message}`,
      );
    }

    return this.getFallbackTimeline();
  }

  private async fetchLiveSpanishFeeds(): Promise<ExternalNewsFeedDto[]> {
    const rssSources = [
      {
        url: 'https://e00-marca.uecdn.es/rss/futbol/primera-division.xml',
        categoryLabel: 'LaLiga EA Sports',
        competitionSlug: 'laliga-ea-sports',
        competitionName: 'LaLiga EA Sports',
        publisherFallback: 'Marca · LaLiga EA Sports',
      },
      {
        url: 'https://e00-marca.uecdn.es/rss/futbol/segunda-division.xml',
        categoryLabel: 'LaLiga Hypermotion',
        competitionSlug: 'laliga-hypermotion',
        competitionName: 'LaLiga Hypermotion',
        publisherFallback: 'Marca · LaLiga Hypermotion',
      },
      {
        url: 'https://e00-marca.uecdn.es/rss/futbol/primera-rfef.xml',
        categoryLabel: 'Primera Federación',
        competitionSlug: 'primera-federacion',
        competitionName: 'Primera Federación Versus e-Learning',
        publisherFallback: 'Marca · Primera Federación',
      },
      {
        url: 'https://e00-marca.uecdn.es/rss/futbol/copa-rey.xml',
        categoryLabel: 'Copa del Rey',
        competitionSlug: 'copa-del-rey',
        competitionName: 'Copa de S.M. El Rey',
        publisherFallback: 'Marca · Copa del Rey',
      },
      {
        url: 'https://e00-marca.uecdn.es/rss/futbol/seleccion.xml',
        categoryLabel: 'Selección Española',
        competitionSlug: 'seleccion-espanola',
        competitionName: 'Selección Española Absoluta',
        publisherFallback: 'Marca · Selección Española',
      },
    ];

    const espnSources = [
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/news?lang=es&region=es',
        categoryLabel: 'LaLiga EA Sports',
        competitionSlug: 'laliga-ea-sports',
        competitionName: 'LaLiga EA Sports',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.2/news?lang=es&region=es',
        categoryLabel: 'LaLiga Hypermotion',
        competitionSlug: 'laliga-hypermotion',
        competitionName: 'LaLiga Hypermotion',
      },
    ];

    const [rssResults, espnResults] = await Promise.all([
      Promise.allSettled(
        rssSources.map(async (src) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          try {
            const res = await fetch(src.url, {
              signal: controller.signal,
              headers: {
                Accept: 'application/rss+xml, application/xml, text/xml',
                'User-Agent': 'IberFutbolBot/1.0',
              },
            });
            if (!res.ok) return [];
            const xml = await res.text();
            return this.parseRssXml(xml, src, 6);
          } finally {
            clearTimeout(timer);
          }
        }),
      ),
      Promise.allSettled(
        espnSources.map(async (src) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          try {
            const res = await fetch(src.url, {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            });
            if (!res.ok) return [];
            const json = (await res.json()) as Record<string, any>;
            return this.parseEspnNewsJson(json, src, 5);
          } finally {
            clearTimeout(timer);
          }
        }),
      ),
    ]);

    const combined: ExternalNewsFeedDto[] = [];
    const seenHeadlines = new Set<string>();

    for (const res of [...espnResults, ...rssResults]) {
      if (res.status === 'fulfilled') {
        for (const item of res.value) {
          const normTitle = item.headline.toLowerCase().slice(0, 45);
          if (!seenHeadlines.has(normTitle)) {
            seenHeadlines.add(normTitle);
            combined.push(item);
          }
        }
      }
    }

    return combined.sort(
      (a, b) =>
        new Date(b.pubDateIso).getTime() - new Date(a.pubDateIso).getTime(),
    );
  }

  private parseRssXml(
    xml: string,
    sourceMeta: {
      categoryLabel: string;
      competitionSlug: string;
      competitionName: string;
      publisherFallback: string;
    },
    limit: number,
  ): ExternalNewsFeedDto[] {
    const items: ExternalNewsFeedDto[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = itemRegex.exec(xml)) !== null && count < limit) {
      const block = match[1];
      const title = this.extractXmlTag(block, 'title');
      const description =
        this.extractXmlTag(block, 'description') ||
        this.extractXmlTag(block, 'media:description') ||
        title;
      const link = this.extractXmlTag(block, 'link') || 'https://www.laliga.com';
      const guid = this.extractXmlTag(block, 'guid') || `rss-${sourceMeta.competitionSlug}-${count}`;
      const pubDateRaw = this.extractXmlTag(block, 'pubDate');
      const mediaMatch = block.match(/<media:(?:content|thumbnail)[^>]+url="([^"]+)"/i);
      const thumbnail = mediaMatch ? mediaMatch[1] : undefined;

      if (!title || title.length < 10) continue;

      const parsedDate = pubDateRaw ? new Date(pubDateRaw) : new Date();
      const pubDateIso = !isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : new Date().toISOString();

      const tags = this.detectTags(
        `${title} ${description}`,
        sourceMeta.competitionSlug,
        sourceMeta.competitionName,
      );

      items.push({
        guid: `rss-${sourceMeta.competitionSlug}-${count}-${Date.now()}`,
        headline: this.decodeXmlEntities(title),
        excerpt: this.decodeXmlEntities(description),
        publisherName: sourceMeta.publisherFallback,
        canonicalUrl: link.trim(),
        pubDateIso,
        licensedThumbnailUrl: thumbnail,
        categoryLabel: sourceMeta.categoryLabel,
        isEditorialDataGenerated: false,
        tags,
      });
      count++;
    }

    return items;
  }

  private parseEspnNewsJson(
    json: Record<string, any>,
    sourceMeta: {
      categoryLabel: string;
      competitionSlug: string;
      competitionName: string;
    },
    limit: number,
  ): ExternalNewsFeedDto[] {
    const articles: any[] = json?.articles || [];
    const results: ExternalNewsFeedDto[] = [];

    for (const art of articles.slice(0, limit)) {
      const headline = String(art.headline || '').trim();
      const description = String(art.description || headline).trim();
      if (!headline) continue;

      const canonicalUrl =
        art.links?.web?.href ||
        art.links?.mobile?.href ||
        'https://espndeportes.espn.com/futbol/liga/_/nombre/esp.1';
      const image = art.images?.[0]?.url;
      const publishedAt = art.published
        ? new Date(art.published).toISOString()
        : new Date().toISOString();

      const tags = this.detectTags(
        `${headline} ${description}`,
        sourceMeta.competitionSlug,
        sourceMeta.competitionName,
      );

      results.push({
        guid: `espn-${art.id || Math.random().toString(36).slice(2, 9)}`,
        headline,
        excerpt: description,
        publisherName: art.byline
          ? `${art.byline} · ESPN Deportes`
          : 'ESPN Deportes España',
        canonicalUrl,
        pubDateIso: publishedAt,
        licensedThumbnailUrl: image,
        categoryLabel: sourceMeta.categoryLabel,
        isEditorialDataGenerated: false,
        tags,
      });
    }

    return results;
  }

  private detectTags(
    text: string,
    defaultCompetitionSlug: string,
    defaultCompetitionName: string,
  ): ExternalNewsFeedDto['tags'] {
    const lower = text.toLowerCase();
    const detectedTeam = KNOWN_TEAMS.find((t) =>
      t.keywords.some((kw) => lower.includes(kw)),
    );
    const detectedPlayer = KNOWN_PLAYERS.find((p) =>
      p.keywords.some((kw) => lower.includes(kw)),
    );

    return {
      teamSlug: detectedTeam?.slug,
      teamName: detectedTeam?.name,
      playerSlug: detectedPlayer?.slug,
      playerName: detectedPlayer?.name,
      competitionSlug: defaultCompetitionSlug,
      competitionName: defaultCompetitionName,
    };
  }

  private extractXmlTag(block: string, tag: string): string {
    const regex = new RegExp(
      `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`,
      'i',
    );
    const match = block.match(regex);
    if (!match) return '';
    return (match[1] ?? match[2] ?? '').trim();
  }

  private decodeXmlEntities(text: string): string {
    return text
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getFallbackRawFeeds(): ExternalNewsFeedDto[] {
    return [
      {
        guid: 'news-1',
        headline:
          'El FC Barcelona consolida su liderato con su pegada ofensiva en LaLiga EA Sports',
        excerpt:
          'Análisis estadístico oficial: el conjunto de Hansi Flick lidera las métricas ofensivas del campeonato con Robert Lewandowski y Lamine Yamal como referentes.',
        publisherName: 'Redacción Datos IberFútbol · Contexto Estructurado',
        canonicalUrl: 'https://www.laliga.com/laliga-ea-sports',
        pubDateIso: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        categoryLabel: 'LaLiga EA Sports',
        isEditorialDataGenerated: true,
        tags: {
          teamSlug: 'fc-barcelona',
          teamName: 'FC Barcelona',
          playerSlug: 'lamine-yamal',
          playerName: 'Lamine Yamal',
          competitionSlug: 'laliga-ea-sports',
          competitionName: 'LaLiga EA Sports',
        },
      },
      {
        guid: 'news-2',
        headline:
          'Real Madrid y Atlético mantienen el pulso en la zona noble de LaLiga EA Sports',
        excerpt:
          'Kylian Mbappé y Julián Alvarez protagonizan los registros goleadores de los conjuntos madrileños en la lucha por el campeonato liguero.',
        publisherName: 'Comunicado Oficial LaLiga',
        canonicalUrl: 'https://www.laliga.com',
        pubDateIso: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
        categoryLabel: 'LaLiga EA Sports',
        isEditorialDataGenerated: true,
        tags: {
          teamSlug: 'real-madrid',
          teamName: 'Real Madrid CF',
          playerSlug: 'kylian-mbappe',
          playerName: 'Kylian Mbappé',
          competitionSlug: 'laliga-ea-sports',
          competitionName: 'LaLiga EA Sports',
        },
      },
    ];
  }

  private getFallbackTimeline(): TimelineEventItem[] {
    return [
      {
        id: 'tl-1',
        timeLabel: '20:15',
        timestampIso: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        title: 'Actualización oficial de clasificación y calendario de LaLiga EA Sports',
        description:
          'Sincronización completada con los marcadores y estadísticas oficiales de la jornada.',
        type: 'STANDINGS_UPDATE',
        relatedRoute: '/clasificacion/laliga-ea-sports',
        badgeText: 'CLASIFICACIÓN',
        competitionName: 'LaLiga EA Sports',
      },
    ];
  }
}
