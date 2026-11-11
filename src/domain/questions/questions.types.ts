import type {
  ContentStatus,
  QuestionDifficulty,
  QuestionType,
} from "@/domain/models/studyplay";

export type QuestionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN_NOT_OWNER"
  | "QUESTION_NOT_FOUND"
  | "TOPIC_NOT_FOUND"
  | "SUBJECT_NOT_FOUND"
  | "INVALID_SOURCE_DOCUMENT"
  | "INVALID_SOURCE_PAGE"
  | "EMPTY_QUESTION_PROMPT"
  | "MISSING_GENERAL_EXPLANATION"
  | "EMPTY_OPTION_TEXT"
  | "INSUFFICIENT_OPTIONS"
  | "INVALID_SINGLE_CHOICE_CORRECT_COUNT"
  | "INVALID_TRUE_FALSE_CONFIG"
  | "INVALID_MULTIPLE_SELECT_CONFIG";

export interface QuestionDomainError {
  code: QuestionErrorCode;
  message: string;
}

export type QuestionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: QuestionDomainError };

export interface QuestionOptionEntity {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  sortOrder: number;
}

export interface QuestionEntity {
  id: string;
  topicId: string;
  topicTitle?: string;
  subjectId?: string;
  subjectTitle?: string;
  authorId: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  difficulty: QuestionDifficulty;
  status: ContentStatus;
  sourceDocumentId: string | null;
  sourceDocumentName: string | null;
  sourceDocumentAvailable: boolean;
  sourcePage: number | null;
  version: number;
  options: QuestionOptionEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOptionInput {
  id?: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
  sortOrder?: number;
}

export interface CreateQuestionInput {
  topicId: string;
  type: QuestionType;
  prompt: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  status?: ContentStatus;
  sourceDocumentId?: string | null;
  sourceDocumentName?: string | null;
  sourcePage?: number | null;
  options: QuestionOptionInput[];
}

export interface UpdateQuestionInput {
  type?: QuestionType;
  prompt?: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  status?: ContentStatus;
  sourceDocumentId?: string | null;
  sourceDocumentName?: string | null;
  sourcePage?: number | null;
  options?: QuestionOptionInput[];
}
