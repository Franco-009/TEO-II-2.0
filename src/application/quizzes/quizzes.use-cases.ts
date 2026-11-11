import { buildMistakeQuestionQueue } from "@/domain/attempts/attempts.rules";
import type { MistakeQuestionItem } from "@/domain/attempts/attempts.types";
import type { QuestionsRepository } from "@/domain/questions/questions.ports";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import type { QuizzesRepository } from "@/domain/quizzes/quizzes.ports";
import {
  calculateSessionSummary,
  canAccessQuizSession,
  evaluateQuestionAnswer,
  selectEligibleQuizQuestions,
} from "@/domain/quizzes/quizzes.rules";
import type {
  QuizResult,
  QuizSessionDetail,
  QuizSessionEntity,
  StartQuizInput,
  SubmitAnswerInput,
  SubmitAnswerOutput,
} from "@/domain/quizzes/quizzes.types";
import { canReadSubject } from "@/domain/subjects/subjects.rules";
import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import type { ActorContext } from "@/domain/subjects/subjects.types";

/**
 * Inicia una nueva sesión de cuestionario (`in_progress`) validando acceso a la materia,
 * seleccionando únicamente preguntas con `status === 'published'`, aplicando el filtro
 * de errores si `mode === 'mistakes'` y ordenándolas de forma reproducible con `seed`.
 */
export async function startQuizUseCase(params: {
  subjectsRepo: SubjectsRepository;
  questionsRepo: QuestionsRepository;
  quizzesRepo: QuizzesRepository;
  actor: ActorContext | null;
  input: StartQuizInput;
}): Promise<QuizResult<QuizSessionDetail>> {
  const { subjectsRepo, questionsRepo, quizzesRepo, actor, input } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para comenzar un cuestionario.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(input.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia seleccionada no existe.",
      },
    };
  }

  const subject = subjectRes.data;
  if (!canReadSubject(actor, subject)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_SUBJECT_ACCESS",
        message:
          "No tienes permiso para practicar sobre una materia privada de otro usuario.",
      },
    };
  }

  const questionsRes = await questionsRepo.listQuestionsBySubject(subject.id);
  if (!questionsRes.ok) {
    return {
      ok: false,
      error: {
        code: "NO_ELIGIBLE_QUESTIONS",
        message: questionsRes.error.message,
      },
    };
  }

  let mistakeQuestionIds: Set<string> | undefined;
  if (input.mode === "mistakes") {
    const attemptsRes = await quizzesRepo.listAttemptsByUser(
      actor.userId,
      subject.id
    );
    if (!attemptsRes.ok) {
      return attemptsRes;
    }

    const mistakeQueue = buildMistakeQuestionQueue({
      publishedQuestions: questionsRes.data,
      userAttempts: attemptsRes.data,
      userId: actor.userId,
      includeResolved: false,
    });
    mistakeQuestionIds = new Set(mistakeQueue.map((m) => m.question.id));
  }

  const seed =
    input.seed?.trim() ||
    `seed-${actor.userId}-${subject.id}-${Date.now().toString(36)}`;

  const selectedRes = selectEligibleQuizQuestions({
    questions: questionsRes.data,
    mode: input.mode,
    questionCount: input.questionCount,
    seed,
    topicId: input.topicId ?? null,
    mistakeQuestionIds,
  });

  if (!selectedRes.ok) {
    return selectedRes;
  }

  const selectedQuestions = selectedRes.data;

  const sessionRes = await quizzesRepo.createQuizSessionRecord({
    userId: actor.userId,
    subjectId: subject.id,
    mode: input.mode,
    settingsJson: {
      questionCount: selectedQuestions.length,
      seed,
      topicId: input.topicId ?? null,
      questionIds: selectedQuestions.map((q) => q.id),
    },
  });

  if (!sessionRes.ok) {
    return sessionRes;
  }

  return {
    ok: true,
    data: {
      session: sessionRes.data,
      questions: selectedQuestions,
      attempts: [],
    },
  };
}

/**
 * Evalúa determinísticamente una respuesta enviada y registra el intento de forma idempotente:
 * - Caso Imprescindible #9: bloquea si la sesión pertenece a otro usuario (`FORBIDDEN_SESSION_OWNER`)
 *   o si ya está cerrada (`SESSION_CLOSED`).
 * - Caso Imprescindible #6: rechaza IDs de opciones que no pertenezcan a la pregunta (`INVALID_OPTION_ID`).
 * - Caso Imprescindible #7: exige coincidencia exacta del conjunto en `multiple_select`.
 * - Idempotencia: si `(sessionId, questionId)` ya existe, devuelve el intento previo sin duplicar ni alterar el puntaje.
 */
