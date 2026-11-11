import { describe, expect, it } from "vitest";
import {
  assertAdminActor,
  assertSubjectIsPublic,
  buildAdminAuditLogInput,
  filterPublicLibraryCatalog,
  validatePublicSubjectPublicationEligibility,
} from "../admin.rules";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";

const basePublicSubject: SubjectEntity = {
  id: "pub-test-1",
  ownerId: "usr-admin-1",
  title: "Física Médica y Radioprotección",
  description: "Dosimetría y radiobiología.",
  visibility: "public",
  status: "draft",
  publishedAt: null,
  createdAt: "2026-11-11T10:00:00.000Z",
  updatedAt: "2026-11-11T10:00:00.000Z",
  authorName: "Equipo Académico StudyPlay",
};

const validPublishedQuestion: QuestionEntity = {
  id: "q-valid-1",
  topicId: "top-1",
  authorId: "usr-admin-1",
  type: "single_choice",
  prompt: "¿Cuál es la unidad del Sistema Internacional para la dosis equivalente?",
  explanation:
    "El Sievert (Sv) mide la dosis equivalente ponderando el daño biológico por tipo de radiación.",
  difficulty: "easy",
  status: "published",
  sourceDocumentId: null,
  sourceDocumentName: null,
  sourceDocumentAvailable: false,
  sourcePage: null,
  version: 1,
  options: [
    {
      id: "opt-1",
      questionId: "q-valid-1",
      text: "Sievert (Sv)",
      isCorrect: true,
      feedback: "Correcto.",
      sortOrder: 1,
    },
    {
      id: "opt-2",
      questionId: "q-valid-1",
      text: "Becquerel (Bq)",
      isCorrect: false,
      feedback: "Incorrecto: el Becquerel mide actividad radiactiva.",
      sortOrder: 2,
    },
  ],
  createdAt: "2026-11-11T10:00:00.000Z",
  updatedAt: "2026-11-11T10:00:00.000Z",
};

describe("Reglas puras de Administración y Biblioteca Pública (Fase 8)", () => {
  it("assertAdminActor autoriza exclusivamente al rol 'admin' y rechaza visitantes o rol 'user'", () => {
    expect(assertAdminActor(null)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "UNAUTHORIZED" }),
    });

    expect(assertAdminActor({ userId: "usr-normal", role: "user" })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "FORBIDDEN_ADMIN_ONLY" }),
    });

    const adminRes = assertAdminActor({ userId: "usr-admin", role: "admin" });
    expect(adminRes.ok).toBe(true);
  });

  it("rechaza moderar materias privadas con NOT_PUBLIC_SUBJECT y exige >= 1 tema y >= 1 pregunta publicada válida para publicar", () => {
    const privateSubject: SubjectEntity = {
      ...basePublicSubject,
      id: "priv-1",
      visibility: "private",
    };

    const privCheck = assertSubjectIsPublic(privateSubject);
    expect(privCheck.ok).toBe(false);
    if (!privCheck.ok) {
      expect(privCheck.error.code).toBe("NOT_PUBLIC_SUBJECT");
    }

    // 1. Sin temas -> PUBLICATION_REQUIREMENTS_NOT_MET
    const noTopicsRes = validatePublicSubjectPublicationEligibility({
      subject: basePublicSubject,
      topicsCount: 0,
      questions: [validPublishedQuestion],
    });
    expect(noTopicsRes.ok).toBe(false);
    if (!noTopicsRes.ok) {
      expect(noTopicsRes.error.code).toBe("PUBLICATION_REQUIREMENTS_NOT_MET");
    }

    // 2. Con tema pero solo preguntas en draft -> PUBLICATION_REQUIREMENTS_NOT_MET
    const onlyDraftQuestionsRes = validatePublicSubjectPublicationEligibility({
      subject: basePublicSubject,
      topicsCount: 1,
      questions: [{ ...validPublishedQuestion, status: "draft" }],
    });
    expect(onlyDraftQuestionsRes.ok).toBe(false);
    if (!onlyDraftQuestionsRes.ok) {
      expect(onlyDraftQuestionsRes.error.code).toBe(
        "PUBLICATION_REQUIREMENTS_NOT_MET"
      );
    }

    // 3. Con >= 1 tema y >= 1 pregunta publicada válida -> ok: true
    const eligibleRes = validatePublicSubjectPublicationEligibility({
      subject: basePublicSubject,
      topicsCount: 1,
      questions: [validPublishedQuestion],
    });
    expect(eligibleRes.ok).toBe(true);
    if (eligibleRes.ok) {
      expect(eligibleRes.data.publishedQuestionsCount).toBe(1);
    }
  });

  it("Caso Imprescindible #5: filterPublicLibraryCatalog incluye solo visibility='public' AND status='published' y filtra por texto", () => {
    const catalog: SubjectEntity[] = [
      { ...basePublicSubject, id: "pub-published", status: "published" },
      { ...basePublicSubject, id: "pub-draft", status: "draft" },
      { ...basePublicSubject, id: "pub-archived", status: "archived" },
      {
        ...basePublicSubject,
        id: "priv-published",
        visibility: "private",
        status: "published",
      },
    ];

    const visible = filterPublicLibraryCatalog(catalog);
    expect(visible.map((s) => s.id)).toEqual(["pub-published"]);

    const bySearchMatch = filterPublicLibraryCatalog(catalog, {
      query: "radioprotección",
    });
    expect(bySearchMatch).toHaveLength(1);

    const bySearchMiss = filterPublicLibraryCatalog(catalog, {
      query: "derecho romano",
    });
    expect(bySearchMiss).toHaveLength(0);
  });

  it("construye entradas deterministas para public.admin_audit_logs", () => {
    const auditInput = buildAdminAuditLogInput({
      actorId: "usr-admin-1",
      subject: basePublicSubject,
      previousStatus: "draft",
      newStatus: "published",
    });

    expect(auditInput.action).toBe("publish_subject");
    expect(auditInput.previousStatus).toBe("draft");
    expect(auditInput.newStatus).toBe("published");
    expect(auditInput.targetTitle).toBe("Física Médica y Radioprotección");
    expect((auditInput.notes ?? "").length).toBeGreaterThan(10);
  });
});
