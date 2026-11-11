import { beforeEach, describe, expect, it } from "vitest";
import { deleteDocumentUseCase } from "@/application/documents/documents.use-cases";
import {
  changeQuestionStatusUseCase,
  createQuestionUseCase,
  deleteQuestionUseCase,
  listSubjectQuestionsUseCase,
  listTopicQuestionsUseCase,
  updateQuestionUseCase,
} from "../questions.use-cases";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { InMemoryStudyCatalogStore } from "@/infrastructure/supabase/in-memory-catalog.store";

const userA = { userId: MOCK_USER_PROFILE.id, role: "user" as const };
const userB = { userId: "other-student-b", role: "user" as const };

describe("Casos de uso de Preguntas y Editor Determinista (Fase 5)", () => {
  let store: InMemoryStudyCatalogStore;

  beforeEach(() => {
    store = new InMemoryStudyCatalogStore();
  });

  it("crea un borrador (draft), bloquea su publicación si está incompleto, incrementa version al editarlo y permite publicarlo", async () => {
    // 1. Crear pregunta en draft sin explicación general
    const draftRes = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      input: {
        topicId: "top-cardio-1",
        type: "single_choice",
        prompt: "¿Qué canal iónico determina la fase 4 del nodo sinusal?",
        explanation: "",
        difficulty: "medium",
        status: "draft",
        options: [
          { text: "Canal funny (If)", isCorrect: true, feedback: "Correcto" },
          {
            text: "Canal rápido de Na+",
            isCorrect: false,
            feedback: "Incorrecto",
          },
        ],
      },
    });

    expect(draftRes.ok).toBe(true);
    if (!draftRes.ok) return;
    expect(draftRes.data.version).toBe(1);
    expect(draftRes.data.status).toBe("draft");

    // 2. Intentar publicar sin explicación general -> debe fallar con MISSING_GENERAL_EXPLANATION
    const blockedPub = await changeQuestionStatusUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      actor: userA,
      questionId: draftRes.data.id,
      status: "published",
    });

    expect(blockedPub.ok).toBe(false);
    if (!blockedPub.ok) {
      expect(blockedPub.error.code).toBe("MISSING_GENERAL_EXPLANATION");
    }

    // 3. Editar agregando la explicación general -> incrementa a version 2 y permite publicar
    const updatedRes = await updateQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      questionId: draftRes.data.id,
      input: {
        explanation:
          "La corriente funny (If) activada por hiperpolarización despolariza espontáneamente las células marcapasos.",
        status: "published",
      },
    });

    expect(updatedRes.ok).toBe(true);
    if (updatedRes.ok) {
      expect(updatedRes.data.version).toBe(2);
      expect(updatedRes.data.status).toBe("published");
    }
  });

  it("preserva la pregunta indicando 'Fuente no disponible' (ON DELETE SET NULL) cuando se elimina su documento PDF asociado", async () => {
    // 1. Crear una pregunta vinculada a doc-01
    const createdRes = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      input: {
        topicId: "top-cardio-1",
        type: "true_false",
        prompt: "El potencial de reposo ventricular es cercano a -90 mV.",
        explanation:
          "Verdadero, determinado principalmente por la conductancia al K+ (IK1).",
        status: "published",
        sourceDocumentId: "doc-01",
        sourcePage: 15,
        options: [
          { text: "Verdadero", isCorrect: true, feedback: "Exacto." },
          { text: "Falso", isCorrect: false, feedback: "Revisar IK1." },
        ],
      },
    });

    expect(createdRes.ok).toBe(true);
    if (!createdRes.ok) return;

    expect(createdRes.data.sourceDocumentId).toBe("doc-01");
    expect(createdRes.data.sourceDocumentAvailable).toBe(true);
    expect(createdRes.data.sourceDocumentName).toBe(
      "apunte-electrofisiologia-2026.pdf"
    );

    // 2. Eliminar el PDF doc-01
    const delDocRes = await deleteDocumentUseCase({
      docsRepo: store,
      storagePort: store,
      actor: userA,
      documentId: "doc-01",
    });
    expect(delDocRes.ok).toBe(true);

    // 3. Verificar que la pregunta sigue existiendo y conserva sourceDocumentName con sourceDocumentAvailable = false
    const checkQuestion = await store.findQuestionById(createdRes.data.id);
    expect(checkQuestion.ok).toBe(true);
    if (checkQuestion.ok && checkQuestion.data) {
      expect(checkQuestion.data.sourceDocumentId).toBeNull();
      expect(checkQuestion.data.sourceDocumentAvailable).toBe(false);
      expect(checkQuestion.data.sourceDocumentName).toBe(
        "apunte-electrofisiologia-2026.pdf"
      );
      expect(checkQuestion.data.sourcePage).toBe(15);
    }
  });

  it("garantiza aislamiento RLS: Usuario B no puede listar, crear, editar ni eliminar preguntas privadas del Usuario A", async () => {
    const listAttempt = await listTopicQuestionsUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      actor: userB,
      topicId: "top-cardio-1",
    });
    expect(listAttempt.ok).toBe(false);
    if (!listAttempt.ok) {
      expect(listAttempt.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    const createAttempt = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userB,
      input: {
        topicId: "top-cardio-1",
        type: "true_false",
        prompt: "Intento intruso",
        explanation: "Explicación",
        options: [
          { text: "Verdadero", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
    });
    expect(createAttempt.ok).toBe(false);
    if (!createAttempt.ok) {
      expect(createAttempt.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    const updateAttempt = await updateQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userB,
      questionId: "q-101",
      input: { prompt: "Intento de alterar pregunta ajena" },
    });
    expect(updateAttempt.ok).toBe(false);
    if (!updateAttempt.ok) {
      expect(updateAttempt.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    const deleteAttempt = await deleteQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      actor: userB,
      questionId: "q-101",
    });
    expect(deleteAttempt.ok).toBe(false);
    if (!deleteAttempt.ok) {
      expect(deleteAttempt.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }
  });

  it("en materias públicas del catálogo, solo expone preguntas en estado published y oculta las draft", async () => {
    const publicList = await listSubjectQuestionsUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      actor: userB,
      subjectId: "pub-estadistica",
    });

    expect(publicList.ok).toBe(true);
    if (publicList.ok) {
      expect(publicList.data.length).toBeGreaterThan(0);
      expect(publicList.data.every((q) => q.status === "published")).toBe(true);
      expect(
        publicList.data.some((q) => q.id === "q-pub-202-draft")
      ).toBe(false);
    }
  });
});
