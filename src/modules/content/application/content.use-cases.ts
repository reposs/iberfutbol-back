import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CACHE_PORT,
  CACHE_TTL,
  CachePort,
} from '../../../shared/domain/ports/cache.port';
import {
  AI_CONTENT_GENERATOR,
  AiContentGenerator,
} from '../../ai/domain/ai-content-generator.port';
import {
  MatchContextBuilder,
  PlayerContextBuilder,
  RoundContextBuilder,
  TeamContextBuilder,
} from '../../ai/application/context-builders';
import { AiOutputValidator } from '../../ai/application/ai-output.validator';
import {
  CONTENT_REPOSITORY,
  ContentFilterOptions,
  ContentRepository,
  GeneratedContent,
  GeneratedContentType,
} from '../domain/generated-content.entity';
import {
  MATCH_REPOSITORY,
  MatchRepository,
} from '../../matches/domain/match.repository';
import { MatchStatus } from '../../matches/domain/match.entity';
import {
  STANDINGS_REPOSITORY,
  StandingsRepository,
} from '../../standings/domain/standings.repository';
import {
  COMPETITION_REPOSITORY,
  CompetitionRepository,
} from '../../competitions/domain/competition.repository';
import {
  TEAM_REPOSITORY,
  TeamRepository,
} from '../../teams/domain/team.repository';
import {
  PLAYER_REPOSITORY,
  Player,
  PlayerDerivedMetrics,
  PlayerRepository,
} from '../../players/domain/player.entity';

export function computePlayerDerivedMetrics(player: Player): PlayerDerivedMetrics {
  const { appearances, minutesPlayed, goals, assists } = player.stats;
  const goalContributions = goals + assists;
  const nineties = minutesPlayed > 0 ? minutesPlayed / 90 : 0;

  return {
    goalContributions,
    goalsPer90: nineties > 0 ? Number((goals / nineties).toFixed(2)) : 0,
    assistsPer90: nineties > 0 ? Number((assists / nineties).toFixed(2)) : 0,
    contributionsPer90:
      nineties > 0 ? Number((goalContributions / nineties).toFixed(2)) : 0,
    minutesPerGoal: goals > 0 ? Math.round(minutesPlayed / goals) : null,
    minutesPerAppearance:
      appearances > 0 ? Math.round(minutesPlayed / appearances) : 0,
  };
}

