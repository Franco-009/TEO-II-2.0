import { describe, expect, it } from "vitest";
import {
  buildDeterministicXpEventKey,
  calculateConsecutiveStreak,
  calculateUserLevel,
  getXpPointsForEventType,
  XP_POINTS_BY_EVENT,
} from "../gamification.rules";
import { classifyTopicMastery } from "@/domain/progress/progress.rules";

describe("Reglas puras de Gamificación y Progreso (Fase 7)", () => {
  it("define los parámetros centralizados de XP (+10, +20, +30, +50) y construye event_key deterministas", () => {
    expect(XP_POINTS_BY_EVENT).toEqual({
      attempt_correct: 10,
      quiz_completed: 20,
      daily_goal_reached: 30,
      topic_mastered: 50,
    });

    expect(getXpPointsForEventType("attempt_correct")).toBe(10);
    expect(getXpPointsForEventType("quiz_completed")).toBe(20);
    expect(getXpPointsForEventType("daily_goal_reached")).toBe(30);
    expect(getXpPointsForEventType("topic_mastered")).toBe(50);

    const k1 = buildDeterministicXpEventKey({
      type: "attempt_correct",
      sessionId: "sess-01",
      questionId: "q-101",
    });
    const k2 = buildDeterministicXpEventKey({
      type: "attempt_correct",
      sessionId: " sess-01 ",
      questionId: " q-101 ",
    });
    expect(k1).toBe("attempt_correct:sess-01:q-101");
    expect(k2).toBe(k1);

    expect(
      buildDeterministicXpEventKey({
        type: "quiz_completed",
        sessionId: "sess-01",
      })
    ).toBe("quiz_completed:sess-01");

    expect(
      buildDeterministicXpEventKey({
        type: "daily_goal_reached",
        userId: "usr-01",
        activityDate: "2026-11-11T15:30:00.000Z",
      })
    ).toBe("daily_goal:usr-01:2026-11-11");

    expect(
      buildDeterministicXpEventKey({
        type: "topic_mastered",
        userId: "usr-01",
        topicId: "top-cardio-1",
      })
    ).toBe("topic_mastered:usr-01:top-cardio-1");
  });

  it("exige una muestra mínima de >= 5 intentos y >= 80% de precisión antes de clasificar un tema como mastered", () => {
    // Menos de 5 intentos siempre se clasifica como insufficient_sample aunque tenga 100% de acierto
    expect(classifyTopicMastery(0, 0)).toBe("insufficient_sample");
    expect(classifyTopicMastery(1, 100)).toBe("insufficient_sample");
    expect(classifyTopicMastery(4, 100)).toBe("insufficient_sample");

    // Al llegar a 5 intentos:
    expect(classifyTopicMastery(5, 80)).toBe("mastered");
    expect(classifyTopicMastery(6, 100)).toBe("mastered");
    expect(classifyTopicMastery(5, 79)).toBe("in_progress");
    expect(classifyTopicMastery(5, 60)).toBe("in_progress");
    expect(classifyTopicMastery(5, 59)).toBe("needs_review");
    expect(classifyTopicMastery(8, 25)).toBe("needs_review");
  });

  it("calcula correctamente la racha de días consecutivos (activa hoy, activa desde ayer y racha rota)", () => {
    const refToday = "2026-11-11";

    // 1. Tres días consecutivos incluyendo hoy (9, 10, 11) + fechas duplicadas
    const activeToday = calculateConsecutiveStreak(
      ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-10"],
      refToday
    );
    expect(activeToday.streakDays).toBe(3);
    expect(activeToday.longestStreakDays).toBe(3);
    expect(activeToday.isActiveToday).toBe(true);

    // 2. Practicó hasta ayer (9 y 10), aún no practicó hoy (11) -> racha sigue activa en 2
    const activeYesterday = calculateConsecutiveStreak(
      ["2026-11-09", "2026-11-10"],
      refToday
    );
    expect(activeYesterday.streakDays).toBe(2);
    expect(activeYesterday.isActiveToday).toBe(false);

    // 3. No practicó ni hoy ni ayer (última vez el 8 de noviembre, pero tuvo racha previa de 4 días del 1 al 4)
    const brokenStreak = calculateConsecutiveStreak(
      [
        "2026-11-01",
        "2026-11-02",
        "2026-11-03",
        "2026-11-04",
        "2026-11-08",
      ],
      refToday
    );
    expect(brokenStreak.streakDays).toBe(0);
    expect(brokenStreak.longestStreakDays).toBe(4);
    expect(brokenStreak.lastActiveDate).toBe("2026-11-08");
  });

  it("calcula el nivel y progreso porcentual de XP de forma determinista", () => {
    expect(calculateUserLevel(0)).toEqual({
      level: 1,
      totalXp: 0,
      currentLevelXp: 0,
      nextLevelXp: 250,
      progressPercent: 0,
    });

    expect(calculateUserLevel(250)).toEqual({
      level: 2,
      totalXp: 250,
      currentLevelXp: 0,
      nextLevelXp: 250,
      progressPercent: 0,
    });

    expect(calculateUserLevel(375)).toEqual({
      level: 2,
      totalXp: 375,
      currentLevelXp: 125,
      nextLevelXp: 250,
      progressPercent: 50,
    });
  });
});
