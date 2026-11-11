import type { AttemptEntity } from "@/domain/attempts/attempts.types";
import type { QuizMode } from "@/domain/models/studyplay";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import type { ActorContext } from "@/domain/subjects/subjects.types";
import type {
  AnswerEvaluationResult,
  QuizResult,
  QuizSessionEntity,
} from "./quizzes.types";

/**
 * Hash determinista de texto a entero de 32 bits (xmur3) para inicializar semilla.
 */
function hashSeedString(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/**
 * Generador pseudoaleatorio determinista de 32 bits (mulberry32).
 */
function createSeededRandom(seed: string): () => number {
  let state = hashSeedString(seed || "studyplay-default-seed");
  return function nextRandom(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Baraja un arreglo de forma 100% reproducible dada la misma semilla (`seed`).
 * No muta el arreglo de entrada.
 */
export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const copy = [...items];
  const random = createSeededRandom(seed);

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

/**
 * Motor de corrección determinista en dominio (Sección 10.2, docs/04-MODELO-DATOS.md y docs/06-PLAN-DE-PRUEBAS.md):
 * - Caso Imprescindible #6: rechaza cualquier ID de opción que no pertenezca a `question.options` (`INVALID_OPTION_ID`).
 * - `single_choice` y `true_false`: exige exactamente 1 opción seleccionada y coincidencia con la opción correcta.
 * - Caso Imprescindible #7: `multiple_select` solo marca acierto cuando el conjunto de IDs seleccionados
 *   coincide exactamente con el conjunto completo de opciones correctas (sin faltar correctas ni sobrar distractores).
 */
export function evaluateQuestionAnswer(
  question: Pick<
    QuestionEntity,
    "id" | "version" | "type" | "explanation" | "options"
  >,
  rawSelectedOptionIds: readonly string[]
): QuizResult<AnswerEvaluationResult> {
  const uniqueSelectedIds = Array.from(
    new Set(
      (rawSelectedOptionIds ?? [])
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id))
    )
  );

  if (uniqueSelectedIds.length === 0) {
    return {
      ok: false,
      error: {
        code: "EMPTY_ANSWER_SELECTION",
        message: "Debes seleccionar al menos una opción antes de responder.",
      },
    };
  }

  const validOptionMap = new Map(
    question.options.map((opt) => [opt.id, opt] as const)
  );

  for (const selectedId of uniqueSelectedIds) {
    if (!validOptionMap.has(selectedId)) {
      return {
        ok: false,
        error: {
          code: "INVALID_OPTION_ID",
          message: `La opción enviada "${selectedId}" no pertenece a la pregunta actual.`,
        },
      };
    }
  }

  if (
    (question.type === "single_choice" || question.type === "true_false") &&
    uniqueSelectedIds.length > 1
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_SINGLE_CHOICE_SELECTION",
        message: `Las preguntas de tipo ${question.type} solo admiten seleccionar 1 opción.`,
      },
    };
  }

  const correctOptionIds = question.options
    .filter((o) => o.isCorrect)
    .map((o) => o.id);

  const selectedSet = new Set(uniqueSelectedIds);
  const correctSet = new Set(correctOptionIds);

  let isCorrect = false;
  if (question.type === "single_choice" || question.type === "true_false") {
    isCorrect =
      uniqueSelectedIds.length === 1 &&
      correctSet.size === 1 &&
      correctSet.has(uniqueSelectedIds[0]);
  } else if (question.type === "multiple_select") {
    isCorrect =
      selectedSet.size === correctSet.size &&
      uniqueSelectedIds.every((id) => correctSet.has(id));
  }

  const optionFeedbacks = question.options.map((opt) => ({
    optionId: opt.id,
    text: opt.text,
    isSelected: selectedSet.has(opt.id),
    isCorrect: opt.isCorrect,
    feedback: opt.feedback,
  }));

  return {
    ok: true,
    data: {
      questionId: question.id,
      questionVersion: question.version,
      isCorrect,
      selectedOptionIds: uniqueSelectedIds,
      correctOptionIds,
      generalExplanation: question.explanation,
      optionFeedbacks,
    },
  };
}

/**
 * Selecciona y ordena con semilla (`seed`) las preguntas elegibles para una sesión:
 * - Solo incluye preguntas con `status === 'published'` (nunca `draft` ni `archived`).
 * - Si se indica `topicId`, filtra las preguntas de ese tema.
 * - Si `mode === 'mistakes'`, filtra exclusivamente las preguntas cuyos IDs estén en `mistakeQuestionIds`.
 */
export function selectEligibleQuizQuestions(params: {
  questions: readonly QuestionEntity[];
  mode: QuizMode;
  questionCount: number;
  seed: string;
  topicId?: string | null;
  mistakeQuestionIds?: ReadonlySet<string>;
}): QuizResult<QuestionEntity[]> {
  const {
    questions,
    mode,
    questionCount,
    seed,
    topicId,
    mistakeQuestionIds,
  } = params;

  const safeLimit = Math.max(1, Math.min(50, Math.floor(questionCount || 10)));

  let eligible = questions.filter((q) => q.status === "published");

  if (topicId) {
    eligible = eligible.filter((q) => q.topicId === topicId);
  }

  if (mode === "mistakes") {
    if (!mistakeQuestionIds || mistakeQuestionIds.size === 0) {
      return {
        ok: false,
        error: {
          code: "NO_ELIGIBLE_QUESTIONS",
          message:
            "No tienes preguntas con errores pendientes en esta materia para iniciar el Modo Repaso de Errores.",
        },
      };
    }
    eligible = eligible.filter((q) => mistakeQuestionIds.has(q.id));
  }

  if (eligible.length === 0) {
    return {
      ok: false,
      error: {
        code: "NO_ELIGIBLE_QUESTIONS",
        message:
          "No hay preguntas publicadas disponibles para los filtros seleccionados.",
      },
    };
  }

  const shuffled = shuffleWithSeed(eligible, seed);
  return {
    ok: true,
    data: shuffled.slice(0, safeLimit),
  };
}

/**
 * Calcula el puntaje y porcentaje de precisión de una sesión a partir de sus intentos únicos.
 */
export function calculateSessionSummary(
  attempts: readonly Pick<AttemptEntity, "isCorrect" | "elapsedMs">[],
  totalConfiguredQuestions?: number
): {
  answeredCount: number;
  correctCount: number;
  score: number;
  accuracy: number;
  totalElapsedMs: number;
} {
  const answeredCount = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const denominator =
    totalConfiguredQuestions && totalConfiguredQuestions > 0
      ? Math.max(answeredCount, totalConfiguredQuestions)
      : answeredCount;

  const accuracy =
    denominator > 0
      ? Number(((correctCount / denominator) * 100).toFixed(2))
      : 0;

  const totalElapsedMs = attempts.reduce(
    (acc, item) => acc + Math.max(0, item.elapsedMs || 0),
    0
  );

  return {
    answeredCount,
    correctCount,
    score: correctCount * 10,
    accuracy,
    totalElapsedMs,
  };
}

/**
 * Verifica que solo el propietario de la sesión pueda leerla, responder en ella o cerrarla.
 * Según docs/05-SEGURIDAD-RLS.md, ni otros usuarios ni administradores tienen acceso ordinario
 * a las sesiones o intentos privados de otro estudiante.
 */
export function canAccessQuizSession(
  actor: ActorContext | null,
  session: Pick<QuizSessionEntity, "userId">
): boolean {
  if (!actor || !actor.userId) {
    return false;
  }
  return session.userId === actor.userId;
}
