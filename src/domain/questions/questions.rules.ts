import type {
  ContentStatus,
  QuestionDifficulty,
  QuestionType,
} from "@/domain/models/studyplay";
import {
  canReadSubject,
  canWriteSubject,
} from "@/domain/subjects/subjects.rules";
import type {
  ActorContext,
  SubjectEntity,
} from "@/domain/subjects/subjects.types";
import type {
  QuestionEntity,
  QuestionOptionInput,
  QuestionResult,
} from "./questions.types";

const VALID_TYPES: QuestionType[] = [
  "single_choice",
  "true_false",
  "multiple_select",
];

const VALID_DIFFICULTIES: QuestionDifficulty[] = ["easy", "medium", "hard"];

export interface ValidatedQuestionPayload {
  type: QuestionType;
  prompt: string;
  explanation: string;
  difficulty: QuestionDifficulty;
  status: ContentStatus;
  sourcePage: number | null;
  options: Array<{
    id?: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
    sortOrder: number;
  }>;
}

/**
 * Normaliza las opciones ordenándolas y limpiando espacios.
 */
export function normalizeQuestionOptions(
  rawOptions: QuestionOptionInput[]
): Array<{
  id?: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  sortOrder: number;
}> {
  return rawOptions.map((opt, idx) => ({
    id: opt.id,
    text: opt.text?.trim() ?? "",
    isCorrect: Boolean(opt.isCorrect),
    feedback: opt.feedback?.trim() ?? "",
    sortOrder:
      typeof opt.sortOrder === "number" && opt.sortOrder >= 0
        ? Math.floor(opt.sortOrder)
        : idx + 1,
  }));
}

/**
 * Valida una pregunta en estado borrador (`draft`) o archivada (`archived`).
 * Permite trabajo en progreso sin exigir que la explicación o todas las opciones estén listas.
 */
export function validateQuestionDraftInput(input: {
  type: QuestionType;
  prompt: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  status?: ContentStatus;
  sourcePage?: number | null;
  options: QuestionOptionInput[];
}): QuestionResult<ValidatedQuestionPayload> {
  const type = VALID_TYPES.includes(input.type) ? input.type : "single_choice";
  const difficulty: QuestionDifficulty =
    input.difficulty && VALID_DIFFICULTIES.includes(input.difficulty)
      ? input.difficulty
      : "medium";
  const status: ContentStatus = input.status ?? "draft";

  const trimmedPrompt = input.prompt?.trim() ?? "";
  if (trimmedPrompt.length < 3 || trimmedPrompt.length > 2000) {
    return {
      ok: false,
      error: {
        code: "EMPTY_QUESTION_PROMPT",
        message:
          "El enunciado de la pregunta es obligatorio (entre 3 y 2000 caracteres).",
      },
    };
  }

  if (
    input.sourcePage !== undefined &&
    input.sourcePage !== null &&
    (!Number.isFinite(input.sourcePage) || input.sourcePage < 1)
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_SOURCE_PAGE",
        message:
          "El número de página del documento fuente debe ser un entero mayor o igual a 1.",
      },
    };
  }

  const normalizedOptions = normalizeQuestionOptions(input.options ?? []);
  for (const opt of normalizedOptions) {
    if (!opt.text) {
      return {
        ok: false,
        error: {
          code: "EMPTY_OPTION_TEXT",
          message: "Todas las opciones incluidas deben tener texto no vacío.",
        },
      };
    }
  }

  return {
    ok: true,
    data: {
      type,
      prompt: trimmedPrompt,
      explanation: input.explanation?.trim() ?? "",
      difficulty,
      status,
      sourcePage:
        input.sourcePage !== undefined && input.sourcePage !== null
          ? Math.floor(input.sourcePage)
          : null,
      options: normalizedOptions,
    },
  };
}

/**
 * Valida las reglas estrictas para publicar (`status = 'published'`) según Sección 10.2 y docs/04-MODELO-DATOS.md:
 * - Enunciado obligatorio (>= 5 chars)
 * - Explicación general obligatoria (>= 5 chars)
 * - Opciones con texto no vacío
 * - single_choice: >= 2 opciones y exactamente 1 correcta
 * - true_false: exactamente 2 opciones y exactamente 1 correcta
 * - multiple_select: >= 2 opciones, al menos 1 correcta y al menos 1 incorrecta
 */
