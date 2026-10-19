import { Slug } from '../../../shared/domain/value-objects/slug.vo';
import { NewsItem } from '../domain/news.entity';

/**
 * DTO de entrada desde un feed RSS oficial o API de noticias permitida.
 * Nota: Si el feed externo incluye `fullBodyHtml` o fotografías con copyright restringido,
 * el mapper las descarta deliberadamente para cumplir la política de propiedad intelectual (Sección 2 y 17).
 */
export interface ExternalNewsFeedDto {
  guid: string;
  headline: string;
  excerpt: string;
  fullBodyHtml?: string; // Ignorado deliberadamente para no almacenar artículos completos de terceros
  publisherName: string;
  canonicalUrl: string;
  pubDateIso: string;
  licensedThumbnailUrl?: string;
  categoryLabel: string;
  isEditorialDataGenerated?: boolean;
  tags?: {
    teamSlug?: string;
    teamName?: string;
    playerSlug?: string;
    playerName?: string;
    competitionSlug?: string;
    competitionName?: string;
  };
}

export class ExternalNewsMapper {
  private static readonly MAX_SUMMARY_LENGTH = 260;

  private static sanitizeExternalUrl(
    rawUrl: string | undefined,
    fallback?: string,
  ): string | undefined {
    if (!rawUrl) return fallback;
    try {
      const parsed = new URL(rawUrl.trim());
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.toString();
      }
    } catch {
      // invalid URL
    }
    return fallback;
  }

  public static toDomainNews(dto: ExternalNewsFeedDto): NewsItem {
    const cleanExcerpt = dto.excerpt
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const truncatedSummary =
      cleanExcerpt.length > ExternalNewsMapper.MAX_SUMMARY_LENGTH
        ? `${cleanExcerpt.slice(0, ExternalNewsMapper.MAX_SUMMARY_LENGTH - 1)}…`
        : cleanExcerpt;

    return {
      id: dto.guid,
      slug: Slug.create(dto.headline).toString(),
      title: dto.headline.replace(/[<>]/g, '').trim(),
      summary: truncatedSummary,
      source: dto.publisherName.replace(/[<>]/g, '').trim(),
      sourceUrl:
        ExternalNewsMapper.sanitizeExternalUrl(
          dto.canonicalUrl,
          'https://www.laliga.com',
        ) ?? 'https://www.laliga.com',
      publishedAt: dto.pubDateIso,
      image: ExternalNewsMapper.sanitizeExternalUrl(dto.licensedThumbnailUrl),
      category: dto.categoryLabel,
      isAiGenerated: Boolean(dto.isEditorialDataGenerated),
      relatedTeamSlug: dto.tags?.teamSlug,
      relatedTeamName: dto.tags?.teamName,
      relatedPlayerSlug: dto.tags?.playerSlug,
      relatedPlayerName: dto.tags?.playerName,
      relatedCompetitionSlug: dto.tags?.competitionSlug,
      relatedCompetitionName: dto.tags?.competitionName,
    };
  }
}
