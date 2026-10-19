import { Match, MatchStatus } from './match.entity';

export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');

export interface MatchFilterOptions {
  dateIso?: string;
  competitionSlug?: string;
  status?: MatchStatus;
  teamSlug?: string;
}

export interface MatchRepository {
  findAll(filters?: MatchFilterOptions): Promise<Match[]>;
  findLive(): Promise<Match[]>;
  findFeatured(): Promise<Match[]>;
  findBySlug(slug: string): Promise<Match | null>;
  findByTeamSlug(teamSlug: string): Promise<Match[]>;
  search(query: string): Promise<Match[]>;
  saveMany(matches: Match[]): Promise<void>;
}
