import { describe, expect, it } from "vitest";
import {
  computeNextQuestionVersion,
  resolveQuestionSourceState,
  validateQuestionDraftInput,
  validateQuestionForPublication,
} from "../questions.rules";

describe("Reglas de dominio de Preguntas y Editor Determinista (Fase 5)", () => {
  it("permite guardar un borrador (draft) en progreso con validación flexible", () => {
    const res = validateQuestionDraftInput({
      type: "single_choice",
      prompt: "¿Qué es el potencial de reposo?",
      explanation: "",
      options: [{ text: "-70 mV", isCorrect: true }],
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe("draft");
      expect(res.data.options).toHaveLength(1);
    }
  });

  it("bloquea la publicación si falta la explicación general obligatoria", () => {
    const res = validateQuestionForPublication({
      type: "single_choice",
      prompt: "¿Cuál es el potencial de equilibrio del K+?",
      explanation: "   ",
      options: [
        { text: "-90 mV", isCorrect: true },
        { text: "+60 mV", isCorrect: false },
      ],
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("MISSING_GENERAL_EXPLANATION");
    }
  });

  it("bloquea la publicación de single_choice mal configurada (<2 opciones o !=1 correcta)", () => {
    const oneOption = validateQuestionForPublication({
      type: "single_choice",
      prompt: "Pregunta con una sola opción",
      explanation: "Explicación detallada válida.",
      options: [{ text: "Única opción", isCorrect: true }],
    });
    expect(oneOption.ok).toBe(false);
    if (!oneOption.ok) {
      expect(oneOption.error.code).toBe("INSUFFICIENT_OPTIONS");
    }

    const twoCorrects = validateQuestionForPublication({
      type: "single_choice",
      prompt: "Pregunta con dos correctas en single_choice",
      explanation: "Explicación detallada válida.",
      options: [
        { text: "Opción A", isCorrect: true },
        { text: "Opción B", isCorrect: true },
      ],
    });
    expect(twoCorrects.ok).toBe(false);
    if (!twoCorrects.ok) {
      expect(twoCorrects.error.code).toBe(
        "INVALID_SINGLE_CHOICE_CORRECT_COUNT"
      );
    }
  });

  it("bloquea la publicación de true_false si no tiene exactamente 2 opciones y 1 correcta", () => {
    const threeOptions = validateQuestionForPublication({
      type: "true_false",
      prompt: "El ATP se consume en el transporte activo primario.",
      explanation: "La bomba Na+/K+ hidroliza ATP directamente.",
      options: [
        { text: "Verdadero", isCorrect: true },
        { text: "Falso", isCorrect: false },
        { text: "Tal vez", isCorrect: false },
      ],
    });
    expect(threeOptions.ok).toBe(false);
    if (!threeOptions.ok) {
      expect(threeOptions.error.code).toBe("INVALID_TRUE_FALSE_CONFIG");
    }

    const zeroCorrect = validateQuestionForPublication({
      type: "true_false",
      prompt: "El ATP se consume en el transporte activo primario.",
      explanation: "La bomba Na+/K+ hidroliza ATP directamente.",
      options: [
        { text: "Verdadero", isCorrect: false },
        { text: "Falso", isCorrect: false },
      ],
    });
    expect(zeroCorrect.ok).toBe(false);
    if (!zeroCorrect.ok) {
      expect(zeroCorrect.error.code).toBe("INVALID_TRUE_FALSE_CONFIG");
    }
  });

  it("bloquea la publicación de multiple_select si no tiene al menos 1 correcta y 1 incorrecta", () => {
    const allCorrect = validateQuestionForPublication({
      type: "multiple_select",
      prompt: "Seleccione los factores que aumentan el gasto cardíaco:",
      explanation:
        "Tanto la precarga como el inotropismo positivo aumentan el volumen sistólico.",
      options: [
        { text: "Aumento de precarga", isCorrect: true },
        { text: "Aumento de contractilidad", isCorrect: true },
      ],
    });
    expect(allCorrect.ok).toBe(false);
    if (!allCorrect.ok) {
      expect(allCorrect.error.code).toBe("INVALID_MULTIPLE_SELECT_CONFIG");
    }

    const validMultiple = validateQuestionForPublication({
      type: "multiple_select",
      prompt: "Seleccione los factores que aumentan el gasto cardíaco:",
      explanation:
        "Tanto la precarga como el inotropismo positivo aumentan el volumen sistólico.",
      options: [
        { text: "Aumento de precarga", isCorrect: true },
        { text: "Aumento de contractilidad", isCorrect: true },
        { text: "Aumento extremo de poscarga", isCorrect: false },
      ],
    });
    expect(validMultiple.ok).toBe(true);
  });

  it("incrementa version (+1) cuando cambia el enunciado, explicación u opciones", () => {
    const existing = {
      version: 1,
      type: "single_choice" as const,
      prompt: "Enunciado original",
      explanation: "Explicación original",
      difficulty: "medium" as const,
      options: [
        {
          id: "o1",
          questionId: "q1",
          text: "A",
          isCorrect: true,
          feedback: "",
          sortOrder: 1,
        },
        {
          id: "o2",
          questionId: "q1",
          text: "B",
          isCorrect: false,
          feedback: "",
          sortOrder: 2,
        },
      ],
    };

    const unchanged = computeNextQuestionVersion(existing, {
      type: "single_choice",
      prompt: "Enunciado original",
      explanation: "Explicación original",
      difficulty: "medium",
      options: [
        { text: "A", isCorrect: true, feedback: "", sortOrder: 1 },
        { text: "B", isCorrect: false, feedback: "", sortOrder: 2 },
      ],
    });
    expect(unchanged).toBe(1);

    const changedPrompt = computeNextQuestionVersion(existing, {
      type: "single_choice",
      prompt: "Enunciado corregido en v2",
      explanation: "Explicación original",
      difficulty: "medium",
      options: [
        { text: "A", isCorrect: true, feedback: "", sortOrder: 1 },
        { text: "B", isCorrect: false, feedback: "", sortOrder: 2 },
      ],
    });
    expect(changedPrompt).toBe(2);
  });

  it("resuelve estado 'Fuente no disponible' cuando el PDF vinculado fue eliminado", () => {
    const map = new Map<string, { filename: string; status: string }>();
    const deletedState = resolveQuestionSourceState({
      sourceDocumentId: null,
      sourceDocumentName: "apunte-borrado.pdf",
      availableDocumentsById: map,
    });

    expect(deletedState.sourceDocumentId).toBeNull();
    expect(deletedState.sourceDocumentName).toBe("apunte-borrado.pdf");
    expect(deletedState.sourceDocumentAvailable).toBe(false);
  });
});
