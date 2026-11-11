import type {
  DailyStreakSummary,
  UserLevelProgress,
  XpEventType,
} from "@/domain/gamification/gamification.types";

/**
 * Tabla centralizada de puntos XP según docs/04-MODELO-DATOS.md y docs/06-PLAN-DE-PRUEBAS.md:
 * - +10 XP: respuesta correcta en sesión activa (`attempt_correct`)
 * - +20 XP: completar un cuestionario (`quiz_completed`)
 * - +30 XP: cumplir el desafío / objetivo diario (`daily_goal_reached`)
 * - +50 XP: dominar un tema/unidad con muestra mínima >= 5 e índice >= 80% (`topic_mastered`)
 */
export const XP_POINTS_BY_EVENT: Record<XpEventType, number> = {
  attempt_correct: 10,
  quiz_completed: 20,
  daily_goal_reached: 30,
  topic_mastered: 50,
} as const;

export const DAILY_GOAL_QUESTIONS_DEFAULT = 10;
export const XP_PER_LEVEL = 250;

export type DeterministicEventKeyInput =
  | {
      type: "attempt_correct";
      sessionId: string;
      questionId: string;
    }
  | {
      type: "quiz_completed";
      sessionId: string;
    }
  | {
      type: "daily_goal_reached";
      userId: string;
      activityDate: string; // YYYY-MM-DD
    }
  | {
      type: "topic_mastered";
      userId: string;
      topicId: string;
    };

/**
 * Construye una clave `event_key` canónica y determinista para garantizar idempotencia
 * ante reintentos de red o doble clic (Caso Imprescindible #8).
 */
export function buildDeterministicXpEventKey(
  input: DeterministicEventKeyInput
): string {
  switch (input.type) {
    case "attempt_correct": {
      const sId = input.sessionId.trim();
      const qId = input.questionId.trim();
      if (!sId || !qId) {
        throw new Error(
          "INVALID_EVENT_KEY_INPUT: sessionId y questionId son obligatorios para attempt_correct."
        );
      }
      return `attempt_correct:${sId}:${qId}`;
    }
    case "quiz_completed": {
      const sId = input.sessionId.trim();
      if (!sId) {
        throw new Error(
          "INVALID_EVENT_KEY_INPUT: sessionId es obligatorio para quiz_completed."
        );
      }
      return `quiz_completed:${sId}`;
    }
    case "daily_goal_reached": {
      const uId = input.userId.trim();
      const dateStr = normalizeDateString(input.activityDate);
      if (!uId || !dateStr) {
        throw new Error(
          "INVALID_EVENT_KEY_INPUT: userId y activityDate (YYYY-MM-DD) son obligatorios para daily_goal_reached."
        );
      }
      return `daily_goal:${uId}:${dateStr}`;
    }
    case "topic_mastered": {
      const uId = input.userId.trim();
      const tId = input.topicId.trim();
      if (!uId || !tId) {
        throw new Error(
          "INVALID_EVENT_KEY_INPUT: userId y topicId son obligatorios para topic_mastered."
        );
      }
      return `topic_mastered:${uId}:${tId}`;
    }
  }
}

/**
 * Obtiene el puntaje fijo e inmutable que corresponde a cada tipo de evento de gamificación.
 */
export function getXpPointsForEventType(eventType: XpEventType): number {
  return XP_POINTS_BY_EVENT[eventType];
}

/**
 * Normaliza una fecha o timestamp ISO a formato UTC `YYYY-MM-DD`.
 */
export function normalizeDateString(dateOrIso: string | Date): string {
  if (dateOrIso instanceof Date) {
    return dateOrIso.toISOString().slice(0, 10);
  }
  const trimmed = dateOrIso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * Calcula el nivel actual del estudiante y el porcentaje de avance hacia el siguiente nivel.
 */
export function calculateUserLevel(
  totalXp: number,
  xpPerLevel: number = XP_PER_LEVEL
): UserLevelProgress {
  const safeTotal = Math.max(0, Math.floor(totalXp));
  const safeStep = Math.max(50, Math.floor(xpPerLevel));
  const level = Math.floor(safeTotal / safeStep) + 1;
  const currentLevelXp = safeTotal % safeStep;
  const progressPercent = Math.min(
    100,
    Math.round((currentLevelXp / safeStep) * 100)
  );

  return {
    level,
    totalXp: safeTotal,
    currentLevelXp,
    nextLevelXp: safeStep,
    progressPercent,
  };
}

/**
 * Resta o suma días a una cadena `YYYY-MM-DD` en UTC devolviendo `YYYY-MM-DD`.
 */
export function addUtcDays(dateStr: string, deltaDays: number): string {
  const normalized = normalizeDateString(dateStr);
  const [y, m, d] = normalized.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return utc.toISOString().slice(0, 10);
}

/**
 * Calcula la racha activa de días consecutivos (`streakDays`) y la mejor racha histórica
 * (`longestStreakDays`) a partir de las fechas con actividad (`questionsAnswered > 0`).
 *
 * Regla determinista de continuidad:
 * - Si el usuario registró actividad en `referenceDate` (hoy), la racha cuenta hacia atrás desde hoy.
 * - Si aún no practicó hoy pero sí practicó en `referenceDate - 1` (ayer), la racha sigue viva contando desde ayer.
 * - Si tampoco practicó ayer, la racha activa es `0`.
 */
export function calculateConsecutiveStreak(
  activeDateStrings: string[],
  referenceDate: string | Date = new Date()
): DailyStreakSummary {
  const todayStr = normalizeDateString(referenceDate);
  const uniqueDates = Array.from(
    new Set(
      activeDateStrings
        .map((d) => normalizeDateString(d))
        .filter((d) => d.length === 10)
    )
  ).sort(); // Orden ascendente YYYY-MM-DD

  if (uniqueDates.length === 0) {
    return {
      streakDays: 0,
      longestStreakDays: 0,
      isActiveToday: false,
      lastActiveDate: null,
    };
  }

  const activeSet = new Set(uniqueDates);
  const isActiveToday = activeSet.has(todayStr);
  const yesterdayStr = addUtcDays(todayStr, -1);
  const lastActiveDate = uniqueDates[uniqueDates.length - 1] ?? null;

  // Calcular mejor racha histórica (longestStreakDays)
  let longestStreakDays = 0;
  let currentRun = 0;
  let prevDate: string | null = null;

  for (const d of uniqueDates) {
    if (!prevDate || addUtcDays(prevDate, 1) === d) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    if (currentRun > longestStreakDays) {
      longestStreakDays = currentRun;
    }
    prevDate = d;
  }

  // Calcular racha activa actual
  let anchorDate: string | null = null;
  if (isActiveToday) {
    anchorDate = todayStr;
  } else if (activeSet.has(yesterdayStr)) {
    anchorDate = yesterdayStr;
  }

  let streakDays = 0;
  if (anchorDate) {
    let cursor = anchorDate;
    while (activeSet.has(cursor)) {
      streakDays += 1;
      cursor = addUtcDays(cursor, -1);
    }
  }

  return {
    streakDays,
    longestStreakDays: Math.max(longestStreakDays, streakDays),
    isActiveToday,
    lastActiveDate,
  };
}
