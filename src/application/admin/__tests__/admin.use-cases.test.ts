import { beforeEach, describe, expect, it } from "vitest";
import {
  createPublicSubjectDraftUseCase,
  getAdminDashboardSummaryUseCase,
  listPublicLibraryCatalogUseCase,
  moderatePublicSubjectUseCase,
  publishPublicContentUseCase,
} from "../admin.use-cases";
import {
  startQuizUseCase,
  submitAnswerUseCase,
} from "@/application/quizzes/quizzes.use-cases";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { InMemoryStudyCatalogStore } from "@/infrastructure/supabase/in-memory-catalog.store";

const adminActor = { userId: MOCK_USER_PROFILE.id, role: "admin" as const };
const normalUser = { userId: "student-regular-01", role: "user" as const };

describe("Casos de uso de Administración y Biblioteca Pública (Fase 8)", () => {
  let store: InMemoryStudyCatalogStore;

  beforeEach(() => {
    store = new InMemoryStudyCatalogStore(true);
  });

  it("rechaza con FORBIDDEN_ADMIN_ONLY cuando un usuario con rol 'user' intenta acceder al panel admin, publicar o moderar", async () => {
    const dashRes = await getAdminDashboardSummaryUseCase({
      adminRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      actor: normalUser,
    });
    expect(dashRes.ok).toBe(false);
    if (!dashRes.ok) {
      expect(dashRes.error.code).toBe("FORBIDDEN_ADMIN_ONLY");
    }

    const pubRes = await publishPublicContentUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      adminRepo: store,
      actor: normalUser,
      subjectId: "pub-bioestadistica-draft",
    });
    expect(pubRes.ok).toBe(false);
    if (!pubRes.ok) {
      expect(pubRes.error.code).toBe("FORBIDDEN_ADMIN_ONLY");
    }

    const createDraftRes = await createPublicSubjectDraftUseCase({
      subjectsRepo: store,
      adminRepo: store,
      actor: normalUser,
      input: {
        title: "Intento de materia pública sin permisos",
        description: "No debe crearse",
      },
    });
    expect(createDraftRes.ok).toBe(false);
    if (!createDraftRes.ok) {
      expect(createDraftRes.error.code).toBe("FORBIDDEN_ADMIN_ONLY");
    }
  });

  it("protege la privacidad: impide moderar materias privadas de usuarios (NOT_PUBLIC_SUBJECT) y bloquea publicar materias públicas vacías", async () => {
    // 1. Intentar moderar una materia privada ('subj-anatomia') desde el flujo administrativo -> NOT_PUBLIC_SUBJECT
    const privateModRes = await moderatePublicSubjectUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      adminRepo: store,
      actor: adminActor,
      input: {
        subjectId: "subj-anatomia",
        targetStatus: "published",
      },
    });
    expect(privateModRes.ok).toBe(false);
    if (!privateModRes.ok) {
      expect(privateModRes.error.code).toBe("NOT_PUBLIC_SUBJECT");
    }

    // 2. Crear una nueva materia pública en draft (vacía, sin temas ni preguntas)
    const createdDraft = await createPublicSubjectDraftUseCase({
      subjectsRepo: store,
      adminRepo: store,
      actor: adminActor,
      input: {
        title: "Microbiología y Virología Médica",
        description: "Bacteriología clínica y mecanismos de patogenicidad.",
      },
    });
    expect(createdDraft.ok).toBe(true);
    if (!createdDraft.ok) return;
    expect(createdDraft.data.subject.status).toBe("draft");
    expect(createdDraft.data.auditLog.action).toBe("create_public_subject");

    // 3. Intentar publicarla sin temas ni preguntas publicadas -> PUBLICATION_REQUIREMENTS_NOT_MET
    const emptyPublishRes = await publishPublicContentUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      adminRepo: store,
      actor: adminActor,
      subjectId: createdDraft.data.subject.id,
    });
    expect(emptyPublishRes.ok).toBe(false);
    if (!emptyPublishRes.ok) {
      expect(emptyPublishRes.error.code).toBe(
        "PUBLICATION_REQUIREMENTS_NOT_MET"
      );
    }
  });

  it("permite al admin publicar una materia pública elegible, la expone en /library, y al archivarla la oculta preservando intentos y XP privados", async () => {
    // 1. Antes de aprobar 'pub-bioestadistica-draft', no aparece en /library (Caso Imprescindible #5)
    const initialLibrary = await listPublicLibraryCatalogUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
    });
    expect(initialLibrary.ok).toBe(true);
    if (!initialLibrary.ok) return;
    expect(initialLibrary.data.map((s) => s.id)).not.toContain(
      "pub-bioestadistica-draft"
    );
    expect(initialLibrary.data.map((s) => s.id)).not.toContain(
      "pub-farmaco-archived"
    );

    // 2. El administrador aprueba y publica 'pub-bioestadistica-draft' (que cuenta con 1 tema y 1 pregunta publicada)
    const publishRes = await publishPublicContentUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      adminRepo: store,
      actor: adminActor,
      subjectId: "pub-bioestadistica-draft",
      notes: "Aprobada para el catálogo general tras revisión de cátedra.",
    });
    expect(publishRes.ok).toBe(true);
    if (!publishRes.ok) return;
    expect(publishRes.data.subject.status).toBe("published");
    expect(publishRes.data.auditLog.action).toBe("publish_subject");

    // 3. Ahora aparece en /library y un estudiante regular puede practicar con ella guardando sus intentos privados
    const updatedLibrary = await listPublicLibraryCatalogUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
    });
    expect(updatedLibrary.ok).toBe(true);
    if (updatedLibrary.ok) {
      expect(updatedLibrary.data.map((s) => s.id)).toContain(
        "pub-bioestadistica-draft"
      );
    }

    const quizRes = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: normalUser,
      input: {
        subjectId: "pub-bioestadistica-draft",
        mode: "practice",
        questionCount: 1,
      },
    });
    expect(quizRes.ok).toBe(true);
    if (!quizRes.ok) return;

    const answerRes = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: normalUser,
      input: {
        sessionId: quizRes.data.session.id,
        questionId: "q-pub-401",
        selectedOptionIds: ["opt-pub-b1"],
        elapsedMs: 4500,
      },
    });
    expect(answerRes.ok).toBe(true);
    if (answerRes.ok) {
      expect(answerRes.data.evaluation.isCorrect).toBe(true);
      expect(answerRes.data.xpAwarded).toBe(10);
    }

    // 4. El administrador archiva la materia ('published' -> 'archived')
    const archiveRes = await moderatePublicSubjectUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      adminRepo: store,
      actor: adminActor,
      input: {
        subjectId: "pub-bioestadistica-draft",
        targetStatus: "archived",
      },
    });
    expect(archiveRes.ok).toBe(true);
    if (archiveRes.ok) {
      expect(archiveRes.data.subject.status).toBe("archived");
      expect(archiveRes.data.auditLog.action).toBe("archive_subject");
    }

    // 5. La materia archivada desaparece de /library pero el estudiante conserva sus intentos e historial de XP
    const afterArchiveLibrary = await listPublicLibraryCatalogUseCase({
      subjectsRepo: store,
    });
    expect(afterArchiveLibrary.ok).toBe(true);
    if (afterArchiveLibrary.ok) {
      expect(afterArchiveLibrary.data.map((s) => s.id)).not.toContain(
        "pub-bioestadistica-draft"
      );
    }

    const studentAttempts = await store.listAttemptsByUser(normalUser.userId);
    const studentXp = await store.listXpEventsByUser(normalUser.userId);
    expect(studentAttempts.ok && studentAttempts.data).toHaveLength(1);
    expect(studentXp.ok && studentXp.data[0]?.points).toBe(10);
  });
});
