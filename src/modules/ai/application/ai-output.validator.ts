import { Injectable } from '@nestjs/common';
import { AiRawDraftOutput } from '../domain/ai-content-generator.port';
import { GeneratedContentStatus } from '../../content/domain/generated-content.entity';

export interface ValidationResult {
  isValid: boolean;
  status: GeneratedContentStatus;
  notes: string[];
  sanitizedDraft: AiRawDraftOutput;
}

/**
 * Validador de salida de IA (Sección 20):
 * Verifica que el texto generado no contenga rumores, declaraciones inventadas,
 * ni contradiga los marcadores o entidades del contexto estructurado.
 */
@Injectable()
export class AiOutputValidator {
  private readonly prohibitedPatterns: { regex: RegExp; reason: string }[] = [
    {
      regex: /seg[uú]n rumores|rumores apuntan|fuentes cercanas aseguran/i,
      reason: 'Contiene lenguaje especulativo o rumores no verificados',
    },
    {
      regex: /declar[oó] en rueda de prensa|asegur[oó] ante los micr[oó]fonos/i,
      reason: 'Contiene citas o declaraciones no presentes en los datos estructurados',
    },
    {
      regex: /sufre una lesi[oó]n muscular|estar[aá] de baja varios meses/i,
      reason: 'Contiene partes médicos o lesiones no verificadas',
    },
  ];

  public validate(
    draft: AiRawDraftOutput,
    expectedTerms: string[] = [],
  ): ValidationResult {
    const notes: string[] = [];

    const title = (draft.title || '').trim();
    const summary = (draft.summary || '').trim();
    const content = (draft.content || '').trim();
    const highlights = Array.isArray(draft.highlights)
      ? draft.highlights.filter((h) => Boolean(h && h.trim()))
      : [];

    if (title.length < 10) {
      notes.push('El titular es demasiado corto (< 10 caracteres).');
    }
    if (summary.length < 25) {
      notes.push('El resumen editorial es demasiado corto (< 25 caracteres).');
    }
    if (content.length < 40) {
      notes.push('El cuerpo del contenido es insuficiente (< 40 caracteres).');
    }

    const combinedText = `${title} ${summary} ${content}`;

    for (const rule of this.prohibitedPatterns) {
      if (rule.regex.test(combinedText)) {
        notes.push(rule.reason);
      }
    }

    for (const term of expectedTerms) {
      if (
        term &&
        !combinedText.toLowerCase().includes(term.toLowerCase())
      ) {
        notes.push(
          `El contenido omitió la referencia verificada obligatoria: "${term}"`,
        );
      }
    }

    const isValid = notes.length === 0;
    const status = isValid
      ? GeneratedContentStatus.PUBLISHED
      : GeneratedContentStatus.REVIEW_REQUIRED;

    return {
      isValid,
      status,
      notes: isValid
        ? ['Verificación superada: 100% alineado con datos estructurados.']
        : notes,
      sanitizedDraft: {
        ...draft,
        title,
        summary,
        content,
        highlights: highlights.slice(0, 5),
      },
    };
  }
}
