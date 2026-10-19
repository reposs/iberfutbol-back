import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  NEWS_PROVIDER,
  NewsFilterOptions,
  NewsItem,
  NewsProvider,
  NewsRepository,
  TimelineEventItem,
  TimelineEventType,
} from '../domain/news.entity';

@Injectable()
export class NewsPersistenceRepository implements NewsRepository, OnModuleInit {
  private newsStore: NewsItem[] = [];
  private timelineStore: TimelineEventItem[] = [];

  constructor(
    @Inject(NEWS_PROVIDER)
    private readonly newsProvider: NewsProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    this.newsStore = await this.newsProvider.fetchLatestPermittedNews();
    this.timelineStore = await this.newsProvider.fetchTimelineEvents();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.newsStore.length === 0) {
      await this.onModuleInit();
    }
  }

  async findAll(filters?: NewsFilterOptions): Promise<NewsItem[]> {
    await this.ensureLoaded();
    return this.newsStore.filter((item) => {
      if (filters?.teamSlug && filters.teamSlug !== 'todos') {
        const normalized =
          filters.teamSlug === 'barcelona' ? 'fc-barcelona' : filters.teamSlug;
        if (item.relatedTeamSlug !== normalized) return false;
      }
      if (filters?.playerSlug && item.relatedPlayerSlug !== filters.playerSlug) {
        return false;
      }
      if (
        filters?.competitionSlug &&
        filters.competitionSlug !== 'todas' &&
        filters.competitionSlug !== 'todos'
      ) {
        if (item.relatedCompetitionSlug !== filters.competitionSlug) {
          return false;
        }
      }
      if (filters?.onlyOfficial && item.isAiGenerated) {
        return false;
      }
      if (filters?.onlyAi && !item.isAiGenerated) {
        return false;
      }
      return true;
    });
  }

  async findBySlug(slug: string): Promise<NewsItem | null> {
    await this.ensureLoaded();
    return this.newsStore.find((n) => n.slug === slug.toLowerCase()) || null;
  }

  async findTimeline(typeFilter?: TimelineEventType): Promise<TimelineEventItem[]> {
    await this.ensureLoaded();
    if (!typeFilter) return this.timelineStore;
    return this.timelineStore.filter((ev) => ev.type === typeFilter);
  }

  async search(query: string): Promise<NewsItem[]> {
    await this.ensureLoaded();
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.newsStore.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        (n.relatedTeamName && n.relatedTeamName.toLowerCase().includes(q)) ||
        (n.relatedPlayerName && n.relatedPlayerName.toLowerCase().includes(q)),
    );
  }
}
