import { FormResult } from '../../teams/domain/team.entity';

export const AI_CONTENT_GENERATOR = Symbol('AI_CONTENT_GENERATOR');

export interface MatchSummaryContext {
  matchSlug: string;
  competitionName: string;
  matchday: number;
  roundLabel: string;
  dateIso: string;
  stadium: string;
  city: string;
  referee: string;
  attendance?: number;
  status: string;
  liveMinute?: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  scorers: {
    minute: number;
    playerName: string;
    teamName: string;
    assistBy?: string;
    detail?: string;
  }[];
  cards: {
    minute: number;
    playerName: string;
    teamName: string;
    cardType: string;
  }[];
  statistics?: {
    possession: [number, number];
    shots: [number, number];
    shotsOnTarget: [number, number];
    corners: [number, number];
    expectedGoals: [number, number];
  };
  standingsSnapshot?: {
    homePosition?: number;
    homePoints?: number;
    awayPosition?: number;
    awayPoints?: number;
  };
}

export interface MatchPreviewContext {
  matchSlug: string;
  competitionName: string;
  matchday: number;
  roundLabel: string;
  dateIso: string;
  kickoffTime: string;
  stadium: string;
  city: string;
  referee: string;
  broadcastChannel?: string;
  homeTeam: {
    name: string;
    position?: number;
    points?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    recentForm?: FormResult[];
    topScorer?: string;
  };
  awayTeam: {
    name: string;
    position?: number;
    points?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    recentForm?: FormResult[];
    topScorer?: string;
  };
}

export interface RoundSummaryContext {
  competitionSlug: string;
  competitionName: string;
  season: string;
  matchday: number;
  leaderTeamName: string;
  leaderPoints: number;
  runnerUpTeamName: string;
  runnerUpPoints: number;
  completedMatches: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  }[];
  liveMatches: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    minute?: number;
  }[];
  topScorer?: {
    name: string;
    teamName: string;
    goals: number;
  };
}

export interface TeamSummaryContext {
  teamSlug: string;
  teamName: string;
  competitionName: string;
  stadium: string;
  city: string;
  coach: string;
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
  possessionAvg: number;
  shotsPerGame: number;
  cleanSheets: number;
  topScorerName: string;
  topScorerGoals: number;
}

export interface PlayerSummaryContext {
  playerSlug: string;
  playerName: string;
  shirtNumber: number;
  position: string;
  age: number;
  nationality: string;
  teamName: string;
  competitionName: string;
  appearances: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  goalContributions: number;
  goalsPer90: number;
  contributionsPer90: number;
  yellowCards: number;
  redCards: number;
  rating: number;
}

export interface AiRawDraftOutput {
  title: string;
  summary: string;
  content: string;
  highlights: string[];
  provider: string;
  model: string;
}

export interface AiContentGenerator {
  readonly providerName: string;
  generateMatchSummary(ctx: MatchSummaryContext): Promise<AiRawDraftOutput>;
  generateMatchPreview(ctx: MatchPreviewContext): Promise<AiRawDraftOutput>;
  generateRoundSummary(ctx: RoundSummaryContext): Promise<AiRawDraftOutput>;
  generateTeamSummary(ctx: TeamSummaryContext): Promise<AiRawDraftOutput>;
  generatePlayerSummary(ctx: PlayerSummaryContext): Promise<AiRawDraftOutput>;
}
