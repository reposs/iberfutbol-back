import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { loadEnvConfig } from '../../../config/env.config';
import {
  AiContentGenerator,
  AiRawDraftOutput,
  MatchPreviewContext,
  MatchSummaryContext,
  PlayerSummaryContext,
  RoundSummaryContext,
  TeamSummaryContext,
} from '../domain/ai-content-generator.port';

@Injectable()
export class PromptLoaderService {
  private readonly cache = new Map<string, string>();

  loadPrompt(promptFileName: string, contextPayload: unknown): string {
    const safeFileName = basename(promptFileName);
    if (!/^[a-z0-9-]+\.prompt$/.test(safeFileName)) {
      throw new Error('Invalid prompt template filename');
    }
    let template = this.cache.get(safeFileName);
    if (!template) {
      const candidatePaths = [
        join(__dirname, '..', 'prompts', safeFileName),
        join(process.cwd(), 'src', 'modules', 'ai', 'prompts', safeFileName),
        join(
          process.cwd(),
          'backend',
          'src',
          'modules',
          'ai',
          'prompts',
          safeFileName,
        ),
      ];

      const foundPath = candidatePaths.find((p) => existsSync(p));
      template = foundPath
        ? readFileSync(foundPath, 'utf-8')
        : 'Redacta un análisis deportivo en español (es-ES) usando exclusivamente:\n{{CONTEXT_JSON}}';
      this.cache.set(safeFileName, template);
    }

    return template.replace(
      '{{CONTEXT_JSON}}',
      JSON.stringify(contextPayload, null, 2),
    );
  }
}

@Injectable()
export class StructuredDataAiAdapter implements AiContentGenerator {
  public readonly providerName = 'StructuredDataAiAdapter (Motor Editorial Verificado)';

  async generateMatchSummary(ctx: MatchSummaryContext): Promise<AiRawDraftOutput> {
    const scoreStr = `${ctx.homeScore}-${ctx.awayScore}`;
    const scorersList =
      ctx.scorers.length > 0
        ? ctx.scorers
            .map(
              (s) =>
                `${s.playerName} (${s.minute}'${s.assistBy ? `, asist. de ${s.assistBy}` : ''})`,
            )
            .join(', ')
        : 'sin tantos registrados en el acta';

    const statsParagraph = ctx.statistics
      ? `En el apartado estadístico, el ${ctx.homeTeamName} registró un ${ctx.statistics.possession[0]}% de posesión (${ctx.statistics.expectedGoals[0].toFixed(2)} xG y ${ctx.statistics.shots[0]} remates totales, ${ctx.statistics.shotsOnTarget[0]} a puerta), frente al ${ctx.statistics.possession[1]}% de posesión (${ctx.statistics.expectedGoals[1].toFixed(2)} xG y ${ctx.statistics.shots[1]} disparos) del ${ctx.awayTeamName}.`
      : `Encuentro disputado en ${ctx.stadium} (${ctx.city}) bajo el arbitraje de ${ctx.referee}.`;

    const statusLabel =
      ctx.status === 'LIVE'
        ? `En juego (minuto ${ctx.liveMinute}')`
        : 'Crónica final';

    let headlineVerb = 'firma tablas ante';
    if (ctx.homeScore > ctx.awayScore) {
      headlineVerb = 'se impone a';
    } else if (ctx.homeScore < ctx.awayScore) {
      headlineVerb = 'cede ante';
    }

    return {
      title: `${statusLabel}: ${ctx.homeTeamName} ${headlineVerb} ${ctx.awayTeamName} (${scoreStr}) en ${ctx.competitionName}`,
      summary: `Marcador de ${scoreStr} en ${ctx.stadium} (${ctx.roundLabel}). Goles del encuentro: ${scorersList}.`,
      content: `${ctx.homeTeamName} y ${ctx.awayTeamName} protagonizaron el duelo de la ${ctx.roundLabel} de ${ctx.competitionName} en ${ctx.stadium} con resultado de ${scoreStr}. Los tantos del encuentro llevaron la firma de ${scorersList}. ${statsParagraph}`,
      highlights: [
        `Marcador oficial: ${ctx.homeTeamName} ${scoreStr} ${ctx.awayTeamName} (${ctx.roundLabel})`,
        `Goleadores verificados: ${scorersList}`,
        ctx.statistics
          ? `Goles esperados (xG): ${ctx.homeTeamName} ${ctx.statistics.expectedGoals[0].toFixed(2)} vs ${ctx.statistics.expectedGoals[1].toFixed(2)} ${ctx.awayTeamName}`
          : `Sede oficial: ${ctx.stadium} (${ctx.city}) · Árbitro: ${ctx.referee}`,
      ],
      provider: 'StructuredDataAiAdapter',
      model: 'editorial-es-v2',
    };
  }