@Injectable()
export class GenerateMatchSummaryUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: MatchRepository,
    @Inject(STANDINGS_REPOSITORY)
    private readonly standingsRepository: StandingsRepository,
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: TeamRepository,
    @Inject(CONTENT_REPOSITORY)
    private readonly contentRepository: ContentRepository,
    @Inject(AI_CONTENT_GENERATOR)
    private readonly aiGenerator: AiContentGenerator,
    private readonly matchContextBuilder: MatchContextBuilder,
    private readonly validator: AiOutputValidator,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(matchSlug: string, forceRegenerate = false): Promise<GeneratedContent> {
    const match = await this.matchRepository.findBySlug(matchSlug);
    if (!match) {
      throw new NotFoundException(`Partido '${matchSlug}' no encontrado`);
    }

    const standings = await this.standingsRepository.findByCompetitionSlug(
      match.competitionSlug,
    );

    const isPreview = match.status === MatchStatus.UPCOMING;
    const targetType = isPreview
      ? GeneratedContentType.MATCH_PREVIEW
      : GeneratedContentType.MATCH_SUMMARY;

    const existing = await this.contentRepository.findByEntity(
      'MATCH',
      match.slug,
      targetType,
    );

    if (isPreview) {
      const [homeTeam, awayTeam] = await Promise.all([
        this.teamRepository.findBySlug(match.homeTeam.slug),
        this.teamRepository.findBySlug(match.awayTeam.slug),
      ]);

      const { context, hash } = this.matchContextBuilder.buildMatchPreviewContext(
        match,
        homeTeam,
        awayTeam,
        standings,
      );

      if (!forceRegenerate && existing && existing.verifiedDataHash === hash) {
        return existing;
      }

      const draft = await this.aiGenerator.generateMatchPreview(context);
      const validation = this.validator.validate(draft, [
        context.homeTeam.name,
        context.awayTeam.name,
      ]);

      const now = new Date().toISOString();
      const saved = await this.contentRepository.save({
        id: `cnt-match-preview-${match.slug}`,
        type: GeneratedContentType.MATCH_PREVIEW,
        title: validation.sanitizedDraft.title,
        summary: validation.sanitizedDraft.summary,
        content: validation.sanitizedDraft.content,
        highlights: validation.sanitizedDraft.highlights,
        entityId: match.slug,
        entityType: 'MATCH',
        language: 'es-ES',
        provider: draft.provider,
        model: draft.model,
        status: validation.status,
        verifiedDataHash: hash,
        validationNotes: validation.notes,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });

      await this.cache.set(
        `content:match:${match.slug}`,
        saved,
        CACHE_TTL.GENERATED_CONTENT,
      );
      return saved;
    }

    const { context, hash } = this.matchContextBuilder.buildMatchSummaryContext(
      match,
      standings,
    );

    if (!forceRegenerate && existing && existing.verifiedDataHash === hash) {
      return existing;
    }

    const draft = await this.aiGenerator.generateMatchSummary(context);
    const validation = this.validator.validate(draft, [
      context.homeTeamName,
      context.awayTeamName,
      `${context.homeScore}-${context.awayScore}`,
    ]);

    const now = new Date().toISOString();
    const saved = await this.contentRepository.save({
      id: `cnt-match-summary-${match.slug}`,
      type: GeneratedContentType.MATCH_SUMMARY,
      title: validation.sanitizedDraft.title,
      summary: validation.sanitizedDraft.summary,
      content: validation.sanitizedDraft.content,
      highlights: validation.sanitizedDraft.highlights,
      entityId: match.slug,
      entityType: 'MATCH',
      language: 'es-ES',
      provider: draft.provider,
      model: draft.model,
      status: validation.status,
      verifiedDataHash: hash,
      validationNotes: validation.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    await this.cache.set(
      `content:match:${match.slug}`,
      saved,
      CACHE_TTL.GENERATED_CONTENT,
    );
    return saved;
  }
}

@Injectable()
export class GenerateRoundSummaryUseCase {
  constructor(
    @Inject(COMPETITION_REPOSITORY)
    private readonly competitionRepository: CompetitionRepository,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: MatchRepository,
    @Inject(STANDINGS_REPOSITORY)
    private readonly standingsRepository: StandingsRepository,
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    @Inject(CONTENT_REPOSITORY)
    private readonly contentRepository: ContentRepository,
    @Inject(AI_CONTENT_GENERATOR)
    private readonly aiGenerator: AiContentGenerator,
    private readonly roundContextBuilder: RoundContextBuilder,
    private readonly validator: AiOutputValidator,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(
    competitionSlug: string,
    forceRegenerate = false,
  ): Promise<GeneratedContent> {
    const competition = await this.competitionRepository.findBySlug(competitionSlug);
    if (!competition) {
      throw new NotFoundException(
        `Competición '${competitionSlug}' no encontrada`,
      );
    }

    const [matches, standings, topScorers] = await Promise.all([
      this.matchRepository.findAll({ competitionSlug: competition.slug }),
      this.standingsRepository.findByCompetitionSlug(competition.slug),
      this.playerRepository.findTopScorers(1, competition.slug),
    ]);

    const fallbackStandings = standings ?? {
      competitionSlug: competition.slug,
      competitionName: competition.name,
      season: competition.currentSeason,
      matchday: competition.currentMatchday,
      updatedAt: new Date().toISOString(),
      legend: [],
      rows: [],
    };

    const { context, hash } = this.roundContextBuilder.buildRoundSummaryContext(
      fallbackStandings,
      matches,
      topScorers[0] ?? null,
    );

    const existing = await this.contentRepository.findByEntity(
      'COMPETITION',
      competition.slug,
      GeneratedContentType.ROUND_SUMMARY,
    );

    if (!forceRegenerate && existing && existing.verifiedDataHash === hash) {
      return existing;
    }

    const draft = await this.aiGenerator.generateRoundSummary(context);
    const validation = this.validator.validate(draft, [competition.name]);

    const now = new Date().toISOString();
    const saved = await this.contentRepository.save({
      id: `cnt-round-${competition.slug}`,
      type: GeneratedContentType.ROUND_SUMMARY,
      title: validation.sanitizedDraft.title,
      summary: validation.sanitizedDraft.summary,
      content: validation.sanitizedDraft.content,
      highlights: validation.sanitizedDraft.highlights,
      entityId: competition.slug,
      entityType: 'COMPETITION',
      language: 'es-ES',
      provider: draft.provider,
      model: draft.model,
      status: validation.status,
      verifiedDataHash: hash,
      validationNotes: validation.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    await this.cache.set(
      `content:round:${competition.slug}`,
      saved,
      CACHE_TTL.GENERATED_CONTENT,
    );
    return saved;
  }
}

@Injectable()
export class GenerateTeamSummaryUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: TeamRepository,
    @Inject(CONTENT_REPOSITORY)
    private readonly contentRepository: ContentRepository,
    @Inject(AI_CONTENT_GENERATOR)
    private readonly aiGenerator: AiContentGenerator,
    private readonly teamContextBuilder: TeamContextBuilder,
    private readonly validator: AiOutputValidator,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(teamSlug: string, forceRegenerate = false): Promise<GeneratedContent> {
    const team = await this.teamRepository.findBySlug(teamSlug);
    if (!team) {
      throw new NotFoundException(`Equipo '${teamSlug}' no encontrado`);
    }

    const { context, hash } = this.teamContextBuilder.buildTeamSummaryContext(team);

    const existing = await this.contentRepository.findByEntity(
      'TEAM',
      team.slug,
      GeneratedContentType.TEAM_SUMMARY,
    );

    if (!forceRegenerate && existing && existing.verifiedDataHash === hash) {
      return existing;
    }

    const draft = await this.aiGenerator.generateTeamSummary(context);
    const validation = this.validator.validate(draft, [team.name]);

    const now = new Date().toISOString();
    const saved = await this.contentRepository.save({
      id: `cnt-team-${team.slug}`,
      type: GeneratedContentType.TEAM_SUMMARY,
      title: validation.sanitizedDraft.title,
      summary: validation.sanitizedDraft.summary,
      content: validation.sanitizedDraft.content,
      highlights: validation.sanitizedDraft.highlights,
      entityId: team.slug,
      entityType: 'TEAM',
      language: 'es-ES',
      provider: draft.provider,
      model: draft.model,
      status: validation.status,
      verifiedDataHash: hash,
      validationNotes: validation.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    await this.cache.set(
      `content:team:${team.slug}`,
      saved,
      CACHE_TTL.GENERATED_CONTENT,
    );
    return saved;
  }
}

@Injectable()
export class GeneratePlayerSummaryUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: TeamRepository,
    @Inject(CONTENT_REPOSITORY)
    private readonly contentRepository: ContentRepository,
    @Inject(AI_CONTENT_GENERATOR)
    private readonly aiGenerator: AiContentGenerator,
    private readonly playerContextBuilder: PlayerContextBuilder,
    private readonly validator: AiOutputValidator,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async execute(
    playerSlug: string,
    forceRegenerate = false,
  ): Promise<GeneratedContent> {
    const player = await this.playerRepository.findBySlug(playerSlug);
    if (!player) {
      throw new NotFoundException(`Jugador '${playerSlug}' no encontrado`);
    }

    const team = await this.teamRepository.findBySlug(player.teamSlug);
    const competitionName = team?.competitionName ?? 'LaLiga EA Sports';

    const metrics = computePlayerDerivedMetrics(player);
    const { context, hash } = this.playerContextBuilder.buildPlayerSummaryContext(
      player,
      metrics,
      competitionName,
    );

    const existing = await this.contentRepository.findByEntity(
      'PLAYER',
      player.slug,
      GeneratedContentType.PLAYER_SUMMARY,
    );

    if (!forceRegenerate && existing && existing.verifiedDataHash === hash) {
      return existing;
    }

    const draft = await this.aiGenerator.generatePlayerSummary(context);
    const validation = this.validator.validate(draft, [player.name]);

    const now = new Date().toISOString();
    const saved = await this.contentRepository.save({
      id: `cnt-player-${player.slug}`,
      type: GeneratedContentType.PLAYER_SUMMARY,
      title: validation.sanitizedDraft.title,
      summary: validation.sanitizedDraft.summary,
      content: validation.sanitizedDraft.content,
      highlights: validation.sanitizedDraft.highlights,
      entityId: player.slug,
      entityType: 'PLAYER',
      language: 'es-ES',
      provider: draft.provider,
      model: draft.model,
      status: validation.status,
      verifiedDataHash: hash,
      validationNotes: validation.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    await this.cache.set(
      `content:player:${player.slug}`,
      saved,
      CACHE_TTL.GENERATED_CONTENT,
    );
    return saved;
  }
}

@Injectable()
export class GetGeneratedContentUseCase {
  constructor(
    @Inject(CONTENT_REPOSITORY)
    private readonly contentRepository: ContentRepository,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: MatchRepository,
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    private readonly generateMatchSummary: GenerateMatchSummaryUseCase,
    private readonly generateRoundSummary: GenerateRoundSummaryUseCase,
    private readonly generateTeamSummary: GenerateTeamSummaryUseCase,
    private readonly generatePlayerSummary: GeneratePlayerSummaryUseCase,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async findAll(filters?: ContentFilterOptions): Promise<GeneratedContent[]> {
    const existing = await this.contentRepository.findAll(filters);
    if (existing.length === 0 && !filters?.entityId) {
      const [matches, players] = await Promise.all([
        this.matchRepository.findAll(),
        this.playerRepository.findTopScorers(1),
      ]);

      const seedTasks: Promise<unknown>[] = [
        this.generateRoundSummary
          .execute('laliga-ea-sports')
          .catch(() => null),
        this.generateTeamSummary.execute('fc-barcelona').catch(() => null),
      ];

      for (const m of matches.slice(0, 3)) {
        seedTasks.push(
          this.generateMatchSummary.execute(m.slug).catch(() => null),
        );
      }

      if (players.length > 0) {
        seedTasks.push(
          this.generatePlayerSummary.execute(players[0].slug).catch(() => null),
        );
      }

      await Promise.all(seedTasks);
      return this.contentRepository.findAll(filters);
    }
    return existing;
  }

  async getForMatch(slug: string, force = false): Promise<GeneratedContent> {
    const cacheKey = `content:match:${slug}`;
    if (!force) {
      const cached = await this.cache.get<GeneratedContent>(cacheKey);
      if (cached) return cached;
    }
    return this.generateMatchSummary.execute(slug, force);
  }

  async getForRound(
    competitionSlug: string,
    force = false,
  ): Promise<GeneratedContent> {
    const cacheKey = `content:round:${competitionSlug}`;
    if (!force) {
      const cached = await this.cache.get<GeneratedContent>(cacheKey);
      if (cached) return cached;
    }
    return this.generateRoundSummary.execute(competitionSlug, force);
  }

  async getForTeam(slug: string, force = false): Promise<GeneratedContent> {
    const cacheKey = `content:team:${slug}`;
    if (!force) {
      const cached = await this.cache.get<GeneratedContent>(cacheKey);
      if (cached) return cached;
    }
    return this.generateTeamSummary.execute(slug, force);
  }

  async getForPlayer(slug: string, force = false): Promise<GeneratedContent> {
    const cacheKey = `content:player:${slug}`;
    if (!force) {
      const cached = await this.cache.get<GeneratedContent>(cacheKey);
      if (cached) return cached;
    }
    return this.generatePlayerSummary.execute(slug, force);
  }
}
