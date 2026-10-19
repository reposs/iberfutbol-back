import { Competition } from '../../../modules/competitions/domain/competition.entity';
import { Team } from '../../../modules/teams/domain/team.entity';
import { Match } from '../../../modules/matches/domain/match.entity';
import { StandingTable } from '../../../modules/standings/domain/standing.entity';
import { Player } from '../../../modules/players/domain/player.entity';

export const FOOTBALL_DATA_PROVIDER = Symbol('FOOTBALL_DATA_PROVIDER');

/**
 * Puerto de salida (Outbound Port) para obtener datos deportivos normalizados
 * desde cualquier proveedor externo (API-Football, Football-Data.org, proveedor oficial, etc.).
 * El dominio nunca conoce el formato JSON crudo del proveedor externo.
 */
export interface FootballDataProvider {
  readonly providerName: string;
  fetchCompetitions(): Promise<Competition[]>;
  fetchTeamsByCompetition(competitionSlug: string): Promise<Team[]>;
  fetchAllTeams(): Promise<Team[]>;
  fetchMatchesByDate(dateIso: string, competitionSlug?: string): Promise<Match[]>;
  fetchAllMatches(): Promise<Match[]>;
  fetchStandings(competitionSlug: string): Promise<StandingTable | null>;
  fetchPlayers(): Promise<Player[]>;
  enrichMatchWithSummary?(match: Match): Promise<Match>;
}
