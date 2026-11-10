/**
 * Entidades y tipos puros del dominio StudyPlay (según docs/04-MODELO-DATOS.md).
 * Sin dependencias de frameworks de UI ni SDKs externos.
 */

export type UserRole = "user" | "admin";

export type ContentVisibility = "private" | "public";

export type ContentStatus = "draft" | "published" | "archived";

export type QuestionType = "single_choice" | "true_false" | "multiple_select";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuizMode = "practice" | "challenge" | "mistakes";

export interface SubjectSummary {
  id: string;
  title: string;
  description: string;
  visibility: ContentVisibility;
  status: ContentStatus;
  topicsCount: number;
  questionsCount: number;
  documentsCount: number;
  masteryAccuracy: number;
  attemptsCount: number;
  updatedAt: string;
  authorName?: string;
}

export interface TopicNode {
  id: string;
  subjectId: string;
  parentTopicId: string | null;
  title: string;
  description: string;
  sortOrder: number;
  questionsCount: number;
  documentsCount: number;
  accuracy: number;
  attemptsCount: number;
}

export interface StudyDocument {
  id: string;
  subjectId: string;
  subjectTitle: string;
  topicId: string | null;
  topicTitle: string | null;
  filename: string;
  mimeType: "application/pdf";
  sizeBytes: number;
  status: "available" | "unavailable";
  linkedQuestionsCount: number;
  createdAt: string;
}

export interface QuestionOptionItem {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  sortOrder: number;
}

export interface QuestionItem {
  id: string;
  topicId: string;
  topicTitle: string;
  subjectTitle: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  difficulty: QuestionDifficulty;
  status: ContentStatus;
  sourceDocumentName: string | null;
  sourceDocumentAvailable: boolean;
  sourcePage: number | null;
  version: number;
  options: QuestionOptionItem[];
}