export function validateQuestionForPublication(input: {
  type: QuestionType;
  prompt: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  sourcePage?: number | null;
  options: QuestionOptionInput[];
}): QuestionResult<ValidatedQuestionPayload> {
  const baseDraft = validateQuestionDraftInput({
    ...input,
    status: "published",
  });

  if (!baseDraft.ok) {
    return baseDraft;
  }

  const { type, prompt, explanation, options } = baseDraft.data;

  if (prompt.length < 5) {
    return {
      ok: false,
      error: {
        code: "EMPTY_QUESTION_PROMPT",
        message:
          "Para publicar una pregunta, el enunciado debe tener al menos 5 caracteres.",
      },
    };
  }

  if (explanation.length < 5) {
    return {
      ok: false,
      error: {
        code: "MISSING_GENERAL_EXPLANATION",
        message:
          "Para publicar una pregunta es obligatorio incluir una explicación general (mínimo 5 caracteres).",
      },
    };
  }

  const totalCount = options.length;
  const correctCount = options.filter((o) => o.isCorrect).length;
  const incorrectCount = totalCount - correctCount;

  if (type === "single_choice") {
    if (totalCount < 2) {
      return {
        ok: false,
        error: {
          code: "INSUFFICIENT_OPTIONS",
          message:
            "Una pregunta de opción única (single_choice) requiere al menos 2 opciones para publicarse.",
        },
      };
    }

    if (correctCount !== 1) {
      return {
        ok: false,
        error: {
          code: "INVALID_SINGLE_CHOICE_CORRECT_COUNT",
          message:
            "Una pregunta de opción única (single_choice) debe tener exactamente 1 opción correcta.",
        },
      };
    }
  } else if (type === "true_false") {
    if (totalCount !== 2 || correctCount !== 1) {
      return {
        ok: false,
        error: {
          code: "INVALID_TRUE_FALSE_CONFIG",
          message:
            "Una pregunta Verdadero/Falso (true_false) requiere exactamente 2 opciones y 1 opción correcta.",
        },
      };
    }
  } else if (type === "multiple_select") {
    if (totalCount < 2) {
      return {
        ok: false,
        error: {
          code: "INSUFFICIENT_OPTIONS",
          message:
            "Una pregunta de selección múltiple (multiple_select) requiere al menos 2 opciones.",
        },
      };
    }

    if (correctCount < 1 || incorrectCount < 1) {
      return {
        ok: false,
        error: {
          code: "INVALID_MULTIPLE_SELECT_CONFIG",
          message:
            "Una pregunta de selección múltiple (multiple_select) requiere al menos 1 opción correcta y al menos 1 opción incorrecta (distractor).",
        },
      };
    }
  }

  return baseDraft;
}

/**
 * Calcula la siguiente versión (`version`) de una pregunta:
 * incrementa en +1 cuando cambia el contenido sustantivo (prompt, explanation, type, difficulty u opciones).
 */
export function computeNextQuestionVersion(
  existing: Pick<
    QuestionEntity,
    "version" | "type" | "prompt" | "explanation" | "difficulty" | "options"
  >,
  updated: {
    type: QuestionType;
    prompt: string;
    explanation: string;
    difficulty: QuestionDifficulty;
    options: Array<{
      text: string;
      isCorrect: boolean;
      feedback: string;
      sortOrder: number;
    }>;
  }
): number {
  const baseChanged =
    existing.type !== updated.type ||
    existing.prompt.trim() !== updated.prompt.trim() ||
    existing.explanation.trim() !== updated.explanation.trim() ||
    existing.difficulty !== updated.difficulty;

  if (baseChanged) {
    return existing.version + 1;
  }

  if (existing.options.length !== updated.options.length) {
    return existing.version + 1;
  }

  for (let i = 0; i < existing.options.length; i += 1) {
    const prevOpt = existing.options[i];
    const nextOpt = updated.options[i];
    if (
      prevOpt.text.trim() !== nextOpt.text.trim() ||
      prevOpt.isCorrect !== nextOpt.isCorrect ||
      prevOpt.feedback.trim() !== nextOpt.feedback.trim()
    ) {
      return existing.version + 1;
    }
  }

  return existing.version;
}

/**
 * Determina el estado de disponibilidad del documento PDF fuente.
 * Si el documento fue eliminado (ON DELETE SET NULL), preserva `sourceDocumentName`
 * y marca `sourceDocumentAvailable = false` ("Fuente no disponible").
 */
export function resolveQuestionSourceState(params: {
  sourceDocumentId: string | null;
  sourceDocumentName: string | null;
  availableDocumentsById: Map<string, { filename: string; status: string }>;
}): {
  sourceDocumentId: string | null;
  sourceDocumentName: string | null;
  sourceDocumentAvailable: boolean;
} {
  const { sourceDocumentId, sourceDocumentName, availableDocumentsById } =
    params;

  if (!sourceDocumentId) {
    return {
      sourceDocumentId: null,
      sourceDocumentName: sourceDocumentName ?? null,
      sourceDocumentAvailable: false,
    };
  }

  const foundDoc = availableDocumentsById.get(sourceDocumentId);
  if (!foundDoc || foundDoc.status !== "available") {
    return {
      sourceDocumentId: foundDoc ? sourceDocumentId : null,
      sourceDocumentName: sourceDocumentName ?? foundDoc?.filename ?? null,
      sourceDocumentAvailable: false,
    };
  }

  return {
    sourceDocumentId,
    sourceDocumentName: foundDoc.filename,
    sourceDocumentAvailable: true,
  };
}

/**
 * Verifica si un actor puede leer una pregunta determinada dentro de una materia.
 * - El dueño de la materia (o admin en materia pública) puede ver preguntas en cualquier estado (draft, published, archived).
 * - En el catálogo público para visitantes u otros usuarios, solo son visibles las preguntas con `status === 'published'`.
 */
export function canReadQuestion(
  actor: ActorContext | null,
  subject: SubjectEntity,
  question: Pick<QuestionEntity, "status">
): boolean {
  if (!canReadSubject(actor, subject)) {
    return false;
  }

  if (canWriteSubject(actor, subject)) {
    return true;
  }

  return (
    subject.visibility === "public" &&
    subject.status === "published" &&
    question.status === "published"
  );
}

export function canWriteQuestion(
  actor: ActorContext | null,
  subject: SubjectEntity
): boolean {
  return canWriteSubject(actor, subject);
}
