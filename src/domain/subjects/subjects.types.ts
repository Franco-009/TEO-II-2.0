import type {
  ContentStatus,
  ContentVisibility,
  UserRole,
} from "@/domain/models/studyplay";

export type SubjectErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_SUBJECT_INPUT"
  | "FORBIDDEN_NOT_OWNER"
  | "FORBIDDEN_PUBLIC_CATALOG"
  | "SUBJECT_NOT_FOUND";

export interface SubjectDomainError {
  code: SubjectErrorCode;
  message: string;
}

export type SubjectResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SubjectDomainError };

export interface ActorContext {
  userId: string;
  role: UserRole;
}

export interface SubjectEntity {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  visibility: ContentVisibility;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
  topicsCount?: number;
  questionsCount?: number;
  documentsCount?: number;
  masteryAccuracy?: number;
  attemptsCount?: number;
}

export interface CreateSubjectInput {
  title: string;
  description?: string;
  visibility?: ContentVisibility;
  status?: ContentStatus;
}

export interface UpdateSubjectInput {
  title?: string;
  description?: string;
  visibility?: ContentVisibility;
  status?: ContentStatus;
}