export async function submitAnswerUseCase(params: {
  questionsRepo: QuestionsRepository;
  quizzesRepo: QuizzesRepository;
  actor: ActorContext | null;
  input: SubmitAnswerInput;
}): Promise<QuizResult<SubmitAnswerOutput>> {
  const { questionsRepo, quizzesRepo, actor, input } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para enviar una respuesta.",
      },
    };
  }

  const sessionRes = await quizzesRepo.findQuizSessionById(input.sessionId);
  if (!sessionRes.ok || !sessionRes.data) {
    return {
      ok: false,
      error: {
        code: "SESSION_NOT_FOUND",
        message: "La sesión de cuestionario no existe.",
      },
    };
  }

  const session = sessionRes.data;
  if (!canAccessQuizSession(actor, session)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_SESSION_OWNER",
        message:
          "Acceso denegado: no puedes enviar respuestas a una sesión de otro usuario.",
      },
    };
  }

  if (session.status !== "in_progress") {
    return {
      ok: false,
      error: {
        code: "SESSION_CLOSED",
        message:
          "No se pueden enviar respuestas a una sesión que ya fue cerrada o completada.",
      },
    };
  }

  const configuredIds = session.settingsJson?.questionIds ?? [];
  if (
    configuredIds.length > 0 &&
    !configuredIds.includes(input.questionId)
  ) {
    return {
      ok: false,
      error: {
        code: "QUESTION_NOT_IN_SESSION",
        message: "La pregunta enviada no forma parte de esta sesión activa.",
      },
    };
  }

  const questionRes = await questionsRepo.findQuestionById(input.questionId);
  if (
    !questionRes.ok ||
    !questionRes.data ||
    questionRes.data.status !== "published"
  ) {
    return {
      ok: false,
      error: {
        code: "QUESTION_NOT_IN_SESSION",
        message: "La pregunta solicitada no existe o no está publicada.",
      },
    };
  }

  const question = questionRes.data;

  // Evaluar determinísticamente la respuesta enviada
  const evalRes = evaluateQuestionAnswer(question, input.selectedOptionIds);
  if (!evalRes.ok) {
    return evalRes;
  }

  // Persistir intento de forma idempotente por (sessionId, questionId) capturando question.version
  const attemptRes = await quizzesRepo.recordAttemptIdempotent({
    sessionId: session.id,
    userId: actor.userId,
    questionId: question.id,
    selectedOptionIds: evalRes.data.selectedOptionIds,
    isCorrect: evalRes.data.isCorrect,
    elapsedMs: Math.max(0, Math.floor(input.elapsedMs ?? 0)),
    questionVersion: question.version,
  });

  if (!attemptRes.ok) {
    return attemptRes;
  }

  const { attempt, wasDuplicateRetry } = attemptRes.data;

  // Si fue un reintento idempotente con selección previa distinta, reconstruir la evaluación del intento original guardado
  const finalEvaluation = wasDuplicateRetry
    ? (() => {
        const storedEval = evaluateQuestionAnswer(
          question,
          attempt.responseJson.selectedOptionIds
        );
        return storedEval.ok ? storedEval.data : evalRes.data;
      })()
    : evalRes.data;

  // Recalcular score y accuracy parciales de la sesión
  const allAttemptsRes = await quizzesRepo.listAttemptsBySession(session.id);
  const allAttempts = allAttemptsRes.ok ? allAttemptsRes.data : [attempt];
  const summary = calculateSessionSummary(allAttempts, allAttempts.length);

  await quizzesRepo.updateQuizSessionProgress(session.id, {
    status: "in_progress",
    score: summary.score,
    accuracy: summary.accuracy,
    completedAt: null,
  });

  return {
    ok: true,
    data: {
      attempt,
      evaluation: finalEvaluation,
      sessionScore: summary.score,
      sessionAccuracy: summary.accuracy,
      wasDuplicateRetry,
    },
  };
}

/**
 * Cierra una sesión activa (`status = 'completed'`), consolidando su `score`, `accuracy` y `completedAt`.
 */
