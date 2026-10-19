export type FormResult = 'W' | 'D' | 'L';

export interface TeamStandingSnapshot {
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  recentForm: FormResult[];
}

export interface TeamSeasonStats {
  possessionAvg: number;
  shotsPerGame: number;
  cleanSheets: number;
  topScorerName: string;
  topScorerGoals: number;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  code: string;
  city: string;
  autonomousCommunity: string;
  stadium: string;
  stadiumCapacity: number;
  foundedYear: number;
  coach: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  competitionSlug: string;
  competitionName: string;
  standing: TeamStandingSnapshot;
  stats: TeamSeasonStats;
  isFeatured: boolean;
}
