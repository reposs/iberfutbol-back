import { Controller, Get, Header } from '@nestjs/common';
import {
  GenerateSeoSitemapUseCase,
  SeoCatalogSummary,
} from '../application/seo.use-cases';

@Controller('seo')
export class SeoController {
  constructor(private readonly seoUseCase: GenerateSeoSitemapUseCase) {}

  @Get('urls')
  async getSeoCatalog(): Promise<SeoCatalogSummary> {
    return this.seoUseCase.getCatalog();
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async getSitemapXml(): Promise<string> {
    return this.seoUseCase.generateSitemapXml();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  getRobotsTxt(): string {
    return this.seoUseCase.generateRobotsTxt();
  }
}
