import { Injectable } from '@nestjs/common';
import {
  ContentEntityType,
  ContentFilterOptions,
  ContentRepository,
  GeneratedContent,
  GeneratedContentType,
} from '../domain/generated-content.entity';

@Injectable()
export class ContentPersistenceRepository implements ContentRepository {
  private readonly store = new Map<string, GeneratedContent>();

  async findAll(filters?: ContentFilterOptions): Promise<GeneratedContent[]> {
    let items = Array.from(this.store.values());

    if (filters?.type) {
      items = items.filter((item) => item.type === filters.type);
    }
    if (filters?.entityType) {
      items = items.filter((item) => item.entityType === filters.entityType);
    }
    if (filters?.entityId) {
      items = items.filter(
        (item) => item.entityId.toLowerCase() === filters.entityId!.toLowerCase(),
      );
    }
    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    return items.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async findByEntity(
    entityType: ContentEntityType,
    entityId: string,
    type?: GeneratedContentType,
  ): Promise<GeneratedContent | null> {
    const normalizedId = entityId.trim().toLowerCase();
    const candidates = Array.from(this.store.values()).filter(
      (item) =>
        item.entityType === entityType &&
        item.entityId.toLowerCase() === normalizedId &&
        (!type || item.type === type),
    );

    if (candidates.length === 0) return null;

    return (
      candidates.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0] ?? null
    );
  }

  async save(content: GeneratedContent): Promise<GeneratedContent> {
    this.store.set(content.id, content);
    return content;
  }
}
