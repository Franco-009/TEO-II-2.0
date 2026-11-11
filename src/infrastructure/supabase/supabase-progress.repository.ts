import { normalizeDateString } from "@/domain/gamification/gamification.rules";
import type {
  AwardXpInput,
  AwardXpOutput,
  XpEventEntity,
  XpEventType,
} from "@/domain/gamification/gamification.types";
import type { ProgressRepository } from "@/domain/progress/progress.ports";
import type {
  DailyActivityEntity,
  ProgressResult,
  RecordDailyActivityInput,
} from "@/domain/progress/progress.types";
import { defaultInMemoryCatalogStore } from "./in-memory-catalog.store";
import { createServerSupabaseClient } from "./server-client";

interface XpEventRow {
  id: string;
  user_id: string;
  event_key: string;
  event_type: XpEventType;
  points: number;
  reference_id: string | null;
  created_at: string;
}

interface DailyActivityRow {
  id: string;
  user_id: string;
  activity_date: string;
  questions_answered: number;
  correct_answers: number;
  quizzes_completed: number;
  minutes_studied: number;
  updated_at: string;
}

function mapXpEventRow(row: XpEventRow): XpEventEntity {
  return {
    id: row.id,
    userId: row.user_id,
    eventKey: row.event_key,
    eventType: row.event_type,
    points: Number(row.points ?? 0),
    referenceId: row.reference_id ?? null,
    createdAt: row.created_at,
  };
}

function mapDailyActivityRow(row: DailyActivityRow): DailyActivityEntity {
  return {
    id: row.id,
    userId: row.user_id,
    activityDate: normalizeDateString(row.activity_date),
    questionsAnswered: Number(row.questions_answered ?? 0),
    correctAnswers: Number(row.correct_answers ?? 0),
    quizzesCompleted: Number(row.quizzes_completed ?? 0),
    minutesStudied: Number(row.minutes_studied ?? 0),
    updatedAt: row.updated_at,
  };
}

const XP_EVENT_SELECT_COLUMNS =
  "id, user_id, event_key, event_type, points, reference_id, created_at";

const DAILY_ACTIVITY_SELECT_COLUMNS =
  "id, user_id, activity_date, questions_answered, correct_answers, quizzes_completed, minutes_studied, updated_at";

