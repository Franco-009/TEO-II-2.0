import { beforeEach, describe, expect, it } from "vitest";
import { updateQuestionUseCase } from "@/application/questions/questions.use-cases";
import {
  completeQuizUseCase,
  getMistakeQuestionsUseCase,
  startQuizUseCase,
  submitAnswerUseCase,
} from "../quizzes.use-cases";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { InMemoryStudyCatalogStore } from "@/infrastructure/supabase/in-memory-catalog.store";

const userA = { userId: MOCK_USER_PROFILE.id, role: "user" as const };
const userB = { userId: "other-student-b", role: "user" as const };

describe("Casos de uso del Motor de Juego y Corrección (Fase 6)", () => {
  let store: InMemoryStudyCatalogStore;

  beforeEach(() => {
    store = new InMemoryStudyCatalogStore();
  });

  it("Caso Imprescindible #9: bloquea responder en una sesión ajena (FORBIDDEN_SESSION_OWNER) o ya cerrada (SESSION_CLOSED)", async () => {
    // 1. Usuario A inicia una sesión
    const startRes = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        subjectId: "subj-anatomia",
        mode: "practice",
        questionCount: 5,
        seed: "seed-caso-9",
      },
    });

    expect(startRes.ok).toBe(true);
    if (!startRes.ok) return;

    const sessionId = startRes.data.session.id;
    const firstQuestion = startRes.data.questions[0];

    // 2. Usuario B intenta enviar una respuesta a la sesión de Usuario A -> FORBIDDEN_SESSION_OWNER
    const intruderSubmit = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      actor: userB,
      input: {
        sessionId,
        questionId: firstQuestion.id,
        selectedOptionIds: [firstQuestion.options[0].id],
      },
    });

    expect(intruderSubmit.ok).toBe(false);
    if (!intruderSubmit.ok) {
      expect(intruderSubmit.error.code).toBe("FORBIDDEN_SESSION_OWNER");
    }

    // 3. Usuario A cierra la sesión (status = 'completed')
    const completeRes = await completeQuizUseCase({
      quizzesRepo: store,
      actor: userA,
      sessionId,
    });
    expect(completeRes.ok).toBe(true);

    // 4. Usuario A intenta enviar respuesta en la sesión ya cerrada -> SESSION_CLOSED
    const closedSubmit = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        sessionId,
        questionId: firstQuestion.id,
        selectedOptionIds: [firstQuestion.options[0].id],
      },
    });

    expect(closedSubmit.ok).toBe(false);
    if (!closedSubmit.ok) {
      expect(closedSubmit.error.code).toBe("SESSION_CLOSED");
    }
  });

  it("garantiza idempotencia de intentos por (sessionId, questionId) y captura la question_version exacta", async () => {
    // Editar q-101 primero para que pase de v2 a v3
    const editRes = await updateQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      questionId: "q-101",
      input: {
        prompt:
          "¿Cuál es el principal evento iónico de la Fase 0 en un miocito ventricular contráctil (v3)?",
      },
    });
    expect(editRes.ok).toBe(true);

    const startRes = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        subjectId: "subj-anatomia",
        mode: "practice",
        questionCount: 5,
        seed: "seed-idempotencia",
      },
    });
    expect(startRes.ok).toBe(true);
    if (!startRes.ok) return;

    const sessionId = startRes.data.session.id;

    // 1. Primer envío sobre q-101 (opción correcta opt-1)
    const firstSubmit = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        sessionId,
        questionId: "q-101",
        selectedOptionIds: ["opt-1"],
        elapsedMs: 4200,
      },
    });

    expect(firstSubmit.ok).toBe(true);
    if (!firstSubmit.ok) return;
    expect(firstSubmit.data.wasDuplicateRetry).toBe(false);
    expect(firstSubmit.data.attempt.questionVersion).toBe(3);
    expect(firstSubmit.data.sessionScore).toBe(10);

    // 2. Segundo envío (reintento de red) sobre el mismo (sessionId, q-101) -> no duplica fila ni suma otros 10 puntos
    const retrySubmit = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        sessionId,
        questionId: "q-101",
        selectedOptionIds: ["opt-1"],
        elapsedMs: 4200,
      },
    });

    expect(retrySubmit.ok).toBe(true);
    if (retrySubmit.ok) {
      expect(retrySubmit.data.wasDuplicateRetry).toBe(true);
      expect(retrySubmit.data.attempt.id).toBe(firstSubmit.data.attempt.id);
      expect(retrySubmit.data.sessionScore).toBe(10);
    }

    const sessionAttempts = await store.listAttemptsBySession(sessionId);
    expect(sessionAttempts.ok && sessionAttempts.data).toHaveLength(1);
  });

  it("construye el Modo Repaso de Errores con preguntas falladas previamente sin exponerlas a otros usuarios", async () => {
    // En el seed inicial, Usuario A tiene 1 intento fallido sobre q-102
    const mistakesA = await getMistakeQuestionsUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
    });

    expect(mistakesA.ok).toBe(true);
    if (mistakesA.ok) {
      expect(mistakesA.data.map((m) => m.question.id)).toContain("q-102");
    }

    // Usuario B no ve los errores del Usuario A
    const mistakesB = await getMistakeQuestionsUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userB,
    });

    expect(mistakesB.ok).toBe(true);
    if (mistakesB.ok) {
      expect(mistakesB.data).toHaveLength(0);
    }

    // Usuario A puede iniciar una sesión en modo 'mistakes' focalizada en q-102
    const mistakesSession = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        subjectId: "subj-anatomia",
        mode: "mistakes",
        questionCount: 5,
      },
    });

    expect(mistakesSession.ok).toBe(true);
    if (mistakesSession.ok) {
      expect(mistakesSession.data.questions.map((q) => q.id)).toEqual([
        "q-102",
      ]);
    }
  });
});
