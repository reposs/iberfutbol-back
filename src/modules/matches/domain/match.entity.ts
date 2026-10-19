export enum MatchStatus {
  UPCOMING = 'UPCOMING',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED',
  POSTPONED = 'POSTPONED',
  SUSPENDED = 'SUSPENDED',
}

export type MatchEventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';

export interface MatchEvent {
  id: string;
  minute: number;
  extraMinute?: number;
  teamSide: 'HOME' | 'AWAY';
  type: MatchEventType;
  playerName: string;
  playerSlug?: string;
  assistOrReplacedBy?: string;
  detail?: string;
}

export interface LineupPlayer {
  number: number;
  name: string;
  slug: string;
  position: 'POR' | 'DEF' | 'MED' | 'DEL';
  rating?: number;
}

export interface MatchTeamLineup {
  formation: string;
  coach: string;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface MatchStatistics {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  expectedGoals: [number, number];
}

export interface MatchTeamSummary {
  slug: string;
  name: string;
  shortName: string;
  code: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  score: number | null;
}

export interface Match {
  id: string;
  slug: string;
  competitionSlug: string;
  competitionName: string;
  competitionShortName: string;
  matchday: number;
  roundLabel: string;
  dateIso: string; // YYYY-MM-DD
  kickoffTime: string; // HH:mm
  status: MatchStatus;
  liveMinute?: number;
  stadium: string;
  city: string;
  referee: string;
  attendance?: number;
  broadcastChannel?: string;
  homeTeam: MatchTeamSummary;
  awayTeam: MatchTeamSummary;
  events: MatchEvent[];
  homeLineup?: MatchTeamLineup;
  awayLineup?: MatchTeamLineup;
  statistics?: MatchStatistics;
  aiSummaryTitle?: string;
  aiSummaryText?: string;
  isFeatured: boolean;
}