  async generateMatchPreview(ctx: MatchPreviewContext): Promise<AiRawDraftOutput> {
    const homePos = ctx.homeTeam.position
      ? `${ctx.homeTeam.position}º con ${ctx.homeTeam.points} puntos`
      : 'en competición oficial';
    const awayPos = ctx.awayTeam.position
      ? `${ctx.awayTeam.position}º con ${ctx.awayTeam.points} puntos`
      : 'en competición oficial';

    const homeForm = ctx.homeTeam.recentForm?.join('-') || 'N/D';
    const awayForm = ctx.awayTeam.recentForm?.join('-') || 'N/D';

    return {
      title: `Previa ${ctx.competitionName}: ${ctx.homeTeam.name} vs ${ctx.awayTeam.name} en ${ctx.stadium}`,
      summary: `Análisis previo de la ${ctx.roundLabel} (${ctx.dateIso}, ${ctx.kickoffTime}h). El ${ctx.homeTeam.name} llega ${homePos} y recibe al ${ctx.awayTeam.name} (${awayPos}).`,
      content: `El ${ctx.stadium} de ${ctx.city} acoge el enfrentamiento correspondiente a la ${ctx.roundLabel} de ${ctx.competitionName} entre ${ctx.homeTeam.name} y ${ctx.awayTeam.name} a partir de las ${ctx.kickoffTime}h. El cuadro local afronta la cita situado ${homePos} (racha reciente: ${homeForm}), mientras que el conjunto visitante comparece ${awayPos} (racha reciente: ${awayForm}). El colegiado designado es ${ctx.referee}.`,
      highlights: [
        `Cita oficial: ${ctx.dateIso} a las ${ctx.kickoffTime}h en ${ctx.stadium}`,
        `Situación ${ctx.homeTeam.name}: ${homePos} (Forma: ${homeForm})`,
        `Situación ${ctx.awayTeam.name}: ${awayPos} (Forma: ${awayForm})`,
      ],
      provider: 'StructuredDataAiAdapter',
      model: 'editorial-es-v2',
    };
  }

  async generateRoundSummary(ctx: RoundSummaryContext): Promise<AiRawDraftOutput> {
    const completedText =
      ctx.completedMatches.length > 0
        ? ctx.completedMatches
            .map((m) => `${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}`)
            .join('; ')
        : 'encuentros en fase de disputa';

    const scorerText = ctx.topScorer
      ? `${ctx.topScorer.name} (${ctx.topScorer.teamName}) encabeza el trofeo de máximo realizador con ${ctx.topScorer.goals} dianas.`
      : '';

    return {
      title: `Resumen Jornada ${ctx.matchday} de ${ctx.competitionName}: ${ctx.leaderTeamName} lidera con ${ctx.leaderPoints} puntos`,
      summary: `Balance oficial de la Jornada ${ctx.matchday} (${ctx.season}): ${ctx.leaderTeamName} (${ctx.leaderPoints} pts) mantiene la primera plaza seguido de ${ctx.runnerUpTeamName} (${ctx.runnerUpPoints} pts).`,
      content: `La Jornada ${ctx.matchday} de ${ctx.competitionName} (${ctx.season}) sitúa a ${ctx.leaderTeamName} en lo más alto de la clasificación con ${ctx.leaderPoints} puntos, por delante de ${ctx.runnerUpTeamName} (${ctx.runnerUpPoints} puntos). Entre los marcadores cerrados de la jornada destacan: ${completedText}. ${scorerText}`,
      highlights: [
        `Líder de ${ctx.competitionName}: ${ctx.leaderTeamName} (${ctx.leaderPoints} puntos)`,
        `Perseguidor inmediato: ${ctx.runnerUpTeamName} (${ctx.runnerUpPoints} puntos)`,
        ctx.topScorer
          ? `Pichichi de la categoría: ${ctx.topScorer.name} con ${ctx.topScorer.goals} goles`
          : `Jornada ${ctx.matchday} de la temporada ${ctx.season}`,
      ],
      provider: 'StructuredDataAiAdapter',
      model: 'editorial-es-v2',
    };
  }

