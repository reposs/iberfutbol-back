import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Match, MatchStatus } from '../../matches/domain/match.entity';
import { StandingTable } from '../../standings/domain/standing.entity';
import { Team } from '../../teams/domain/team.entity';
import { Player, PlayerDerivedMetrics } from '../../players/domain/player.entity';
import {
  MatchPreviewContext,
  MatchSummaryContext,
  PlayerSummaryContext,
  RoundSummaryContext,
  TeamSummaryContext,
} from '../domain/ai-content-generator.port';

export function computeContextHash(payload: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);
}

@Injectable()
export class MatchContextBuilder {
  buildMatchSummaryContext(
    match: Match,
    standings?: StandingTable | null,
  ): { context: MatchSummaryContext; hash: string } {
    const homeRow = standings?.rows.find(
      (r) => r.teamSlug === match.homeTeam.slug,
    );
    const awayRow = standings?.rows.find(
      (r) => r.teamSlug === match.awayTeam.slug,
    );

    const scorers = match.events
      .filter((e) => e.type === 'GOAL')
      .map((e) => ({
        minute: e.minute,
        playerName: e.playerName,
        teamName:
          e.teamSide === 'HOME' ? match.homeTeam.name : match.awayTeam.name,
        assistBy: e.assistOrReplacedBy,
        detail: e.detail,
      }));

    const cards = match.events
      .filter((e) => e.type === 'YELLOW_CARD' || e.type === 'RED_CARD')
      .map((e) => ({
        minute: e.minute,
        playerName: e.playerName,
        teamName:
          e.teamSide === 'HOME' ? match.homeTeam.name : match.awayTeam.name,
        cardType: e.type,
      }));

    const context: MatchSummaryContext = {
      matchSlug: match.slug,
      competitionName: match.competitionName,
      matchday: match.matchday,
      roundLabel: match.roundLabel,
      dateIso: match.dateIso,
      stadium: match.stadium,
      city: match.city,
      referee: match.referee,
      attendance: match.attendance,
      status: match.status,
      liveMinute: match.liveMinute,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      homeScore: match.homeTeam.score ?? 0,
      awayScore: match.awayTeam.score ?? 0,
      scorers,
      cards,
      statistics: match.statistics
        ? {
            possession: match.statistics.possession,
            shots: match.statistics.shots,
            shotsOnTarget: match.statistics.shotsOnTarget,
            corners: match.statistics.corners,
            expectedGoals: match.statistics.expectedGoals,
          }
        : undefined,
      standingsSnapshot: {
        homePosition: homeRow?.position,
        homePoints: homeRow?.points,
        awayPosition: awayRow?.position,
        awayPoints: awayRow?.points,
      },
    };

    return {
      context,
      hash: computeContextHash(context),
    };
  }

  buildMatchPreviewContext(
    match: Match,
    homeTeam?: Team | null,
    awayTeam?: Team | null,
    standings?: StandingTable | null,
  ): { context: MatchPreviewContext; hash: string } {
    const homeRow = standings?.rows.find(
      (r) => r.teamSlug === match.homeTeam.slug,
    );
    const awayRow = standings?.rows.find(
      (r) => r.teamSlug === match.awayTeam.slug,
    );

    const context: MatchPreviewContext = {
      matchSlug: match.slug,
      competitionName: match.competitionName,
      matchday: match.matchday,
      roundLabel: match.roundLabel,
      dateIso: match.dateIso,
      kickoffTime: match.kickoffTime,
      stadium: match.stadium,
      city: match.city,
      referee: match.referee,
      broadcastChannel: match.broadcastChannel,
      homeTeam: {
        name: match.homeTeam.name,
        position: homeRow?.position ?? homeTeam?.standing.position,
        points: homeRow?.points ?? homeTeam?.standing.points,
        goalsFor: homeRow?.goalsFor ?? homeTeam?.standing.goalsFor,
        goalsAgainst: homeRow?.goalsAgainst ?? homeTeam?.standing.goalsAgainst,
        recentForm: homeRow?.recentForm ?? homeTeam?.standing.recentForm,
        topScorer: homeTeam?.stats.topScorerName,
      },
      awayTeam: {
        name: match.awayTeam.name,
        position: awayRow?.position ?? awayTeam?.standing.position,
        points: awayRow?.points ?? awayTeam?.standing.points,
        goalsFor: awayRow?.goalsFor ?? awayTeam?.standing.goalsFor,
        goalsAgainst: awayRow?.goalsAgainst ?? awayTeam?.standing.goalsAgainst,
        recentForm: awayRow?.recentForm ?? awayTeam?.standing.recentForm,
        topScorer: awayTeam?.stats.topScorerName,
      },
    };

    return {
      context,
      hash: computeContextHash(context),
    };
  }
}

