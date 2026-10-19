import { FormResult } from '../../teams/domain/team.entity';

export type QualificationZone =
  | 'CHAMPIONS_LEAGUE'
  | 'EUROPA_LEAGUE'
  | 'CONFERENCE_LEAGUE'
  | 'DIRECT_PROMOTION'
  | 'PROMOTION_PLAYOFF'
  | 'RELEGATION'
  | 'NONE';

export interface StandingRow {
  position: number;
  teamSlug: string;
  teamName: string;
  teamShortName: string;
  teamCode: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  recentForm: FormResult[];
  zone: QualificationZone;
  zoneLabel?: string;
}

export interface StandingZoneLegend {
  zone: QualificationZone;
  label: string;
  colorHex: string;
}

export interface StandingTable {
  competitionSlug: string;
  competitionName: string;
  season: string;
  matchday: number;
  updatedAt: string;
  rows: StandingRow[];
  legend: StandingZoneLegend[];
}
