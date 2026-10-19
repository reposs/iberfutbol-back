export enum GeneratedContentStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum GeneratedContentType {
  MATCH_SUMMARY = 'MATCH_SUMMARY',
  MATCH_PREVIEW = 'MATCH_PREVIEW',
  ROUND_SUMMARY = 'ROUND_SUMMARY',
  TEAM_SUMMARY = 'TEAM_SUMMARY',
  PLAYER_SUMMARY = 'PLAYER_SUMMARY',
}

export type ContentEntityType = 'MATCH' | 'TEAM' | 'PLAYER' | 'COMPETITION';

export interface GeneratedContent {
  id: string;
  type: GeneratedContentType;
  title: string;
  summary: string;
  content: string;
  highlights: string[];
  entityId: string;
  entityType: ContentEntityType;
  language: 'es-ES';
  provider: string;
  model: string;
  status: GeneratedContentStatus;
  verifiedDataHash: string;
  validationNotes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentFilterOptions {
  type?: GeneratedContentType;
  entityType?: ContentEntityType;
  entityId?: string;
  status?: GeneratedContentStatus;
}

export const CONTENT_REPOSITORY = Symbol('CONTENT_REPOSITORY');

export interface ContentRepository {
  findAll(filters?: ContentFilterOptions): Promise<GeneratedContent[]>;
  findByEntity(
    entityType: ContentEntityType,
    entityId: string,
    type?: GeneratedContentType,
  ): Promise<GeneratedContent | null>;
  save(content: GeneratedContent): Promise<GeneratedContent>;
}
