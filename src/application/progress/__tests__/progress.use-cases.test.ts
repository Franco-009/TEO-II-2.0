import { beforeEach, describe, expect, it } from "vitest";
import {
  awardIdempotentXpUseCase,
  getUserProgressUseCase,
} from "../progress.use-cases";
import {
  completeQuizUseCase,
  startQuizUseCase,
  submitAnswerUseCase,
} from "@/application/quizzes/quizzes.use-cases";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { InMemoryStudyCatalogStore } from "@/infrastructure/supabase/in-memory-catalog.store";

const userA = { userId: MOCK_USER_PROFILE.id, role: "user" as const };
const userB = { userId: "student-b-isolated", role: "user" as const };

describe("Casos de uso de Progreso y Gamificación (Fase 7)", () => {
  let store: InMemoryStudyCatalogStore;

  beforeEach(() => {
    store = new InMemoryStudyCatalogStore(true);
  });

  it("Caso Imprescindible #8: un reintento de red con el mismo event_key NO duplica puntos en xp_events", async () => {
    // 1. Prueba directa sobre awardIdempotentXpUseCase con el mismo event_key
    const firstAward = await awardIdempotentXpUseCase({
      progressRepo: store,
      userId: userB.userId,
      keyInput: {
        type: "attempt_correct",
        sessionId: "sess-net-retry",
        questionId: "q-101",
      },
      referenceId: "sess-net-retry",
    });

    expect(firstAward.ok).toBe(true);
    if (!firstAward.ok) return;
    expect(firstAward.data.wasDuplicate).toBe(false);
    expect(firstAward.data.event.points).toBe(10);

    // Segundo y tercer envío idénticos (simulando reintento de red / doble clic)
    const secondAward = await awardIdempotentXpUseCase({
      progressRepo: store,
      userId: userB.userId,
      keyInput: {
        type: "attempt_correct",
        sessionId: "sess-net-retry",
        questionId: "q-101",
      },
      referenceId: "sess-net-retry",
    });

    expect(secondAward.ok).toBe(true);
    if (!secondAward.ok) return;
    expect(secondAward.data.wasDuplicate).toBe(true);
    expect(secondAward.data.event.id).toBe(firstAward.data.event.id);

    // Verificar que el total de XP de userB sea exactamente 10 (y no 20)
    const eventsB = await store.listXpEventsByUser(userB.userId);
    expect(eventsB.ok).toBe(true);
    if (eventsB.ok) {
      expect(eventsB.data).toHaveLength(1);
      expect(eventsB.data.reduce((s, e) => s + e.points, 0)).toBe(10);
    }

    // 2. Prueba integrada en submitAnswerUseCase y completeQuizUseCase ante reintentos
    const startRes = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        subjectId: "subj-anatomia",
        mode: "practice",
        questionCount: 2,
        seed: "seed-xp-idempotent",
      },
    });
    expect(startRes.ok).toBe(true);
    if (!startRes.ok) return;

    const sessionId = startRes.data.session.id;

    const xpBeforeRes = await store.listXpEventsByUser(userA.userId);
    const xpBefore = xpBeforeRes.ok
      ? xpBeforeRes.data.reduce((s, e) => s + e.points, 0)
      : 0;

    // Primer envío correcto sobre q-101 -> otorga +10 XP
    const ans1 = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      input: {
        sessionId,
        questionId: "q-101",
        selectedOptionIds: ["opt-1"],
        elapsedMs: 5000,
      },
    });
    expect(ans1.ok).toBe(true);
    if (ans1.ok) {
      expect(ans1.data.xpAwarded).toBe(10);
    }

    // Reintento de red del mismo intento -> 0 puntos nuevos
    const ans1Retry = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      input: {
        sessionId,
        questionId: "q-101",
        selectedOptionIds: ["opt-1"],
        elapsedMs: 5000,
      },
    });
    expect(ans1Retry.ok).toBe(true);
    if (ans1Retry.ok) {
      expect(ans1Retry.data.wasDuplicateRetry).toBe(true);
      expect(ans1Retry.data.xpAwarded).toBe(0);
    }

    // Cerrar cuestionario -> otorga +20 XP la primera vez y 0 en reintentos
    const comp1 = await completeQuizUseCase({
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      sessionId,
    });
    expect(comp1.ok).toBe(true);

    const comp2Retry = await completeQuizUseCase({
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      sessionId,
    });
    expect(comp2Retry.ok).toBe(true);

    const xpAfterRes = await store.listXpEventsByUser(userA.userId);
    const xpAfter = xpAfterRes.ok
      ? xpAfterRes.data.reduce((s, e) => s + e.points, 0)
      : 0;

    expect(xpAfter - xpBefore).toBe(30); // Exactamente +10 (acierto) + 20 (cierre)
  });

  it("otorga el bono de +50 XP al dominar un tema recién al alcanzar el 5to intento con precisión >= 80%, y +30 XP al cumplir el objetivo diario", async () => {
    const activityDate = "2026-11-15";

    // Usuario B practica sobre la materia pública 'pub-estadistica' (tema 'top-pub-prob-1', pregunta 'q-pub-201')
    // Realizamos 5 sesiones de 1 pregunta acertando 'opt-pub-1':
    // - En los intentos 1..4 la precisión es 100%, pero attemptsCount < 5 -> NO otorga topic_mastered (+50 XP)
    // - En el intento 5 alcanza attemptsCount === 5 y accuracy === 100% -> otorga +50 XP por única vez
    for (let i = 1; i <= 5; i += 1) {
      const sRes = await startQuizUseCase({
        subjectsRepo: store,
        questionsRepo: store,
        quizzesRepo: store,
        actor: userB,
        input: {
          subjectId: "pub-estadistica",
          mode: "practice",
          questionCount: 1,
          seed: `seed-b-${i}`,
        },
      });
      expect(sRes.ok).toBe(true);
      if (!sRes.ok) return;

      const subRes = await submitAnswerUseCase({
        questionsRepo: store,
        quizzesRepo: store,
        progressRepo: store,
        actor: userB,
        activityDate,
        input: {
          sessionId: sRes.data.session.id,
          questionId: "q-pub-201",
          selectedOptionIds: ["opt-pub-1"],
          elapsedMs: 6000,
        },
      });
      expect(subRes.ok).toBe(true);
      if (!subRes.ok) return;

      if (i < 5) {
        // Solo +10 XP por respuesta correcta
        expect(subRes.data.xpAwarded).toBe(10);
      } else {
        // En el 5to intento: +10 XP (respuesta correcta) + 50 XP (tema dominado) = 60 XP
        expect(subRes.data.xpAwarded).toBe(60);
      }
    }

    // Si responde una 6ta vez en el mismo tema, NO vuelve a otorgar el bono de +50 XP (idempotente)
    const s6 = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userB,
      input: {
        subjectId: "pub-estadistica",
        mode: "practice",
        questionCount: 1,
        seed: "seed-b-6",
      },
    });
    if (s6.ok) {
      const sub6 = await submitAnswerUseCase({
        questionsRepo: store,
        quizzesRepo: store,
        progressRepo: store,
        actor: userB,
        activityDate,
        input: {
          sessionId: s6.data.session.id,
          questionId: "q-pub-201",
          selectedOptionIds: ["opt-pub-1"],
          elapsedMs: 6000,
        },
      });
      expect(sub6.ok && sub6.data.xpAwarded).toBe(10);
    }

    // Completar hasta 10 preguntas en el día para disparar el bono de +30 XP (daily_goal_reached)
    for (let i = 7; i <= 10; i += 1) {
      const sRes = await startQuizUseCase({
        subjectsRepo: store,
        questionsRepo: store,
        quizzesRepo: store,
        actor: userB,
        input: {
          subjectId: "pub-estadistica",
          mode: "practice",
          questionCount: 1,
          seed: `seed-b-${i}`,
        },
      });
      if (sRes.ok) {
        const subRes = await submitAnswerUseCase({
          questionsRepo: store,
          quizzesRepo: store,
          progressRepo: store,
          actor: userB,
          activityDate,
          input: {
            sessionId: sRes.data.session.id,
            questionId: "q-pub-201",
            selectedOptionIds: ["opt-pub-1"],
            elapsedMs: 5000,
          },
        });
        expect(subRes.ok).toBe(true);
        if (subRes.ok && i === 10) {
          // +10 XP (acierto #10) + 30 XP (objetivo diario cumplido) = 40 XP
          expect(subRes.data.xpAwarded).toBe(40);
        }
      }
    }
  });

  it("aísla estrictamente las estadísticas, racha y eventos XP entre Usuario A y Usuario B", async () => {
    const progressA = await getUserProgressUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
    });

    const progressB = await getUserProgressUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userB,
    });

    expect(progressA.ok).toBe(true);
    expect(progressB.ok).toBe(true);
    if (!progressA.ok || !progressB.ok) return;

    // Usuario A tiene actividad semilla (120 XP, racha de 3 días, 6 intentos y 1 tema dominado)
    expect(progressA.data.levelProgress.totalXp).toBe(120);
    expect(progressA.data.streak.streakDays).toBe(3);
    expect(progressA.data.totalAttemptsCount).toBe(6);
    expect(progressA.data.masteredTopicsCount).toBe(1);

    // Usuario B arranca completamente limpio sin ver ni heredar datos de Usuario A
    expect(progressB.data.levelProgress.totalXp).toBe(0);
    expect(progressB.data.streak.streakDays).toBe(0);
    expect(progressB.data.totalAttemptsCount).toBe(0);
    expect(progressB.data.masteredTopicsCount).toBe(0);
    expect(progressB.data.recentXpEvents).toHaveLength(0);
  });
});
