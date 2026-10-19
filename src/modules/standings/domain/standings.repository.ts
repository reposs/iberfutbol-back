import { StandingTable } from './standing.entity';

export const STANDINGS_REPOSITORY = Symbol('STANDINGS_REPOSITORY');

export interface StandingsRepository {
  findByCompetitionSlug(competitionSlug: string): Promise<StandingTable | null>;
  findAll(): Promise<StandingTable[]>;
  save(standingTable: StandingTable): Promise<void>;
}
