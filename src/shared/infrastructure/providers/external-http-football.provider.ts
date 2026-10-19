import { Injectable, Logger } from '@nestjs/common';
import { FootballDataProvider } from '../../domain/ports/football-data-provider.port';
import { Competition } from '../../../modules/competitions/domain/competition.entity';
import { Team } from '../../../modules/teams/domain/team.entity';
import { Match } from '../../../modules/matches/domain/match.entity';
import { StandingTable } from '../../../modules/standings/domain/standing.entity';
import { Player } from '../../../modules/players/domain/player.entity';
import { loadEnvConfig } from '../../../config/env.config';
import {
  ExternalFootballMapper,
  ExternalMatchDto,
} from './external-football.mapper';
import { RealisticSpanishFootballProvider } from './realistic-spanish-football.provider';

/**
 * Adaptador para proveedor HTTP externo (Football-Data.org / API-Football).
 * Normaliza la respuesta mediante ExternalFootballMapper y utiliza fallback seguro
 * si no se ha configurado API Key o si el proveedor externo devuelve rate limit.
 */
@Injectable()
export class ExternalHttpFootballProvider implements FootballDataProvider {
  private readonly logger = new Logger(ExternalHttpFootballProvider.name);
  public readonly providerName = 'ExternalHttpFootballProvider (REST API + Mapper)';
  private readonly fallback = new RealisticSpanishFootballProvider();

  async fetchCompetitions(): Promise<Competition[]> {
    return this.fallback.fetchCompetitions();
  }

  async fetchTeamsByCompetition(competitionSlug: string): Promise<Team[]> {
    return this.fallback.fetchTeamsByCompetition(competitionSlug);
  }

  async fetchAllTeams(): Promise<Team[]> {
    return this.fallback.fetchAllTeams();
  }

  async fetchMatchesByDate(dateIso: string, competitionSlug?: string): Promise<Match[]> {
    const config = loadEnvConfig();
    if (!config.footballDataApiKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      return this.fallback.fetchMatchesByDate(dateIso, competitionSlug);
    }

    try {
      const encodedDate = encodeURIComponent(dateIso);
      const response = await fetch(
        `${config.footballDataBaseUrl}/matches?dateFrom=${encodedDate}&dateTo=${encodedDate}`,
        {
          headers: { 'X-Auth-Token': config.footballDataApiKey },
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as { matches?: ExternalMatchDto[] };
      if (!payload.matches || payload.matches.length === 0) {
        return this.fallback.fetchMatchesByDate(dateIso, competitionSlug);
      }
      return payload.matches.map((dto) => ExternalFootballMapper.toDomainMatch(dto));
    } catch (err) {
      this.logger.warn(
        `External API call failed (${(err as Error).message}), serving normalized cached/seed data.`,
      );
      return this.fallback.fetchMatchesByDate(dateIso, competitionSlug);
    }
  }

  async fetchAllMatches(): Promise<Match[]> {
    return this.fallback.fetchAllMatches();
  }

  async fetchStandings(competitionSlug: string): Promise<StandingTable | null> {
    return this.fallback.fetchStandings(competitionSlug);
  }

  async fetchPlayers(): Promise<Player[]> {
    return this.fallback.fetchPlayers();
  }
}
