export enum CompetitionType {
  LEAGUE = 'LEAGUE',
  CUP = 'CUP',
  NATIONAL_TEAM = 'NATIONAL_TEAM',
}

export interface Competition {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  code: string;
  country: string;
  type: CompetitionType;
  tier: number;
  currentSeason: string;
  currentMatchday: number;
  totalMatchdays: number;
  logoText: string;
  accentColor: string;
  description: string;
  isFeatured: boolean;
}
