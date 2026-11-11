import type {
  AdminAuditActionType,
  AdminResult,
  CreateAdminAuditLogInput,
  PublicLibraryFilterInput,
} from "@/domain/admin/admin.types";
import type { ContentStatus } from "@/domain/models/studyplay";
import { validateQuestionForPublication } from "@/domain/questions/questions.rules";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import type {
  ActorContext,
  SubjectEntity,
} from "@/domain/subjects/subjects.types";

/**
 * Verifica de manera determinista en el servidor que el actor autenticado posea rol `admin`.
 * Nunca confía en flags del cliente.
 */
export function assertAdminActor(
  actor: ActorContext | null | undefined
): AdminResult<ActorContext> {
  if (!actor || !actor.userId || !actor.userId.trim()) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message:
          "Debes iniciar sesión para acceder a operaciones administrativas.",
      },
    };
  }

  if (actor.role !== "admin") {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_ADMIN_ONLY",
        message:
          "Acceso denegado: esta operación requiere rol de administrador (admin) verificado en el servidor.",
      },
    };
  }

  return { ok: true, data: actor };
}

/**
 * Verifica que una materia pertenezca al catálogo público (`visibility === 'public'`).
 * Impide que el panel administrativo modere o altere materias privadas de usuarios (`NOT_PUBLIC_SUBJECT`).
 */
export function assertSubjectIsPublic(
  subject: SubjectEntity | null | undefined
): AdminResult<SubjectEntity> {
  if (!subject) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia solicitada no existe.",
      },
    };
  }

  if (subject.visibility !== "public") {
    return {
      ok: false,
      error: {
        code: "NOT_PUBLIC_SUBJECT",
        message:
          "Operación denegada: el panel de administración solo puede moderar materias del catálogo público (visibility = 'public').",
      },
    };
  }

  return { ok: true, data: subject };
}

/**
 * Evalúa si una materia pública cumple todos los requisitos para pasar a `status = 'published'`
 * en el catálogo público compartido:
 * 1. `subject.visibility === 'public'`
 * 2. Al menos 1 tema registrado (`topicsCount >= 1`)
 * 3. Al menos 1 pregunta en estado `published` que cumpla `validateQuestionForPublication`
 *    (enunciado, explicación completa y opciones deterministas válidas).
 */
export function validatePublicSubjectPublicationEligibility(params: {
  subject: SubjectEntity;
  topicsCount: number;
  questions: QuestionEntity[];
}): AdminResult<{
  topicsCount: number;
  publishedQuestionsCount: number;
  draftQuestionsCount: number;
  validationNotes: string;
}> {
  const { subject, topicsCount, questions } = params;

  const publicCheck = assertSubjectIsPublic(subject);
  if (!publicCheck.ok) {
    return publicCheck;
  }

  const validPublishedQuestions = questions.filter((q) => {
    if (q.status !== "published") {
      return false;
    }
    const pubCheck = validateQuestionForPublication({
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation,
      difficulty: q.difficulty,
      sourcePage: q.sourcePage,
      options: q.options,
    });
    return pubCheck.ok;
  });

  const publishedQuestionsCount = validPublishedQuestions.length;
  const draftQuestionsCount = questions.filter(
    (q) => q.status === "draft"
  ).length;

  if (topicsCount < 1) {
    return {
      ok: false,
      error: {
        code: "PUBLICATION_REQUIREMENTS_NOT_MET",
        message:
          "No se puede publicar una materia en el catálogo público sin al menos 1 tema creado.",
      },
    };
  }

  if (publishedQuestionsCount < 1) {
    return {
      ok: false,
      error: {
        code: "PUBLICATION_REQUIREMENTS_NOT_MET",
        message:
          "No se puede publicar una materia en el catálogo público sin al menos 1 pregunta publicada con explicación completa y opciones válidas.",
      },
    };
  }

  return {
    ok: true,
    data: {
      topicsCount,
      publishedQuestionsCount,
      draftQuestionsCount,
      validationNotes: `Elegible para catálogo público: ${topicsCount} tema(s) y ${publishedQuestionsCount} pregunta(s) publicada(s) verificada(s).`,
    },
  };
}

/**
 * Resuelve el tipo de acción de auditoría administrativa según el estado destino.
 */
export function resolveAuditActionFromStatus(
  targetStatus: ContentStatus
): AdminAuditActionType {
  switch (targetStatus) {
    case "published":
      return "publish_subject";
    case "draft":
      return "unpublish_subject_to_draft";
    case "archived":
      return "archive_subject";
  }
}

/**
 * Construye de forma determinista el payload de auditoría administrativa para `public.admin_audit_logs`.
 */
export function buildAdminAuditLogInput(params: {
  actorId: string;
  subject: SubjectEntity;
  previousStatus: ContentStatus | null;
  newStatus: ContentStatus;
  action?: AdminAuditActionType;
  notes?: string;
}): CreateAdminAuditLogInput {
  const resolvedAction =
    params.action ?? resolveAuditActionFromStatus(params.newStatus);

  const defaultNotesByAction: Record<AdminAuditActionType, string> = {
    publish_subject:
      "Materia verificada y publicada en el catálogo público general (visibility=public, status=published).",
    unpublish_subject_to_draft:
      "Materia retirada temporalmente del catálogo público a estado borrador (draft) para revisión.",
    archive_subject:
      "Materia pública archivada (archived): oculta en búsquedas nuevas conservando el historial de intentos previos.",
    create_public_subject:
      "Creación de nueva materia pública en la cola de moderación administrativa.",
  };

  const trimmedNotes = params.notes?.trim();

  return {
    actorId: params.actorId.trim(),
    action: resolvedAction,
    targetType: "subject",
    targetId: params.subject.id,
    targetTitle: params.subject.title.trim(),
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    notes:
      trimmedNotes && trimmedNotes.length > 0
        ? trimmedNotes.slice(0, 500)
        : defaultNotesByAction[resolvedAction],
  };
}

/**
 * Filtra de forma determinista el catálogo público compartido (`/library`):
 * - Caso Imprescindible #5: SOLO incluye materias con `visibility === 'public'` y `status === 'published'`.
 * - Excluye materias privadas y materias públicas en `draft` o `archived`.
 * - Aplica búsqueda insensible a mayúsculas/minúsculas por título, descripción o autor si `filter.query` está presente.
 */
export function filterPublicLibraryCatalog(
  subjects: SubjectEntity[],
  filter?: PublicLibraryFilterInput
): SubjectEntity[] {
  const rawQuery = filter?.query?.trim().toLowerCase() ?? "";

  return subjects.filter((s) => {
    if (s.visibility !== "public" || s.status !== "published") {
      return false;
    }

    if (!rawQuery) {
      return true;
    }

    const haystack = [s.title, s.description, s.authorName ?? ""]
      .join(" ")
      .toLowerCase();

    return haystack.includes(rawQuery);
  });
}
