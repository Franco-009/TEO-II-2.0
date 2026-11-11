import type { AdminRepository } from "@/domain/admin/admin.ports";
import {
  assertAdminActor,
  assertSubjectIsPublic,
  buildAdminAuditLogInput,
  filterPublicLibraryCatalog,
  validatePublicSubjectPublicationEligibility,
} from "@/domain/admin/admin.rules";
import type {
  AdminAuditLogEntity,
  AdminDashboardSummary,
  AdminResult,
  CreatePublicSubjectDraftInput,
  ModeratePublicSubjectInput,
  PublicLibraryFilterInput,
  PublicSubjectModerationItem,
} from "@/domain/admin/admin.types";
import type { QuestionsRepository } from "@/domain/questions/questions.ports";
import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import { validateCreateSubject } from "@/domain/subjects/subjects.rules";
import type {
  ActorContext,
  SubjectEntity,
} from "@/domain/subjects/subjects.types";
import type { TopicsRepository } from "@/domain/topics/topics.ports";

/**
 * Obtiene el resumen completo del Panel de Administración (`/admin` y `/admin/content`):
 * - Verifica rol `admin` en el servidor (`assertAdminActor`).
 * - Carga todas las materias con `visibility = 'public'` (en estados `draft`, `published` y `archived`),
 *   evaluando su elegibilidad de publicación (`>= 1` tema y `>= 1` pregunta publicada con explicación).
 * - Incluye la bitácora de auditoría administrativa reciente (`admin_audit_logs`).
 */
export async function getAdminDashboardSummaryUseCase(params: {
  adminRepo: AdminRepository;
  topicsRepo: TopicsRepository;
  questionsRepo: QuestionsRepository;
  actor: ActorContext | null;
}): Promise<AdminResult<AdminDashboardSummary>> {
  const { adminRepo, topicsRepo, questionsRepo, actor } = params;

  const adminCheck = assertAdminActor(actor);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const [subjectsRes, logsRes] = await Promise.all([
    adminRepo.listAllPublicSubjectsForModeration(),
    adminRepo.listAuditLogs(20),
  ]);

  if (!subjectsRes.ok) {
    return subjectsRes;
  }

  // Filtrar por defensa en profundidad únicamente materias públicas
  const publicSubjects = subjectsRes.data.filter(
    (s) => s.visibility === "public"
  );

  const moderationQueue: PublicSubjectModerationItem[] = [];
  let totalPublicQuestionsCount = 0;

  for (const subject of publicSubjects) {
    const [topicsRes, questionsRes] = await Promise.all([
      topicsRepo.listBySubject(subject.id),
      questionsRepo.listQuestionsBySubject(subject.id),
    ]);

    const topics = topicsRes.ok ? topicsRes.data : [];
    const questions = questionsRes.ok ? questionsRes.data : [];

    const eligibilityRes = validatePublicSubjectPublicationEligibility({
      subject,
      topicsCount: topics.length,
      questions,
    });

    const publishedQCount = questions.filter(
      (q) => q.status === "published"
    ).length;
    const draftQCount = questions.filter((q) => q.status === "draft").length;

    if (subject.status === "published") {
      totalPublicQuestionsCount += publishedQCount;
    }

    moderationQueue.push({
      subject: {
        ...subject,
        topicsCount: topics.length,
        questionsCount: publishedQCount,
      },
      topicsCount: topics.length,
      publishedQuestionsCount: publishedQCount,
      draftQuestionsCount: draftQCount,
      isEligibleForPublication: eligibilityRes.ok,
      validationNotes: eligibilityRes.ok
        ? eligibilityRes.data.validationNotes
        : eligibilityRes.error.message,
    });
  }

  const publishedCount = moderationQueue.filter(
    (m) => m.subject.status === "published"
  ).length;
  const draftCount = moderationQueue.filter(
    (m) => m.subject.status === "draft"
  ).length;
  const archivedCount = moderationQueue.filter(
    (m) => m.subject.status === "archived"
  ).length;

  return {
    ok: true,
    data: {
      publishedCount,
      draftCount,
      archivedCount,
      totalPublicQuestionsCount,
      moderationQueue,
      recentAuditLogs: logsRes.ok ? logsRes.data : [],
    },
  };
}

/**
 * Modera el estado de una materia del catálogo público (`draft` | `published` | `archived`):
 * - Exige rol `admin` verificado en servidor (`FORBIDDEN_ADMIN_ONLY` para rol `user`).
 * - Rechaza cualquier intento de moderar una materia privada (`NOT_PUBLIC_SUBJECT`).
 * - Si `targetStatus === 'published'`, exige elegibilidad completa (`>= 1` tema y `>= 1` pregunta publicada válida).
 * - Registra la acción en `public.admin_audit_logs`.
 */
export async function moderatePublicSubjectUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  questionsRepo: QuestionsRepository;
  adminRepo: AdminRepository;
  actor: ActorContext | null;
  input: ModeratePublicSubjectInput;
}): Promise<
  AdminResult<{
    subject: SubjectEntity;
    auditLog: AdminAuditLogEntity;
  }>
