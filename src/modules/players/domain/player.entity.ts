import { Match } from '../../matches/domain/match.entity';
import { NewsItem } from '../../news/domain/news.entity';

export type PlayerPosition =
  | 'Portero'
  | 'Defensa'
  | 'Centrocampista'
  | 'Delantero';

export interface PlayerSeasonStats {
  appearances: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: number;
}

export interface PlayerDerivedMetrics {
  goalContributions: number; // goles + asistencias
  goalsPer90: number;
  assistsPer90: number;
  contributionsPer90: number;
  minutesPerGoal: number | null;
  minutesPerAppearance: number;
}

export interface Player {
  id: string;
  slug: string;
  name: string;
  shirtNumber: number;
  position: PlayerPosition;
  positionCode: 'POR' | 'DEF' | 'MED' | 'DEL';
  age: number;
  nationality: string;
  teamSlug: string;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string;
  teamLogoUrl?: string;
  photoUrl?: string;
  competitionSlug: string;
  stats: PlayerSeasonStats;
  isFeatured: boolean;
}

export interface PlayerFullProfile {
  player: Player;
  derivedMetrics: PlayerDerivedMetrics;
  liveMatches: Match[];
  upcomingMatches: Match[];
  recentMatches: Match[];
  relatedNews: NewsItem[];
  teammates: Player[];
}

export interface PlayerFilterOptions {
  teamSlug?: string;
  competitionSlug?: string;
  positionCode?: 'POR' | 'DEF' | 'MED' | 'DEL' | string;
  sortBy?: 'goals' | 'assists' | 'rating' | 'minutes';
  query?: string;
}

export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');

export interface PlayerRepository {
  findAll(filters?: PlayerFilterOptions | string): Promise<Player[]>;
  findBySlug(slug: string): Promise<Player | null>;
  findTopScorers(limit?: number, competitionSlug?: string): Promise<Player[]>;
  search(query: string): Promise<Player[]>;
  saveMany(players: Player[]): Promise<void>;
}