@Injectable()
export class RoundContextBuilder {
  buildRoundSummaryContext(
    standings: StandingTable,
    matches: Match[],
    topScorer?: Player | null,
  ): { context: RoundSummaryContext; hash: string } {
    const leader = standings.rows[0];
    const runnerUp = standings.rows[1] ?? standings.rows[0];

    const completedMatches = matches
      .filter((m) => m.status === MatchStatus.FINISHED)
      .map((m) => ({
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.homeTeam.score ?? 0,
        awayScore: m.awayTeam.score ?? 0,
      }));

    const liveMatches = matches
      .filter((m) => m.status === MatchStatus.LIVE)
      .map((m) => ({
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.homeTeam.score ?? 0,
        awayScore: m.awayTeam.score ?? 0,
        minute: m.liveMinute,
      }));

    const context: RoundSummaryContext = {
      competitionSlug: standings.competitionSlug,
      competitionName: standings.competitionName,
      season: standings.season,
      matchday: standings.matchday,
      leaderTeamName: leader?.teamName || 'Líder',
      leaderPoints: leader?.points || 0,
      runnerUpTeamName: runnerUp?.teamName || 'Segundo clasificado',
      runnerUpPoints: runnerUp?.points || 0,
      completedMatches,
      liveMatches,
      topScorer: topScorer
        ? {
            name: topScorer.name,
            teamName: topScorer.teamName,
            goals: topScorer.stats.goals,
          }
        : undefined,
    };

    return {
      context,
      hash: computeContextHash(context),
    };
  }
}

@Injectable()
export class TeamContextBuilder {
  buildTeamSummaryContext(team: Team): {
    context: TeamSummaryContext;
    hash: string;
  } {
    const context: TeamSummaryContext = {
      teamSlug: team.slug,
      teamName: team.name,
      competitionName: team.competitionName,
      stadium: team.stadium,
      city: team.city,
      coach: team.coach,
      position: team.standing.position,
      points: team.standing.points,
      played: team.standing.played,
      won: team.standing.won,
      drawn: team.standing.drawn,
      lost: team.standing.lost,
      goalsFor: team.standing.goalsFor,
      goalsAgainst: team.standing.goalsAgainst,
      goalDifference: team.standing.goalDifference,
      recentForm: team.standing.recentForm,
      possessionAvg: team.stats.possessionAvg,
      shotsPerGame: team.stats.shotsPerGame,
      cleanSheets: team.stats.cleanSheets,
      topScorerName: team.stats.topScorerName,
      topScorerGoals: team.stats.topScorerGoals,
    };

    return {
      context,
      hash: computeContextHash(context),
    };
  }
}

@Injectable()
export class PlayerContextBuilder {
  buildPlayerSummaryContext(
    player: Player,
    derivedMetrics: PlayerDerivedMetrics,
    competitionName: string,
  ): { context: PlayerSummaryContext; hash: string } {
    const context: PlayerSummaryContext = {
      playerSlug: player.slug,
      playerName: player.name,
      shirtNumber: player.shirtNumber,
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      teamName: player.teamName,
      competitionName,
      appearances: player.stats.appearances,
      minutesPlayed: player.stats.minutesPlayed,
      goals: player.stats.goals,
      assists: player.stats.assists,
      goalContributions: derivedMetrics.goalContributions,
      goalsPer90: derivedMetrics.goalsPer90,
      contributionsPer90: derivedMetrics.contributionsPer90,
      yellowCards: player.stats.yellowCards,
      redCards: player.stats.redCards,
      rating: player.stats.rating,
    };

    return {
      context,
      hash: computeContextHash(context),
    };
  }
}