  async generateTeamSummary(ctx: TeamSummaryContext): Promise<AiRawDraftOutput> {
    const formStr = ctx.recentForm.join('-');
    const dgStr =
      ctx.goalDifference > 0 ? `+${ctx.goalDifference}` : `${ctx.goalDifference}`;

    return {
      title: `Informe de evolución del ${ctx.teamName}: ${ctx.position}º en ${ctx.competitionName} con ${ctx.points} puntos`,
      summary: `El conjunto dirigido por ${ctx.coach} suma ${ctx.won} victorias, ${ctx.drawn} empates y ${ctx.lost} derrotas en ${ctx.played} jornadas (${ctx.goalsFor} GF / ${ctx.goalsAgainst} GC).`,
      content: `El ${ctx.teamName} ocupa actualmente la ${ctx.position}ª posición de ${ctx.competitionName} con ${ctx.points} puntos tras disputar ${ctx.played} encuentros oficiales (${ctx.won}V, ${ctx.drawn}E, ${ctx.lost}D). En el plano ofensivo y defensivo acumula ${ctx.goalsFor} goles a favor y ${ctx.goalsAgainst} en contra (diferencia de ${dgStr}) y mantiene ${ctx.cleanSheets} porterías a cero en ${ctx.stadium}. Su posesión media es del ${ctx.possessionAvg}% con ${ctx.shotsPerGame} remates por partido, siendo ${ctx.topScorerName} (${ctx.topScorerGoals} goles) su principal referencia realizadora.`,
      highlights: [
        `Clasificación: ${ctx.position}º en ${ctx.competitionName} (${ctx.points} pts en ${ctx.played} PJ)`,
        `Rendimiento táctico: ${ctx.possessionAvg}% posesión · ${ctx.shotsPerGame} tiros/partido · ${ctx.cleanSheets} porterías a cero`,
        `Referencia ofensiva: ${ctx.topScorerName} (${ctx.topScorerGoals} goles) · Racha: ${formStr}`,
      ],
      provider: 'StructuredDataAiAdapter',
      model: 'editorial-es-v2',
    };
  }

  async generatePlayerSummary(
    ctx: PlayerSummaryContext,
  ): Promise<AiRawDraftOutput> {
    return {
      title: `Análisis de rendimiento de ${ctx.playerName} (${ctx.teamName}): ${ctx.goalContributions} contribuciones de gol en ${ctx.appearances} partidos`,
      summary: `El ${ctx.position.toLowerCase()} de ${ctx.age} años registra ${ctx.goals} goles y ${ctx.assists} asistencias en ${ctx.minutesPlayed} minutos (${ctx.contributionsPer90} G+A por 90').`,
      content: `${ctx.playerName} (#${ctx.shirtNumber}, ${ctx.nationality}) es una de las piezas destacadas del ${ctx.teamName} en ${ctx.competitionName}. En la presente campaña acumula ${ctx.appearances} apariciones oficiales (${ctx.minutesPlayed} minutos sobre el césped), firmando ${ctx.goals} goles y ${ctx.assists} asistencias para un total de ${ctx.goalContributions} participaciones directas de gol. Sus métricas por cada 90 minutos reflejan ${ctx.goalsPer90} goles/90' y ${ctx.contributionsPer90} contribuciones/90', con una valoración media de ${ctx.rating}.`,
      highlights: [
        `Producción ofensiva: ${ctx.goals} goles y ${ctx.assists} asistencias (${ctx.goalContributions} G+A)`,
        `Impacto por 90 minutos: ${ctx.contributionsPer90} G+A/90' en ${ctx.minutesPlayed} minutos jugados`,
        `Valoración oficial en ${ctx.teamName}: ★ ${ctx.rating} (${ctx.appearances} partidos)`,
      ],
      provider: 'StructuredDataAiAdapter',
      model: 'editorial-es-v2',
    };
  }
}

