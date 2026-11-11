import type { QuestionEntity } from "@/domain/questions/questions.types";
import type { AttemptEntity, MistakeQuestionItem } from "./attempts.types";

/**
 * Construye la cola del Modo Repaso de Errores (mistakes) para un usuario sin borrar el historial:
 * - Solo incluye preguntas en estado `published`.
 * - Selecciona preguntas donde el usuario registra intentos fallidos (`isCorrect === false`)
 *   y cuyo último intento cronológico sigue siendo incorrecto (o bien todas las preguntas con fallos
 *   cuando `includeResolved` es `true`).
 * - Ordena priorizando las que tienen más fallos acumulados y error más reciente.
 */
export function buildMistakeQuestionQueue(params: {
  publishedQuestions: QuestionEntity[];
  userAttempts: AttemptEntity[];
  userId: string;
  includeResolved?: boolean;
}): MistakeQuestionItem[] {
  const {
    publishedQuestions,
    userAttempts,
    userId,
    includeResolved = false,
  } = params;

  const ownAttempts = userAttempts
    .filter((a) => a.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
    );

  const statsByQuestion = new Map<
    string,
    {
      failedCount: number;
      lastFailedAt: string;
      latestIsCorrect: boolean;
    }
  >();

  for (const attempt of ownAttempts) {
    const current = statsByQuestion.get(attempt.questionId);
    if (!current) {
      statsByQuestion.set(attempt.questionId, {
        failedCount: attempt.isCorrect ? 0 : 1,
        lastFailedAt: attempt.isCorrect ? "" : attempt.answeredAt,
        latestIsCorrect: attempt.isCorrect,
      });
    } else if (!attempt.isCorrect) {
      current.failedCount += 1;
      if (!current.lastFailedAt) {
        current.lastFailedAt = attempt.answeredAt;
      }
    }
  }

  const queue: MistakeQuestionItem[] = [];

  for (const question of publishedQuestions) {
    if (question.status !== "published") continue;
    const stats = statsByQuestion.get(question.id);
    if (!stats || stats.failedCount === 0) continue;

    if (!includeResolved && stats.latestIsCorrect) {
      continue;
    }

    queue.push({
      question,
      failedAttemptsCount: stats.failedCount,
      lastFailedAt: stats.lastFailedAt,
      lastAttemptIsCorrect: stats.latestIsCorrect,
    });
  }

  return queue.sort((a, b) => {
    if (b.failedAttemptsCount !== a.failedAttemptsCount) {
      return b.failedAttemptsCount - a.failedAttemptsCount;
    }
    return (
      new Date(b.lastFailedAt).getTime() - new Date(a.lastFailedAt).getTime()
    );
  });
}
