export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  image?: string;
  category: string;
  isAiGenerated: boolean;
  relatedTeamSlug?: string;
  relatedTeamName?: string;
  relatedPlayerSlug?: string;
  relatedPlayerName?: string;
  relatedCompetitionSlug?: string;
  relatedCompetitionName?: string;
}

export type TimelineEventType =
  | 'MATCH_FINAL'
  | 'OFFICIAL_CLUB'
  | 'STANDINGS_UPDATE'
  | 'LIVE_ALERT'
  | 'SQUAD_NEWS';

export interface TimelineEventItem {
  id: string;
  timeLabel: string;
  timestampIso: string;
  title: string;
  description: string;
  type: TimelineEventType;
  relatedRoute?: string;
  badgeText: string;
  competitionName?: string;
}

export interface NewsFilterOptions {
  teamSlug?: string;
  playerSlug?: string;
  competitionSlug?: string;
  onlyOfficial?: boolean;
  onlyAi?: boolean;
}

export const NEWS_PROVIDER = Symbol('NEWS_PROVIDER');

/**
 * Puerto de salida (Outbound Port) para proveedores externos de noticias cuyo uso esté permitido
 * (RSS oficiales de clubes/RFEF/LaLiga, APIs con licencia o boletines de datos).
 */
export interface NewsProvider {
  readonly providerName: string;
  fetchLatestPermittedNews(): Promise<NewsItem[]>;
  fetchTimelineEvents(): Promise<TimelineEventItem[]>;
}

export const NEWS_REPOSITORY = Symbol('NEWS_REPOSITORY');

export interface NewsRepository {
  findAll(filters?: NewsFilterOptions): Promise<NewsItem[]>;
  findBySlug(slug: string): Promise<NewsItem | null>;
  findTimeline(typeFilter?: TimelineEventType): Promise<TimelineEventItem[]>;
  search(query: string): Promise<NewsItem[]>;
}
