export type TopicErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_TOPIC_INPUT"
  | "FORBIDDEN_NOT_OWNER"
  | "INVALID_PARENT_TOPIC"
  | "TOPIC_CYCLE_DETECTED"
  | "TOPIC_NOT_FOUND";

export interface TopicDomainError {
  code: TopicErrorCode;
  message: string;
}

export type TopicResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TopicDomainError };

export interface TopicEntity {
  id: string;
  subjectId: string;
  parentTopicId: string | null;
  title: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  questionsCount?: number;
  documentsCount?: number;
  accuracy?: number;
  attemptsCount?: number;
}

export interface TopicTreeItem extends TopicEntity {
  depth: number;
  parentTitle: string | null;
}

export interface CreateTopicInput {
  subjectId: string;
  parentTopicId?: string | null;
  title: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateTopicInput {
  parentTopicId?: string | null;
  title?: string;
  description?: string;
  sortOrder?: number;
}
