import { Competition } from './competition.entity';

export const COMPETITION_REPOSITORY = Symbol('COMPETITION_REPOSITORY');

export interface CompetitionRepository {
  findAll(): Promise<Competition[]>;
  findBySlug(slug: string): Promise<Competition | null>;
  saveMany(competitions: Competition[]): Promise<void>;
}
