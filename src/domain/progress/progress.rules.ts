import { APP_CONFIG } from "@/config/env";
import type { AttemptEntity } from "@/domain/attempts/attempts.types";
import type {
  SubjectProgressStats,
  TopicMasteryStatus,
  TopicProgressStats,
} from "@/domain/progress/progress.types";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";
import type { TopicEntity } from "@/domain/topics/topics.types";

export const MASTERY_MIN_ATTEMPTS = APP_CONFIG.masteryMinAttempts; // 5
export const MASTERY_MIN_ACCURACY = 80;
export const IN_PROGRESS_MIN_ACCURACY = 60;

/**
 * Clasifica el nivel de dominio de un tema exigiendo siempre una muestra mínima
 * de `minAttempts` (`>= 5`) antes de poder marcarlo como `mastered`.
 *
 * - Si `attemptsCount < minAttempts` (ej. 1..4 intentos aunque tenga 100%): `'insufficient_sample'`
 * - Si `attemptsCount >= minAttempts` y `accuracy >= 80`: `'mastered'`
 * - Si `attemptsCount >= minAttempts` y `accuracy >= 60`: `'in_progress'`
 * - Si `attemptsCount >= minAttempts` y `accuracy < 60`: `'needs_review'`
 */
export function classifyTopicMastery(
  attemptsCount: number,
  accuracy: number,
  minAttempts: number = MASTERY_MIN_ATTEMPTS,
  minMasteryAccuracy: number = MASTERY_MIN_ACCURACY
): TopicMasteryStatus {
  const safeAttempts = Math.max(0, Math.floor(attemptsCount));
  const safeAccuracy = Math.max(0, Math.min(100, Math.round(accuracy)));

  if (safeAttempts < minAttempts) {
    return "insufficient_sample";
  }

  if (safeAccuracy >= minMasteryAccuracy) {
    return "mastered";
  }

  if (safeAccuracy >= IN_PROGRESS_MIN_ACCURACY) {
    return "in_progress";
  }

  return "needs_review";
}

/**
 * Calcula las estadísticas por tema exclusivamente para los intentos del usuario (`userId`),
 * aplicando la regla de muestra mínima (`>= 5` intentos) y detectando temas débiles.
 */
export function aggregateTopicProgressStats(params: {
  userId: string;
  subjects: SubjectEntity[];
  topics: TopicEntity[];
  questions: QuestionEntity[];
  attempts: AttemptEntity[];
  minAttempts?: number;
  minMasteryAccuracy?: number;
}): TopicProgressStats[] {
  const {
    userId,
    subjects,
    topics,
    questions,
    attempts,
    minAttempts = MASTERY_MIN_ATTEMPTS,
    minMasteryAccuracy = MASTERY_MIN_ACCURACY,
  } = params;

  const subjectTitleById = new Map<string, string>(
    subjects.map((s) => [s.id, s.title] as const)
  );

  const topicIdByQuestionId = new Map<string, string>(
    questions.map((q) => [q.id, q.topicId] as const)
  );

  // Filtrar estrictamente los intentos que pertenecen al usuario solicitado
  const userAttempts = attempts.filter((a) => a.userId === userId);

  const countsByTopicId = new Map<
    string,
    { attemptsCount: number; correctCount: number }
  >();

  for (const attempt of userAttempts) {
    const topicId = topicIdByQuestionId.get(attempt.questionId);
    if (!topicId) continue;

    const current = countsByTopicId.get(topicId) ?? {
      attemptsCount: 0,
      correctCount: 0,
    };
    current.attemptsCount += 1;
    if (attempt.isCorrect) {
      current.correctCount += 1;
    }
    countsByTopicId.set(topicId, current);
  }

  return topics.map((topic) => {
    const recorded = countsByTopicId.get(topic.id);
    const attemptsCount = recorded ? recorded.attemptsCount : 0;
    const correctCount = recorded ? recorded.correctCount : 0;
    const accuracy =
      attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : 0;

    const masteryStatus = classifyTopicMastery(
      attemptsCount,
      accuracy,
      minAttempts,
      minMasteryAccuracy
    );
    const hasMinSample = attemptsCount >= minAttempts;
    const isMastered = masteryStatus === "mastered";
    const needsReinforcement =
      attemptsCount > 0 && accuracy < minMasteryAccuracy;

    return {
      topicId: topic.id,
      subjectId: topic.subjectId,
      subjectTitle: subjectTitleById.get(topic.subjectId) ?? "Materia",
      topicTitle: topic.title,
      attemptsCount,
      correctCount,
      accuracy,
      masteryStatus,
      hasMinSample,
      isMastered,
      needsReinforcement,
    };
  });
}

/**
 * Agrega estadísticas de intentos, precisión y temas dominados por materia.
 */
export function aggregateSubjectProgressStats(params: {
  subjects: SubjectEntity[];
  topicsStats: TopicProgressStats[];
}): SubjectProgressStats[] {
  const { subjects, topicsStats } = params;

  const topicsBySubjectId = new Map<string, TopicProgressStats[]>();
  for (const tStat of topicsStats) {
    const list = topicsBySubjectId.get(tStat.subjectId) ?? [];
    list.push(tStat);
    topicsBySubjectId.set(tStat.subjectId, list);
  }

  return subjects.map((subject) => {
    const sTopics = topicsBySubjectId.get(subject.id) ?? [];
    const attemptsCount = sTopics.reduce((sum, t) => sum + t.attemptsCount, 0);
    const correctCount = sTopics.reduce((sum, t) => sum + t.correctCount, 0);
    const masteredTopicsCount = sTopics.filter((t) => t.isMastered).length;
    const accuracy =
      attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : 0;

    return {
      subjectId: subject.id,
      subjectTitle: subject.title,
      visibility: subject.visibility,
      status: subject.status,
      topicsCount: sTopics.length || subject.topicsCount || 0,
      masteredTopicsCount,
      questionsCount: subject.questionsCount ?? 0,
      documentsCount: subject.documentsCount ?? 0,
      attemptsCount,
      correctCount,
      accuracy,
      updatedAt: subject.updatedAt,
    };
  });
}
