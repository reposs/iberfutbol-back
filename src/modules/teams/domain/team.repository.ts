import { Team } from './team.entity';

export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');

export interface TeamRepository {
  findAll(competitionSlug?: string): Promise<Team[]>;
  findFeatured(): Promise<Team[]>;
  findBySlug(slug: string): Promise<Team | null>;
  search(query: string): Promise<Team[]>;
  saveMany(teams: Team[]): Promise<void>;
}
