import type { AttemptEntity } from "@/domain/attempts/attempts.types";
import {
  buildDeterministicXpEventKey,
  calculateConsecutiveStreak,
  calculateUserLevel,
  DAILY_GOAL_QUESTIONS_DEFAULT,
   type DeterministicEventKeyInput,
  getXpPointsForEventType,
  normalizeDateString,
} from "@/domain/gamification/gamification.rules";
import type {
  AwardXpOutput,
  XpEventEntity,
} from "@/domain/gamification/gamification.types";
import type { ProgressRepository } from "@/domain/progress/progress.ports";
import {
  aggregateSubjectProgressStats,
  aggregateTopicProgressStats,
  classifyTopicMastery,
} from "@/domain/progress/progress.rules";
import type {
  ProgressResult,
  SessionXpBreakdown,
  UserProgressOverview,
} from "@/domain/progress/progress.types";
import type { QuestionsRepository } from "@/domain/questions/questions.ports";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import type { QuizzesRepository } from "@/domain/quizzes/quizzes.ports";
import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import type { ActorContext } from "@/domain/subjects/subjects.types";
import type { TopicsRepository } from "@/domain/topics/topics.ports";
import type { TopicEntity } from "@/domain/topics/topics.types";

/**
 * Otorga XP de forma determinista e idempotente a partir de los parámetros de un hito.
 * Caso Imprescindible #8: Cualquier reintento con los mismos parámetros genera el mismo `event_key`
 * y devuelve `wasDuplicate: true` sin duplicar puntos.
 */
export async function awardIdempotentXpUseCase(params: {
  progressRepo: ProgressRepository;
  userId: string;
  keyInput: DeterministicEventKeyInput;
  referenceId?: string | null;
}): Promise<ProgressResult<AwardXpOutput>> {
  const { progressRepo, userId, keyInput, referenceId } = params;

  if (!userId.trim()) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Se requiere un usuario válido para otorgar XP.",
      },
    };
  }

  let eventKey: string;
  try {
    eventKey = buildDeterministicXpEventKey(keyInput);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Parámetros inválidos para generar event_key.",
      },
    };
  }

  const points = getXpPointsForEventType(keyInput.type);

  return progressRepo.awardXpEventIdempotent({
    userId,
    eventKey,
    eventType: keyInput.type,
    points,
    referenceId: referenceId ?? null,
  });
}

/**
 * Registra la actividad diaria y evalúa todos los hitos de gamificación derivados de responder
 * una pregunta en una sesión activa:
 * 1. `+10 XP` si la respuesta es correcta (`attempt_correct:{sessionId}:{questionId}`).
 * 2. `+30 XP` si con esta respuesta el usuario alcanza el objetivo diario (`daily_goal:{userId}:{YYYY-MM-DD}`).
 * 3. `+50 XP` si el tema de la pregunta alcanza estado `mastered` (`>= 5` intentos y `>= 80%` precisión).
 */
export async function recordAttemptGamificationUseCase(params: {
  progressRepo: ProgressRepository;
  quizzesRepo: QuizzesRepository;
  questionsRepo: QuestionsRepository;
  userId: string;
  sessionId: string;
  question: QuestionEntity;
  attempt: AttemptEntity;
  wasDuplicateRetry: boolean;
  activityDate?: string | Date;
  dailyGoalQuestions?: number;
}): Promise<
  ProgressResult<{
    awardedEvents: XpEventEntity[];
    totalNewPoints: number;
  }>
