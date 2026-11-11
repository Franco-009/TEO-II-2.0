import { describe, expect, it } from "vitest";
import { buildMistakeQuestionQueue } from "@/domain/attempts/attempts.rules";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import {
  evaluateQuestionAnswer,
  selectEligibleQuizQuestions,
  shuffleWithSeed,
} from "../quizzes.rules";

const singleChoiceQuestion: QuestionEntity = {
  id: "q-sc-1",
  topicId: "top-1",
  authorId: "usr-1",
  type: "single_choice",
  prompt: "¿Cuál es el potencial de equilibrio aproximado del K+?",
  explanation: "Cercano a -90 mV según la ecuación de Nernst.",
  difficulty: "medium",
  status: "published",
  sourceDocumentId: null,
  sourceDocumentName: null,
  sourceDocumentAvailable: false,
  sourcePage: null,
  version: 3,
  options: [
    {
      id: "opt-sc-a",
      questionId: "q-sc-1",
      text: "-90 mV",
      isCorrect: true,
      feedback: "Correcto.",
      sortOrder: 1,
    },
    {
      id: "opt-sc-b",
      questionId: "q-sc-1",
      text: "+60 mV",
      isCorrect: false,
      feedback: "Ese corresponde al Na+.",
      sortOrder: 2,
    },
  ],
  createdAt: "2026-11-11T10:00:00.000Z",
  updatedAt: "2026-11-11T10:00:00.000Z",
};

const multipleSelectQuestion: QuestionEntity = {
  id: "q-ms-1",
  topicId: "top-1",
  authorId: "usr-1",
  type: "multiple_select",
  prompt: "Seleccione los factores que incrementan el filtrado glomerular:",
  explanation:
    "La vasodilatación aferente y vasoconstricción moderada eferente elevan la PGC.",
  difficulty: "hard",
  status: "published",
  sourceDocumentId: null,
  sourceDocumentName: null,
  sourceDocumentAvailable: false,
  sourcePage: null,
  version: 2,
  options: [
    {
      id: "opt-ms-1",
      questionId: "q-ms-1",
      text: "Vasodilatación de arteriola aferente",
      isCorrect: true,
      feedback: "Correcto.",
      sortOrder: 1,
    },
    {
      id: "opt-ms-2",
      questionId: "q-ms-1",
      text: "Vasoconstricción moderada de arteriola eferente",
      isCorrect: true,
      feedback: "Correcto.",
      sortOrder: 2,
    },
    {
      id: "opt-ms-3",
      questionId: "q-ms-1",
      text: "Aumento de presión oncótica capilar",
      isCorrect: false,
      feedback: "Incorrecto: se opone al filtrado.",
      sortOrder: 3,
    },
  ],
  createdAt: "2026-11-11T10:00:00.000Z",
  updatedAt: "2026-11-11T10:00:00.000Z",
};

describe("Motor de corrección determinista y selección de preguntas (Fase 6)", () => {
  it("Caso Imprescindible #6: single_choice rechaza IDs de opciones que no pertenecen a esa pregunta", () => {
    const foreignAttempt = evaluateQuestionAnswer(singleChoiceQuestion, [
      "opt-ajena-999",
    ]);

    expect(foreignAttempt.ok).toBe(false);
    if (!foreignAttempt.ok) {
      expect(foreignAttempt.error.code).toBe("INVALID_OPTION_ID");
    }

    const validCorrect = evaluateQuestionAnswer(singleChoiceQuestion, [
      "opt-sc-a",
    ]);
    expect(validCorrect.ok).toBe(true);
    if (validCorrect.ok) {
      expect(validCorrect.data.isCorrect).toBe(true);
      expect(validCorrect.data.questionVersion).toBe(3);
    }
  });

  it("Caso Imprescindible #7: multiple_select solo marca acierto cuando coincide el conjunto completo de opciones correctas", () => {
    // 1. Subconjunto incompleto (solo 1 de las 2 correctas) -> incorrecto
    const partialRes = evaluateQuestionAnswer(multipleSelectQuestion, [
      "opt-ms-1",
    ]);
    expect(partialRes.ok).toBe(true);
    if (partialRes.ok) {
      expect(partialRes.data.isCorrect).toBe(false);
    }

    // 2. Las 2 correctas + 1 distractor -> incorrecto
    const withDistractorRes = evaluateQuestionAnswer(multipleSelectQuestion, [
      "opt-ms-1",
      "opt-ms-2",
      "opt-ms-3",
    ]);
    expect(withDistractorRes.ok).toBe(true);
    if (withDistractorRes.ok) {
      expect(withDistractorRes.data.isCorrect).toBe(false);
    }

    // 3. Conjunto exacto de opciones correctas (sin importar el orden de envío) -> acierto
    const exactMatchRes = evaluateQuestionAnswer(multipleSelectQuestion, [
      "opt-ms-2",
      "opt-ms-1",
    ]);
    expect(exactMatchRes.ok).toBe(true);
    if (exactMatchRes.ok) {
      expect(exactMatchRes.data.isCorrect).toBe(true);
      expect(exactMatchRes.data.correctOptionIds).toEqual([
        "opt-ms-1",
        "opt-ms-2",
      ]);
    }
  });

  it("produce el mismo orden aleatorio reproducible dada la misma semilla (seed)", () => {
    const ids = ["q-1", "q-2", "q-3", "q-4", "q-5", "q-6"];
    const firstRun = shuffleWithSeed(ids, "semilla-fisiologia-2026");
    const secondRun = shuffleWithSeed(ids, "semilla-fisiologia-2026");
    const differentSeedRun = shuffleWithSeed(ids, "otra-semilla-999");

    expect(firstRun).toEqual(secondRun);
    expect(firstRun).not.toEqual(differentSeedRun);
  });

  it("excluye preguntas en estado draft o archived al seleccionar preguntas elegibles", () => {
    const draftQuestion: QuestionEntity = {
      ...singleChoiceQuestion,
      id: "q-draft-hidden",
      status: "draft",
    };

    const res = selectEligibleQuizQuestions({
      questions: [singleChoiceQuestion, multipleSelectQuestion, draftQuestion],
      mode: "practice",
      questionCount: 10,
      seed: "seed-test",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.map((q) => q.id)).not.toContain("q-draft-hidden");
      expect(res.data).toHaveLength(2);
    }
  });

  it("construye la cola del Modo Repaso de Errores preservando intentos históricos", () => {
    const queue = buildMistakeQuestionQueue({
      publishedQuestions: [singleChoiceQuestion, multipleSelectQuestion],
      userId: "usr-1",
      userAttempts: [
        {
          id: "a1",
          sessionId: "s1",
          userId: "usr-1",
          questionId: "q-sc-1",
          responseJson: { selectedOptionIds: ["opt-sc-b"] },
          isCorrect: false,
          elapsedMs: 5000,
          answeredAt: "2026-11-11T10:00:00.000Z",
          questionVersion: 3,
        },
      ],
    });

    expect(queue).toHaveLength(1);
    expect(queue[0].question.id).toBe("q-sc-1");
    expect(queue[0].failedAttemptsCount).toBe(1);
  });
});
