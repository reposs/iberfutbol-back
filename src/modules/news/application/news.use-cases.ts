import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  NEWS_REPOSITORY,
  NewsFilterOptions,
  NewsItem,
  NewsRepository,
  TimelineEventItem,
  TimelineEventType,
} from '../domain/news.entity';
import {
  CACHE_PORT,
  CACHE_TTL,
  CachePort,
} from '../../../shared/domain/ports/cache.port';

@Injectable()
export class GetNewsUseCase {
  constructor(
    @Inject(NEWS_REPOSITORY)
    private readonly repository: NewsRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(filters?: NewsFilterOptions): Promise<NewsItem[]> {
    const cacheKey = `news:list:${JSON.stringify(filters || {})}`;
    const cached = await this.cache.get<NewsItem[]>(cacheKey);
    if (cached) return cached;

    const items = await this.repository.findAll(filters);
    await this.cache.set(cacheKey, items, CACHE_TTL.NEWS_AND_TIMELINE);
    return items;
  }

  async getBySlug(slug: string): Promise<NewsItem> {
    const item = await this.repository.findBySlug(slug);
    if (!item) {
      throw new NotFoundException(`Noticia "${slug}" no encontrada`);
    }
    return item;
  }
}

@Injectable()
export class GetTimelineUseCase {
  constructor(
    @Inject(NEWS_REPOSITORY)
    private readonly repository: NewsRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(typeFilter?: TimelineEventType): Promise<TimelineEventItem[]> {
    const cacheKey = `news:timeline:${typeFilter || 'ALL'}`;
    const cached = await this.cache.get<TimelineEventItem[]>(cacheKey);
    if (cached) return cached;

    const events = await this.repository.findTimeline(typeFilter);
    await this.cache.set(cacheKey, events, CACHE_TTL.LIVE_MATCHES);
    return events;
  }
}
