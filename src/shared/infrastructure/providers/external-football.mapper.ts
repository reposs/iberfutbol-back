import { Slug } from '../../domain/value-objects/slug.vo';
import { Match, MatchStatus } from '../../../modules/matches/domain/match.entity';
import { Team, FormResult } from '../../../modules/teams/domain/team.entity';

/**
 * DTOs que representan la respuesta cruda de un proveedor externo (ej. Football-Data / API-Football)
 */
export interface ExternalMatchDto {
  externalId: string | number;
  competitionCode: string;
  competitionName: string;
  competitionShortName?: string;
  matchday: number;
  utcDate: string; // ISO 8601
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED';
  minute?: number;
  venue: string;
  city?: string;
  refereeName?: string;
  homeTeam: {
    name: string;
    shortName: string;
    tla: string;
    primaryColor?: string;
    secondaryColor?: string;
    goals: number | null;
  };
  awayTeam: {
    name: string;
    shortName: string;
    tla: string;
    primaryColor?: string;
    secondaryColor?: string;
    goals: number | null;
  };
}

export interface ExternalTeamDto {
  externalId: string | number;
  name: string;
  shortName: string;
  tla: string;
  city: string;
  region?: string;
  venue: string;
  capacity?: number;
  founded: number;
  coachName: string;
  clubColors?: [string, string];
  competitionSlug: string;
  competitionName: string;
  position: number;
  points: number;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string; // ej. "W,W,D,L,W"
}

/**
 * Mapper estricto:
 * External API -> DTO externo -> ExternalFootballMapper -> Domain Entity
 */
export class ExternalFootballMapper {
  public static mapStatus(externalStatus: ExternalMatchDto['status']): MatchStatus {
    switch (externalStatus) {
      case 'IN_PLAY':
      case 'PAUSED':
        return MatchStatus.LIVE;
      case 'FINISHED':
        return MatchStatus.FINISHED;
      case 'POSTPONED':
        return MatchStatus.POSTPONED;
      case 'SUSPENDED':
        return MatchStatus.SUSPENDED;
      case 'SCHEDULED':
      case 'TIMED':
      default:
        return MatchStatus.UPCOMING;
    }
  }

  public static toDomainMatch(dto: ExternalMatchDto): Match {
    const homeSlug = Slug.create(dto.homeTeam.shortName || dto.homeTeam.name).toString();
    const awaySlug = Slug.create(dto.awayTeam.shortName || dto.awayTeam.name).toString();
    const competitionSlug = Slug.create(dto.competitionName).toString();
    const matchSlug = Slug.create(`${homeSlug}-${awaySlug}-j${dto.matchday}`).toString();

    const dateObj = new Date(dto.utcDate);
    const dateIso = dateObj.toISOString().slice(0, 10);
    const kickoffTime = dateObj.toISOString().slice(11, 16);

    return {
      id: String(dto.externalId),
      slug: matchSlug,
      competitionSlug,
      competitionName: dto.competitionName,
      competitionShortName: dto.competitionShortName || dto.competitionName,
      matchday: dto.matchday,
      roundLabel: `Jornada ${dto.matchday}`,
      dateIso,
      kickoffTime,
      status: ExternalFootballMapper.mapStatus(dto.status),
      liveMinute: dto.minute,
      stadium: dto.venue,
      city: dto.city || 'España',
      referee: dto.refereeName || 'Por confirmar (CTA RFEF)',
      homeTeam: {
        slug: homeSlug,
        name: dto.homeTeam.name,
        shortName: dto.homeTeam.shortName,
        code: dto.homeTeam.tla,
        primaryColor: dto.homeTeam.primaryColor || '#1e293b',
        secondaryColor: dto.homeTeam.secondaryColor || '#f8fafc',
        score: dto.homeTeam.goals,
      },
      awayTeam: {
        slug: awaySlug,
        name: dto.awayTeam.name,
        shortName: dto.awayTeam.shortName,
        code: dto.awayTeam.tla,
        primaryColor: dto.awayTeam.primaryColor || '#0f172a',
        secondaryColor: dto.awayTeam.secondaryColor || '#e2e8f0',
        score: dto.awayTeam.goals,
      },
      events: [],
      isFeatured: false,
    };
  }

  public static toDomainTeam(dto: ExternalTeamDto): Team {
    const slug = Slug.create(dto.name).toString();
    const parsedForm = dto.form
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is FormResult => item === 'W' || item === 'D' || item === 'L');

    return {
      id: String(dto.externalId),
      slug,
      name: dto.name,
      shortName: dto.shortName,
      code: dto.tla,
      city: dto.city,
      autonomousCommunity: dto.region || 'España',
      stadium: dto.venue,
      stadiumCapacity: dto.capacity || 25000,
      foundedYear: dto.founded,
      coach: dto.coachName,
      primaryColor: dto.clubColors?.[0] || '#dc2626',
      secondaryColor: dto.clubColors?.[1] || '#ffffff',
      competitionSlug: dto.competitionSlug,
      competitionName: dto.competitionName,
      standing: {
        position: dto.position,
        points: dto.points,
        played: dto.playedGames,
        won: dto.won,
        drawn: dto.draw,
        lost: dto.lost,
        goalsFor: dto.goalsFor,
        goalsAgainst: dto.goalsAgainst,
        goalDifference: dto.goalsFor - dto.goalsAgainst,
        recentForm: parsedForm,
      },
      stats: {
        possessionAvg: 52,
        shotsPerGame: 12.4,
        cleanSheets: 4,
        topScorerName: 'En actualización',
        topScorerGoals: 5,
      },
      isFeatured: dto.position <= 6,
    };
  }
}