export async function completeQuizUseCase(params: {
  quizzesRepo: QuizzesRepository;
  actor: ActorContext | null;
  sessionId: string;
}): Promise<QuizResult<QuizSessionEntity>> {
  const { quizzesRepo, actor, sessionId } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para finalizar un cuestionario.",
      },
    };
  }

  const sessionRes = await quizzesRepo.findQuizSessionById(sessionId);
  if (!sessionRes.ok || !sessionRes.data) {
    return {
      ok: false,
      error: {
        code: "SESSION_NOT_FOUND",
        message: "La sesión no existe.",
      },
    };
  }

  const session = sessionRes.data;
  if (!canAccessQuizSession(actor, session)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_SESSION_OWNER",
        message: "No tienes permiso para cerrar la sesión de otro usuario.",
      },
    };
  }

  if (session.status === "completed") {
    return { ok: true, data: session };
  }

  if (session.status === "abandoned") {
    return {
      ok: false,
      error: {
        code: "SESSION_CLOSED",
        message: "La sesión ya fue abandonada previamente.",
      },
    };
  }

  const attemptsRes = await quizzesRepo.listAttemptsBySession(session.id);
  const attempts = attemptsRes.ok ? attemptsRes.data : [];
  const configuredCount =
    session.settingsJson?.questionIds?.length ||
    session.settingsJson?.questionCount ||
    attempts.length;

  const summary = calculateSessionSummary(attempts, configuredCount);

  return quizzesRepo.updateQuizSessionProgress(session.id, {
    status: "completed",
    score: summary.score,
    accuracy: summary.accuracy,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Obtiene el detalle completo de una sesión (sesión + preguntas en el orden exacto de la partida + intentos)
 * verificando que pertenezca al usuario autenticado.
 */
export async function getQuizSessionDetailsUseCase(params: {
  questionsRepo: QuestionsRepository;
  quizzesRepo: QuizzesRepository;
  actor: ActorContext | null;
  sessionId: string;
}): Promise<QuizResult<QuizSessionDetail>> {
  const { questionsRepo, quizzesRepo, actor, sessionId } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para ver esta partida.",
      },
    };
  }

  const sessionRes = await quizzesRepo.findQuizSessionById(sessionId);
  if (!sessionRes.ok || !sessionRes.data) {
    return {
      ok: false,
      error: {
        code: "SESSION_NOT_FOUND",
        message: "La sesión solicitada no existe.",
      },
    };
  }

  const session = sessionRes.data;
  if (!canAccessQuizSession(actor, session)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_SESSION_OWNER",
        message:
          "Acceso denegado: no puedes consultar la sesión privada de otro usuario.",
      },
    };
  }

  const [subjectQuestionsRes, attemptsRes] = await Promise.all([
    questionsRepo.listQuestionsBySubject(session.subjectId),
    quizzesRepo.listAttemptsBySession(session.id),
  ]);

  const allSubjectQuestions = subjectQuestionsRes.ok
    ? subjectQuestionsRes.data
    : [];
  const byId = new Map(allSubjectQuestions.map((q) => [q.id, q] as const));

  const orderedIds = session.settingsJson?.questionIds ?? [];
  const orderedQuestions: QuestionEntity[] =
    orderedIds.length > 0
      ? orderedIds
          .map((id) => byId.get(id))
          .filter((q): q is QuestionEntity => Boolean(q))
      : allSubjectQuestions.filter((q) => q.status === "published");

  return {
    ok: true,
    data: {
      session,
      questions: orderedQuestions,
      attempts: attemptsRes.ok ? attemptsRes.data : [],
    },
  };
}

/**
 * Recupera la cola de preguntas falladas del usuario autenticado para el Modo Repaso de Errores (`/app/review`),
 * sin borrar el historial de intentos previos.
 */
export async function getMistakeQuestionsUseCase(params: {
  subjectsRepo: SubjectsRepository;
  questionsRepo: QuestionsRepository;
  quizzesRepo: QuizzesRepository;
  actor: ActorContext | null;
  subjectId?: string;
}): Promise<QuizResult<MistakeQuestionItem[]>> {
  const { subjectsRepo, questionsRepo, quizzesRepo, actor, subjectId } =
    params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para consultar tu repaso de errores.",
      },
    };
  }

  const attemptsRes = await quizzesRepo.listAttemptsByUser(
    actor.userId,
    subjectId
  );
  if (!attemptsRes.ok) {
    return attemptsRes;
  }

  const failedQuestionIds = new Set(
    attemptsRes.data.filter((a) => !a.isCorrect).map((a) => a.questionId)
  );

  if (failedQuestionIds.size === 0) {
    return { ok: true, data: [] };
  }

  const [mySubjectsRes, pubSubjectsRes] = await Promise.all([
    subjectsRepo.listByOwner(actor.userId),
    subjectsRepo.listPublicPublished(),
  ]);

  const accessibleSubjects = [
    ...(mySubjectsRes.ok ? mySubjectsRes.data : []),
    ...(pubSubjectsRes.ok ? pubSubjectsRes.data : []),
  ];

  const targetSubjects = subjectId
    ? accessibleSubjects.filter((s) => s.id === subjectId)
    : accessibleSubjects;

  const publishedQuestions: QuestionEntity[] = [];
  const seenIds = new Set<string>();

  for (const sub of targetSubjects) {
    const qRes = await questionsRepo.listQuestionsBySubject(sub.id);
    if (qRes.ok) {
      for (const q of qRes.data) {
        if (q.status === "published" && !seenIds.has(q.id)) {
          seenIds.add(q.id);
          publishedQuestions.push(q);
        }
      }
    }
  }

  const queue = buildMistakeQuestionQueue({
    publishedQuestions,
    userAttempts: attemptsRes.data,
    userId: actor.userId,
    includeResolved: false,
  });

  return {
    ok: true,
    data: queue,
  };
}
