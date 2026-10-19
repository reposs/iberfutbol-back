import { Module } from '@nestjs/common';
import { NEWS_PROVIDER, NEWS_REPOSITORY } from './domain/news.entity';
import { PermittedSpanishNewsProvider } from './infrastructure/permitted-spanish-news.provider';
import { NewsPersistenceRepository } from './infrastructure/news-persistence.repository';
import { GetNewsUseCase, GetTimelineUseCase } from './application/news.use-cases';
import { NewsController } from './presentation/news.controller';

@Module({
  controllers: [NewsController],
  providers: [
    {
      provide: NEWS_PROVIDER,
      useClass: PermittedSpanishNewsProvider,
    },
    {
      provide: NEWS_REPOSITORY,
      useClass: NewsPersistenceRepository,
    },
    GetNewsUseCase,
    GetTimelineUseCase,
  ],
  exports: [NEWS_REPOSITORY, GetNewsUseCase, GetTimelineUseCase],
})
export class NewsModule {}