> {
  const { subjectsRepo, topicsRepo, questionsRepo, adminRepo, actor, input } =
    params;

  const adminCheck = assertAdminActor(actor);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const foundRes = await subjectsRepo.findById(input.subjectId);
  if (!foundRes.ok || !foundRes.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia solicitada no existe.",
      },
    };
  }

  const publicCheck = assertSubjectIsPublic(foundRes.data);
  if (!publicCheck.ok) {
    return publicCheck;
  }

  const subject = publicCheck.data;

  // Si se solicita publicar en el catálogo público, verificar requisitos de elegibilidad
  if (input.targetStatus === "published") {
    const [topicsRes, questionsRes] = await Promise.all([
      topicsRepo.listBySubject(subject.id),
      questionsRepo.listQuestionsBySubject(subject.id),
    ]);

    const topicsCount = topicsRes.ok ? topicsRes.data.length : 0;
    const questions = questionsRes.ok ? questionsRes.data : [];

    const eligibilityRes = validatePublicSubjectPublicationEligibility({
      subject,
      topicsCount,
      questions,
    });

    if (!eligibilityRes.ok) {
      return eligibilityRes;
    }
  }

  const previousStatus = subject.status;
  const nextPublishedAt =
    input.targetStatus === "published"
      ? subject.publishedAt ?? new Date().toISOString()
      : subject.publishedAt;

  const updateRes = await subjectsRepo.update(subject.id, {
    title: subject.title,
    description: subject.description,
    visibility: "public",
    status: input.targetStatus,
    publishedAt: nextPublishedAt,
  });

  if (!updateRes.ok) {
    return {
      ok: false,
      error: {
        code: "PERSISTENCE_ERROR",
        message: updateRes.error.message,
      },
    };
  }

  const auditPayload = buildAdminAuditLogInput({
    actorId: adminCheck.data.userId,
    subject: updateRes.data,
    previousStatus,
    newStatus: input.targetStatus,
    notes: input.notes,
  });

  const auditRes = await adminRepo.recordAuditLog(auditPayload);
  if (!auditRes.ok) {
    return auditRes;
  }

  return {
    ok: true,
    data: {
      subject: updateRes.data,
      auditLog: auditRes.data,
    },
  };
}

/**
 * Caso de uso específico para aprobar y publicar una materia pública en el catálogo general (`PublishPublicContent`).
 */
export async function publishPublicContentUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  questionsRepo: QuestionsRepository;
  adminRepo: AdminRepository;
  actor: ActorContext | null;
  subjectId: string;
  notes?: string;
}): Promise<
  AdminResult<{
    subject: SubjectEntity;
    auditLog: AdminAuditLogEntity;
  }>
> {
  return moderatePublicSubjectUseCase({
    subjectsRepo: params.subjectsRepo,
    topicsRepo: params.topicsRepo,
    questionsRepo: params.questionsRepo,
    adminRepo: params.adminRepo,
    actor: params.actor,
    input: {
      subjectId: params.subjectId,
      targetStatus: "published",
      notes: params.notes,
    },
  });
}

/**
 * Permite a un administrador crear una nueva materia pública en estado inicial `draft`
 * para preparar su temario y banco de preguntas antes de publicarla en `/library`.
 */
export async function createPublicSubjectDraftUseCase(params: {
  subjectsRepo: SubjectsRepository;
  adminRepo: AdminRepository;
  actor: ActorContext | null;
  input: CreatePublicSubjectDraftInput;
}): Promise<
  AdminResult<{
    subject: SubjectEntity;
    auditLog: AdminAuditLogEntity;
  }>
> {
  const { subjectsRepo, adminRepo, actor, input } = params;

  const adminCheck = assertAdminActor(actor);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const validated = validateCreateSubject(adminCheck.data, {
    title: input.title,
    description: input.description,
    visibility: "public",
    status: "draft",
  });

  if (!validated.ok) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: validated.error.message,
      },
    };
  }

  const createdRes = await subjectsRepo.create({
    ownerId: adminCheck.data.userId,
    title: validated.data.title,
    description: validated.data.description,
    visibility: "public",
    status: "draft",
    publishedAt: null,
  });

  if (!createdRes.ok) {
    return {
      ok: false,
      error: {
        code: "PERSISTENCE_ERROR",
        message: createdRes.error.message,
      },
    };
  }

  const auditPayload = buildAdminAuditLogInput({
    actorId: adminCheck.data.userId,
    subject: createdRes.data,
    previousStatus: null,
    newStatus: "draft",
    action: "create_public_subject",
    notes: input.notes,
  });

  const auditRes = await adminRepo.recordAuditLog(auditPayload);
  if (!auditRes.ok) {
    return auditRes;
  }

  return {
    ok: true,
    data: {
      subject: createdRes.data,
      auditLog: auditRes.data,
    },
  };
}

/**
 * Lista las materias disponibles en el Catálogo Público Compartido (`/library`):
 * - Filtra estrictamente `visibility === 'public' && status === 'published'` (Caso Imprescindible #5).
 * - Enriquece cada materia con el conteo real de temas y preguntas publicadas.
 */
export async function listPublicLibraryCatalogUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo?: TopicsRepository;
  questionsRepo?: QuestionsRepository;
  filter?: PublicLibraryFilterInput;
}): Promise<AdminResult<SubjectEntity[]>> {
  const { subjectsRepo, topicsRepo, questionsRepo, filter } = params;

  const res = await subjectsRepo.listPublicPublished();
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: "PERSISTENCE_ERROR",
        message: res.error.message,
      },
    };
  }

  const filtered = filterPublicLibraryCatalog(res.data, filter);

  if (!topicsRepo || !questionsRepo) {
    return { ok: true, data: filtered };
  }

  const enriched: SubjectEntity[] = [];
  for (const subj of filtered) {
    const [tRes, qRes] = await Promise.all([
      topicsRepo.listBySubject(subj.id),
      questionsRepo.listQuestionsBySubject(subj.id),
    ]);

    const tCount = tRes.ok ? tRes.data.length : subj.topicsCount ?? 0;
    const pubQCount = qRes.ok
      ? qRes.data.filter((q) => q.status === "published").length
      : subj.questionsCount ?? 0;

    enriched.push({
      ...subj,
      topicsCount: tCount || (subj.topicsCount ?? 0),
      questionsCount: pubQCount || (subj.questionsCount ?? 0),
    });
  }

  return { ok: true, data: enriched };
}
