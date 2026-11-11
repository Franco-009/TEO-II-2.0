import type { ContentStatus } from "@/domain/models/studyplay";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";

/**
 * Tipos y contratos puros del dominio de Administración y Biblioteca Pública (Fase 8).
 * Sin dependencias de frameworks de UI ni SDKs externos.
 */

export type AdminAuditActionType =
  | "publish_subject"
  | "unpublish_subject_to_draft"
  | "archive_subject"
  | "create_public_subject";

export type AdminAuditTargetType = "subject" | "question_bank";

export interface AdminAuditLogEntity {
  id: string;
  actorId: string;
  action: AdminAuditActionType;
  targetType: AdminAuditTargetType;
  targetId: string;
  targetTitle: string;
  previousStatus: ContentStatus | null;
  newStatus: ContentStatus;
  notes: string;
  createdAt: string;
}

export interface CreateAdminAuditLogInput {
  actorId: string;
  action: AdminAuditActionType;
  targetType?: AdminAuditTargetType;
  targetId: string;
  targetTitle: string;
  previousStatus: ContentStatus | null;
  newStatus: ContentStatus;
  notes?: string;
}

export interface PublicSubjectModerationItem {
  subject: SubjectEntity;
  topicsCount: number;
  publishedQuestionsCount: number;
  draftQuestionsCount: number;
  isEligibleForPublication: boolean;
  validationNotes: string;
}

export interface AdminDashboardSummary {
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  totalPublicQuestionsCount: number;
  moderationQueue: PublicSubjectModerationItem[];
  recentAuditLogs: AdminAuditLogEntity[];
}

export interface ModeratePublicSubjectInput {
  subjectId: string;
  targetStatus: ContentStatus;
  notes?: string;
}

export interface CreatePublicSubjectDraftInput {
  title: string;
  description: string;
  notes?: string;
}

export interface PublicLibraryFilterInput {
  query?: string;
}

export type AdminErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "FORBIDDEN_ADMIN_ONLY"
  | "SUBJECT_NOT_FOUND"
  | "NOT_PUBLIC_SUBJECT"
  | "PUBLICATION_REQUIREMENTS_NOT_MET"
  | "VALIDATION_ERROR"
  | "PERSISTENCE_ERROR";

export interface AdminError {
  code: AdminErrorCode;
  message: string;
}

export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AdminError };