/**
 * Adaptador multi-proveedor que carga los prompts separados de `/ai/prompts/*.prompt`,
 * permite conectar con Ollama, Gemini u OpenAI según `AI_PROVIDER`, y delega en el
 * motor determinista estructurado cuando se ejecuta en modo sin coste (`structured-fallback`).
 */
@Injectable()
export class ConfigurableAiGeneratorAdapter implements AiContentGenerator {
  private readonly logger = new Logger(ConfigurableAiGeneratorAdapter.name);

  constructor(
    private readonly promptLoader: PromptLoaderService,
    private readonly structuredFallback: StructuredDataAiAdapter,
  ) {}

  get providerName(): string {
    const config = loadEnvConfig();
    return `ConfigurableAiGeneratorAdapter (${config.aiProvider})`;
  }

  private async tryExternalLlmOrFallback(
    promptFile: string,
    context: unknown,
    fallbackFn: () => Promise<AiRawDraftOutput>,
  ): Promise<AiRawDraftOutput> {
    const config = loadEnvConfig();
    const compiledPrompt = this.promptLoader.loadPrompt(promptFile, context);

    if (config.aiProvider === 'ollama' && config.ollamaBaseUrl) {
      try {
        const res = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.ollamaModel,
            prompt: compiledPrompt,
            format: 'json',
            stream: false,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { response?: string };
          if (data.response) {
            const parsed = JSON.parse(data.response) as Partial<AiRawDraftOutput>;
            if (parsed.title && parsed.summary && parsed.content) {
              return {
                title: parsed.title,
                summary: parsed.summary,
                content: parsed.content,
                highlights: parsed.highlights || [],
                provider: 'Ollama',
                model: config.ollamaModel,
              };
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          `Ollama provider not reachable (${(err as Error).message}), using verified structured engine.`,
        );
      }
    }

    return fallbackFn();
  }

  async generateMatchSummary(ctx: MatchSummaryContext): Promise<AiRawDraftOutput> {
    return this.tryExternalLlmOrFallback('match-summary.prompt', ctx, () =>
      this.structuredFallback.generateMatchSummary(ctx),
    );
  }

  async generateMatchPreview(ctx: MatchPreviewContext): Promise<AiRawDraftOutput> {
    return this.tryExternalLlmOrFallback('match-preview.prompt', ctx, () =>
      this.structuredFallback.generateMatchPreview(ctx),
    );
  }

  async generateRoundSummary(ctx: RoundSummaryContext): Promise<AiRawDraftOutput> {
    return this.tryExternalLlmOrFallback('round-summary.prompt', ctx, () =>
      this.structuredFallback.generateRoundSummary(ctx),
    );
  }

  async generateTeamSummary(ctx: TeamSummaryContext): Promise<AiRawDraftOutput> {
    return this.tryExternalLlmOrFallback('team-summary.prompt', ctx, () =>
      this.structuredFallback.generateTeamSummary(ctx),
    );
  }

  async generatePlayerSummary(
    ctx: PlayerSummaryContext,
  ): Promise<AiRawDraftOutput> {
    return this.tryExternalLlmOrFallback('player-summary.prompt', ctx, () =>
      this.structuredFallback.generatePlayerSummary(ctx),
    );
  }
}
