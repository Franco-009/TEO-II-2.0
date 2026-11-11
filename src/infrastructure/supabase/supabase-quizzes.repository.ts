import type { AttemptEntity } from "@/domain/attempts/attempts.types";
import type { QuizMode } from "@/domain/models/studyplay";
import type { QuizzesRepository } from "@/domain/quizzes/quizzes.ports";
import type {
  QuizResult,
  QuizSessionEntity,
  QuizSessionSettings,
  QuizSessionStatus,
} from "@/domain/quizzes/quizzes.types";
import { defaultInMemoryCatalogStore } from "./in-memory-catalog.store";
import { createServerSupabaseClient } from "./server-client";

interface QuizSessionRow {
  id: string;
  user_id: string;
  subject_id: string;
  mode: QuizMode;
  settings_json: QuizSessionSettings;
  status: QuizSessionStatus;
  started_at: string;
  completed_at: string | null;
  score: number;
  accuracy: number | string;
}

interface AttemptRow {
  id: string;
  session_id: string;
  user_id: string;
  question_id: string;
  response_json: { selectedOptionIds?: string[] };
  is_correct: boolean;
  elapsed_ms: number;
  answered_at: string;
  question_version: number;
}

function mapQuizSessionRow(row: QuizSessionRow): QuizSessionEntity {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    mode: row.mode,
    settingsJson: row.settings_json ?? {
      questionCount: 10,
      seed: "default-seed",
      topicId: null,
      questionIds: [],
    },
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    score: Number(row.score ?? 0),
    accuracy: Number(row.accuracy ?? 0),
  };
}

function mapAttemptRow(row: AttemptRow): AttemptEntity {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    questionId: row.question_id,
    responseJson: {
      selectedOptionIds: Array.isArray(row.response_json?.selectedOptionIds)
        ? row.response_json.selectedOptionIds
        : [],
    },
    isCorrect: Boolean(row.is_correct),
    elapsedMs: Number(row.elapsed_ms ?? 0),
    answeredAt: row.answered_at,
    questionVersion: Number(row.question_version ?? 1),
  };
}

const SESSION_SELECT_COLUMNS =
  "id, user_id, subject_id, mode, settings_json, status, started_at, completed_at, score, accuracy";

const ATTEMPT_SELECT_COLUMNS =
  "id, session_id, user_id, question_id, response_json, is_correct, elapsed_ms, answered_at, question_version";

export class SupabaseQuizzesRepository implements QuizzesRepository {
  async createQuizSessionRecord(params: {
    userId: string;
    subjectId: string;
    mode: QuizMode;
    settingsJson: QuizSessionSettings;
  }): Promise<QuizResult<QuizSessionEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.createQuizSessionRecord(params);
    }

    const { data, error } = await supabase
      .from("quiz_sessions")
      .insert({
        user_id: params.userId,
        subject_id: params.subjectId,
        mode: params.mode,
        settings_json: params.settingsJson,
        status: "in_progress",
      })
      .select(SESSION_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN_SUBJECT_ACCESS",
          message: error?.message ?? "No se pudo crear la sesión de juego.",
        },
      };
    }

    return {
      ok: true,
      data: mapQuizSessionRow(data as unknown as QuizSessionRow),
    };
  }

  async findQuizSessionById(
    sessionId: string
  ): Promise<QuizResult<QuizSessionEntity | null>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.findQuizSessionById(sessionId);
    }

    const { data, error } = await supabase
      .from("quiz_sessions")
      .select(SESSION_SELECT_COLUMNS)
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: { code: "SESSION_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: data ? mapQuizSessionRow(data as unknown as QuizSessionRow) : null,
    };
  }

  async listQuizSessionsByUser(
    userId: string
  ): Promise<QuizResult<QuizSessionEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listQuizSessionsByUser(userId);
    }

    const { data, error } = await supabase
      .from("quiz_sessions")
      .select(SESSION_SELECT_COLUMNS)
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: { code: "SESSION_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: (data as unknown as QuizSessionRow[]).map(mapQuizSessionRow),
    };
  }

  async updateQuizSessionProgress(
    sessionId: string,
    params: {
      status: QuizSessionStatus;
      score: number;
      accuracy: number;
      completedAt: string | null;
    }
  ): Promise<QuizResult<QuizSessionEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.updateQuizSessionProgress(
        sessionId,
        params
      );
    }

    const { data, error } = await supabase
      .from("quiz_sessions")
      .update({
        status: params.status,
        score: params.score,
        accuracy: params.accuracy,
        completed_at: params.completedAt,
      })
      .eq("id", sessionId)
      .select(SESSION_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "SESSION_CLOSED",
          message:
            error?.message ?? "No se pudo actualizar el progreso de la sesión.",
        },
      };
    }

    return {
      ok: true,
      data: mapQuizSessionRow(data as unknown as QuizSessionRow),
    };
  }

  async recordAttemptIdempotent(params: {
    sessionId: string;
    userId: string;
    questionId: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
    elapsedMs: number;
    questionVersion: number;
  }): Promise<
    QuizResult<{
      attempt: AttemptEntity;
      wasDuplicateRetry: boolean;
    }>
  > {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.recordAttemptIdempotent(params);
    }

    // 1. Verificar primero si ya existe intento para (session_id, question_id)
    const { data: existingData } = await supabase
      .from("attempts")
      .select(ATTEMPT_SELECT_COLUMNS)
      .eq("session_id", params.sessionId)
      .eq("question_id", params.questionId)
      .maybeSingle();

    if (existingData) {
      return {
        ok: true,
        data: {
          attempt: mapAttemptRow(existingData as unknown as AttemptRow),
          wasDuplicateRetry: true,
        },
      };
    }

    // 2. Insertar nuevo intento
    const { data, error } = await supabase
      .from("attempts")
      .insert({
        session_id: params.sessionId,
        user_id: params.userId,
        question_id: params.questionId,
        response_json: { selectedOptionIds: params.selectedOptionIds },
        is_correct: params.isCorrect,
        elapsed_ms: params.elapsedMs,
        question_version: params.questionVersion,
      })
      .select(ATTEMPT_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "SESSION_CLOSED",
          message: error?.message ?? "No se pudo registrar el intento.",
        },
      };
    }

    return {
      ok: true,
      data: {
        attempt: mapAttemptRow(data as unknown as AttemptRow),
        wasDuplicateRetry: false,
      },
    };
  }

  async listAttemptsBySession(
    sessionId: string
  ): Promise<QuizResult<AttemptEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listAttemptsBySession(sessionId);
    }

    const { data, error } = await supabase
      .from("attempts")
      .select(ATTEMPT_SELECT_COLUMNS)
      .eq("session_id", sessionId)
      .order("answered_at", { ascending: true });

    if (error) {
      return {
        ok: false,
        error: { code: "SESSION_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: (data as unknown as AttemptRow[]).map(mapAttemptRow),
    };
  }

  async listAttemptsByUser(
    userId: string,
    subjectId?: string
  ): Promise<QuizResult<AttemptEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listAttemptsByUser(userId, subjectId);
    }

    const { data, error } = await supabase
      .from("attempts")
      .select(ATTEMPT_SELECT_COLUMNS)
      .eq("user_id", userId)
      .order("answered_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: { code: "SESSION_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: (data as unknown as AttemptRow[]).map(mapAttemptRow),
    };
  }
}