export class SupabaseProgressRepository implements ProgressRepository {
  async awardXpEventIdempotent(
    input: AwardXpInput
  ): Promise<ProgressResult<AwardXpOutput>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.awardXpEventIdempotent(input);
    }

    const normalizedKey = input.eventKey.trim();

    // 1. Verificar si ya existe por event_key (idempotencia Caso Imprescindible #8)
    const { data: existingData, error: findErr } = await supabase
      .from("xp_events")
      .select(XP_EVENT_SELECT_COLUMNS)
      .eq("event_key", normalizedKey)
      .maybeSingle();

    if (findErr) {
      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message: findErr.message,
        },
      };
    }

    if (existingData) {
      return {
        ok: true,
        data: {
          event: mapXpEventRow(existingData as unknown as XpEventRow),
          wasDuplicate: true,
        },
      };
    }

    // 2. Insertar nuevo evento XP
    const { data: insertedData, error: insertErr } = await supabase
      .from("xp_events")
      .insert({
        user_id: input.userId,
        event_key: normalizedKey,
        event_type: input.eventType,
        points: input.points,
        reference_id: input.referenceId ?? null,
      })
      .select(XP_EVENT_SELECT_COLUMNS)
      .single();

    if (insertErr) {
      // Si hubo carrera concurrente por UNIQUE(event_key), recuperar el evento ganador
      if (insertErr.code === "23505") {
        const { data: retryData } = await supabase
          .from("xp_events")
          .select(XP_EVENT_SELECT_COLUMNS)
          .eq("event_key", normalizedKey)
          .maybeSingle();

        if (retryData) {
          return {
            ok: true,
            data: {
              event: mapXpEventRow(retryData as unknown as XpEventRow),
              wasDuplicate: true,
            },
          };
        }
      }

      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message: insertErr.message,
        },
      };
    }

    return {
      ok: true,
      data: {
        event: mapXpEventRow(insertedData as unknown as XpEventRow),
        wasDuplicate: false,
      },
    };
  }

  async listXpEventsByUser(
    userId: string
  ): Promise<ProgressResult<XpEventEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listXpEventsByUser(userId);
    }

    const { data, error } = await supabase
      .from("xp_events")
      .select(XP_EVENT_SELECT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message: error.message,
        },
      };
    }

    const rows = (data ?? []) as unknown as XpEventRow[];
    return {
      ok: true,
      data: rows.map(mapXpEventRow),
    };
  }

  async recordDailyActivityIncrement(
    input: RecordDailyActivityInput
  ): Promise<ProgressResult<DailyActivityEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.recordDailyActivityIncrement(input);
    }

    const activityDate = normalizeDateString(input.activityDate);
    const qDelta = Math.max(0, Math.floor(input.questionsAnsweredDelta ?? 0));
    const cDelta = Math.max(0, Math.floor(input.correctAnswersDelta ?? 0));
    const zDelta = Math.max(0, Math.floor(input.quizzesCompletedDelta ?? 0));
    const mDelta = Math.max(0, Math.floor(input.minutesStudiedDelta ?? 0));

    const { data: existing, error: findErr } = await supabase
      .from("user_daily_activity")
      .select(DAILY_ACTIVITY_SELECT_COLUMNS)
      .eq("user_id", input.userId)
      .eq("activity_date", activityDate)
      .maybeSingle();

    if (findErr) {
      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message: findErr.message,
        },
      };
    }

    if (existing) {
      const prev = mapDailyActivityRow(existing as unknown as DailyActivityRow);
      const nextQuestions = prev.questionsAnswered + qDelta;
      const nextCorrect = Math.min(nextQuestions, prev.correctAnswers + cDelta);

      const { data: updated, error: updateErr } = await supabase
        .from("user_daily_activity")
        .update({
          questions_answered: nextQuestions,
          correct_answers: nextCorrect,
          quizzes_completed: prev.quizzesCompleted + zDelta,
          minutes_studied: prev.minutesStudied + mDelta,
        })
        .eq("id", prev.id)
        .select(DAILY_ACTIVITY_SELECT_COLUMNS)
        .single();

      if (updateErr || !updated) {
        return {
          ok: false,
          error: {
            code: "PERSISTENCE_ERROR",
            message:
              updateErr?.message ??
              "No se pudo actualizar la actividad diaria.",
          },
        };
      }

      return {
        ok: true,
        data: mapDailyActivityRow(updated as unknown as DailyActivityRow),
      };
    }

    const nextQuestions = qDelta;
    const nextCorrect = Math.min(nextQuestions, cDelta);

    const { data: inserted, error: insertErr } = await supabase
      .from("user_daily_activity")
      .insert({
        user_id: input.userId,
        activity_date: activityDate,
        questions_answered: nextQuestions,
        correct_answers: nextCorrect,
        quizzes_completed: zDelta,
        minutes_studied: mDelta,
      })
      .select(DAILY_ACTIVITY_SELECT_COLUMNS)
      .single();

    if (insertErr || !inserted) {
      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message:
            insertErr?.message ?? "No se pudo registrar la actividad diaria.",
        },
      };
    }

    return {
      ok: true,
      data: mapDailyActivityRow(inserted as unknown as DailyActivityRow),
    };
  }

  async listDailyActivityByUser(
    userId: string
  ): Promise<ProgressResult<DailyActivityEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listDailyActivityByUser(userId);
    }

    const { data, error } = await supabase
      .from("user_daily_activity")
      .select(DAILY_ACTIVITY_SELECT_COLUMNS)
      .eq("user_id", userId)
      .order("activity_date", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message: error.message,
        },
      };
    }

    const rows = (data ?? []) as unknown as DailyActivityRow[];
    return {
      ok: true,
      data: rows.map(mapDailyActivityRow),
    };
  }
}