> {
  const {
    progressRepo,
    quizzesRepo,
    questionsRepo,
    userId,
    sessionId,
    question,
    attempt,
    wasDuplicateRetry,
    activityDate = new Date(),
    dailyGoalQuestions = DAILY_GOAL_QUESTIONS_DEFAULT,
  } = params;

  const dateStr = normalizeDateString(activityDate);
  const awardedEvents: XpEventEntity[] = [];
  let totalNewPoints = 0;

  // 1. Si no es un reintento duplicado de red, incrementar contadores de actividad diaria
  let questionsToday = 0;
  if (!wasDuplicateRetry) {
    const minutesDelta =
      attempt.elapsedMs > 0
        ? Math.max(1, Math.round(attempt.elapsedMs / 60000))
        : 1;

    const dailyRes = await progressRepo.recordDailyActivityIncrement({
      userId,
      activityDate: dateStr,
      questionsAnsweredDelta: 1,
      correctAnswersDelta: attempt.isCorrect ? 1 : 0,
      minutesStudiedDelta: minutesDelta,
    });

    if (dailyRes.ok) {
      questionsToday = dailyRes.data.questionsAnswered;
    }
  } else {
    const listDaily = await progressRepo.listDailyActivityByUser(userId);
    if (listDaily.ok) {
      const todayEntry = listDaily.data.find((d) => d.activityDate === dateStr);
      questionsToday = todayEntry?.questionsAnswered ?? 0;
    }
  }

  // 2. Si acertó la pregunta -> +10 XP idempotente por (sessionId, questionId)
  if (attempt.isCorrect) {
    const correctXpRes = await awardIdempotentXpUseCase({
      progressRepo,
      userId,
      keyInput: {
        type: "attempt_correct",
        sessionId,
        questionId: question.id,
      },
      referenceId: sessionId,
    });

    if (correctXpRes.ok) {
      awardedEvents.push(correctXpRes.data.event);
      if (!correctXpRes.data.wasDuplicate) {
        totalNewPoints += correctXpRes.data.event.points;
      }
    }
  }

  // 3. Si alcanzó o superó el objetivo diario -> +30 XP idempotente por (userId, dateStr)
  if (questionsToday >= dailyGoalQuestions) {
    const dailyGoalXpRes = await awardIdempotentXpUseCase({
      progressRepo,
      userId,
      keyInput: {
        type: "daily_goal_reached",
        userId,
        activityDate: dateStr,
      },
      referenceId: sessionId,
    });

    if (dailyGoalXpRes.ok) {
      awardedEvents.push(dailyGoalXpRes.data.event);
      if (!dailyGoalXpRes.data.wasDuplicate) {
        totalNewPoints += dailyGoalXpRes.data.event.points;
      }
    }
  }

  // 4. Evaluar si el tema de la pregunta alcanzó estado `mastered` (>= 5 intentos y >= 80% precisión)
  const [userAttemptsRes, topicQuestionsRes] = await Promise.all([
    quizzesRepo.listAttemptsByUser(userId),
    questionsRepo.listQuestionsByTopic(question.topicId),
  ]);

  if (userAttemptsRes.ok && topicQuestionsRes.ok) {
    const topicQuestionIds = new Set(topicQuestionsRes.data.map((q) => q.id));
    topicQuestionIds.add(question.id);

    const topicAttempts = userAttemptsRes.data.filter(
      (a) => a.userId === userId && topicQuestionIds.has(a.questionId)
    );

    const attemptsCount = topicAttempts.length;
    const correctCount = topicAttempts.filter((a) => a.isCorrect).length;
    const accuracy =
      attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : 0;

    const masteryStatus = classifyTopicMastery(attemptsCount, accuracy);
    if (masteryStatus === "mastered") {
      const masteredXpRes = await awardIdempotentXpUseCase({
        progressRepo,
        userId,
        keyInput: {
          type: "topic_mastered",
          userId,
          topicId: question.topicId,
        },
        referenceId: question.topicId,
      });

      if (masteredXpRes.ok) {
        awardedEvents.push(masteredXpRes.data.event);
        if (!masteredXpRes.data.wasDuplicate) {
          totalNewPoints += masteredXpRes.data.event.points;
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      awardedEvents,
      totalNewPoints,
    },
  };
}

/**
 * Registra el cierre de un cuestionario otorgando `+20 XP` de forma idempotente (`quiz_completed:{sessionId}`)
 * y actualizando el contador `quizzesCompleted` de la actividad diaria si es el primer cierre.
 */
export async function recordQuizCompletionGamificationUseCase(params: {
  progressRepo: ProgressRepository;
  userId: string;
  sessionId: string;
  wasAlreadyCompleted: boolean;
  activityDate?: string | Date;
}): Promise<ProgressResult<AwardXpOutput>> {
  const {
    progressRepo,
    userId,
    sessionId,
    wasAlreadyCompleted,
    activityDate = new Date(),
  } = params;

  const dateStr = normalizeDateString(activityDate);

  if (!wasAlreadyCompleted) {
    await progressRepo.recordDailyActivityIncrement({
      userId,
      activityDate: dateStr,
      quizzesCompletedDelta: 1,
    });
  }

  return awardIdempotentXpUseCase({
    progressRepo,
    userId,
    keyInput: {
      type: "quiz_completed",
      sessionId,
    },
    referenceId: sessionId,
  });
}

/**
 * Obtiene el desglose de puntos XP ganados en una sesión específica para mostrar en `/app/sessions/[id]/result`.
 */
export async function getSessionXpBreakdownUseCase(params: {
  progressRepo: ProgressRepository;
  userId: string;
  sessionId: string;
}): Promise<ProgressResult<SessionXpBreakdown>> {
  const { progressRepo, userId, sessionId } = params;
  const eventsRes = await progressRepo.listXpEventsByUser(userId);
  if (!eventsRes.ok) {
    return eventsRes;
  }

  const sessionEvents = eventsRes.data.filter(
    (ev) =>
      ev.referenceId === sessionId ||
      ev.eventKey.startsWith(`attempt_correct:${sessionId}:`) ||
      ev.eventKey === `quiz_completed:${sessionId}`
  );

  let correctAnswersXp = 0;
  let completionBonusXp = 0;
  let dailyGoalBonusXp = 0;
  let masteredTopicsBonusXp = 0;

  for (const ev of sessionEvents) {
    if (ev.eventType === "attempt_correct") {
      correctAnswersXp += ev.points;
    } else if (ev.eventType === "quiz_completed") {
      completionBonusXp += ev.points;
    } else if (ev.eventType === "daily_goal_reached") {
      dailyGoalBonusXp += ev.points;
    } else if (ev.eventType === "topic_mastered") {
      masteredTopicsBonusXp += ev.points;
    }
  }

  const totalSessionXp =
    correctAnswersXp +
    completionBonusXp +
    dailyGoalBonusXp +
    masteredTopicsBonusXp;

  return {
    ok: true,
    data: {
      sessionId,
      totalSessionXp,
      correctAnswersXp,
      completionBonusXp,
      dailyGoalBonusXp,
      masteredTopicsBonusXp,
      events: sessionEvents,
    },
  };
}

/**
 * Obtiene el panorama completo de progreso estadístico y gamificación del usuario autenticado (`GetUserProgress`).
 * Garantiza aislamiento estricto: solo computa intentos, eventos XP y actividad diaria de `actor.userId`.
 */
export async function getUserProgressUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  questionsRepo: QuestionsRepository;
  quizzesRepo: QuizzesRepository;
  progressRepo: ProgressRepository;
  actor: ActorContext | null;
  referenceDate?: string | Date;
  dailyGoalQuestions?: number;
}): Promise<ProgressResult<UserProgressOverview>> {
  const {
    subjectsRepo,
    topicsRepo,
    questionsRepo,
    quizzesRepo,
    progressRepo,
    actor,
    referenceDate = new Date(),
    dailyGoalQuestions = DAILY_GOAL_QUESTIONS_DEFAULT,
  } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para consultar tu progreso.",
      },
    };
  }

  const userId = actor.userId;
  const todayStr = normalizeDateString(referenceDate);

  const [
    mySubjectsRes,
    pubSubjectsRes,
    userAttemptsRes,
    xpEventsRes,
    dailyActivityRes,
  ] = await Promise.all([
    subjectsRepo.listByOwner(userId),
    subjectsRepo.listPublicPublished(),
    quizzesRepo.listAttemptsByUser(userId),
    progressRepo.listXpEventsByUser(userId),
    progressRepo.listDailyActivityByUser(userId),
  ]);

  const mySubjects = mySubjectsRes.ok ? mySubjectsRes.data : [];
  const pubSubjects = pubSubjectsRes.ok ? pubSubjectsRes.data : [];

  // Deduplicar materias accesibles (priorizando las propias)
  const subjectsMap = new Map(mySubjects.map((s) => [s.id, s] as const));
  for (const pub of pubSubjects) {
    if (!subjectsMap.has(pub.id)) {
      subjectsMap.set(pub.id, pub);
    }
  }
  const accessibleSubjects = Array.from(subjectsMap.values());

  // Cargar temas y preguntas de las materias accesibles
  const allTopics: TopicEntity[] = [];
  const allQuestions: QuestionEntity[] = [];

  for (const subject of accessibleSubjects) {
    const [tRes, qRes] = await Promise.all([
      topicsRepo.listBySubject(subject.id),
      questionsRepo.listQuestionsBySubject(subject.id),
    ]);
    if (tRes.ok) {
      allTopics.push(...tRes.data);
    }
    if (qRes.ok) {
      allQuestions.push(...qRes.data);
    }
  }

  // Filtrar estrictamente los datos de este usuario
  const userAttempts = (userAttemptsRes.ok ? userAttemptsRes.data : []).filter(
    (a) => a.userId === userId
  );
  const userXpEvents = (xpEventsRes.ok ? xpEventsRes.data : []).filter(
    (ev) => ev.userId === userId
  );
  const userDailyActivities = (
    dailyActivityRes.ok ? dailyActivityRes.data : []
  ).filter((d) => d.userId === userId);

  // Calcular XP total y nivel
  const totalXp = userXpEvents.reduce((sum, ev) => sum + ev.points, 0);
  const levelProgress = calculateUserLevel(totalXp);

  // Calcular racha de días consecutivos con actividad (questionsAnswered > 0)
  const activeDates = userDailyActivities
    .filter((d) => d.questionsAnswered > 0)
    .map((d) => d.activityDate);
  const streak = calculateConsecutiveStreak(activeDates, todayStr);

  // Actividad de hoy
  const todayActivity = userDailyActivities.find(
    (d) => d.activityDate === todayStr
  );
  const dailyAnsweredQuestions = todayActivity?.questionsAnswered ?? 0;
  const minutesStudiedToday = todayActivity?.minutesStudied ?? 0;
  const dailyGoalPercent = Math.min(
    100,
    Math.round(
      (dailyAnsweredQuestions / Math.max(1, dailyGoalQuestions)) * 100
    )
  );
  const dailyGoalReached = dailyAnsweredQuestions >= dailyGoalQuestions;

  // Estadísticas por tema y por materia
  const topicsStats = aggregateTopicProgressStats({
    userId,
    subjects: accessibleSubjects,
    topics: allTopics,
    questions: allQuestions,
    attempts: userAttempts,
  });

  const subjectsStats = aggregateSubjectProgressStats({
    subjects: mySubjects.length > 0 ? mySubjects : accessibleSubjects,
    topicsStats,
  });

  const totalAttemptsCount = userAttempts.length;
  const totalCorrectCount = userAttempts.filter((a) => a.isCorrect).length;
  const globalAccuracy =
    totalAttemptsCount > 0
      ? Math.round((totalCorrectCount / totalAttemptsCount) * 100)
      : 0;

  const masteredTopicsCount = topicsStats.filter((t) => t.isMastered).length;
  const evaluatedTopicsCount = topicsStats.length;

  const weakTopics = topicsStats
    .filter((t) => t.needsReinforcement || t.masteryStatus === "needs_review")
    .sort((a, b) => a.accuracy - b.accuracy);

  return {
    ok: true,
    data: {
      userId,
      levelProgress,
      streak,
      dailyGoalQuestions,
      dailyAnsweredQuestions,
      dailyGoalPercent,
      dailyGoalReached,
      minutesStudiedToday,
      totalAttemptsCount,
      totalCorrectCount,
      globalAccuracy,
      masteredTopicsCount,
      evaluatedTopicsCount,
      topicsStats,
      weakTopics,
      subjectsStats,
      recentXpEvents: userXpEvents.slice(0, 10),
    },
  };
}
