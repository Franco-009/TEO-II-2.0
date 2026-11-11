import type { AttemptEntity } from "@/domain/attempts/attempts.types";
import type { QuizMode } from "@/domain/models/studyplay";
import type { QuestionEntity } from "@/domain/questions/questions.types";

export type QuizSessionStatus = "in_progress" | "completed" | "abandoned";

export type QuizErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN_SESSION_OWNER"
  | "FORBIDDEN_SUBJECT_ACCESS"
  | "SESSION_NOT_FOUND"
  | "SESSION_CLOSED"
  | "SUBJECT_NOT_FOUND"
  | "NO_ELIGIBLE_QUESTIONS"
  | "QUESTION_NOT_IN_SESSION"
  | "EMPTY_ANSWER_SELECTION"
  | "INVALID_OPTION_ID"
  | "INVALID_SINGLE_CHOICE_SELECTION";

export interface QuizDomainError {
  code: QuizErrorCode;
  message: string;
}

export type QuizResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: QuizDomainError };

export interface QuizSessionSettings {
  questionCount: number;
  seed: string;
  topicId: string | null;
  questionIds: string[];
}

export interface QuizSessionEntity {
  id: string;
  userId: string;
  subjectId: string;
  subjectTitle?: string;
  mode: QuizMode;
  settingsJson: QuizSessionSettings;
  status: QuizSessionStatus;
  startedAt: string;
  completedAt: string | null;
  score: number;
  accuracy: number;
}

export interface OptionEvaluationFeedback {
  optionId: string;
  text: string;
  isSelected: boolean;
  isCorrect: boolean;
  feedback: string;
}

export interface AnswerEvaluationResult {
  questionId: string;
  questionVersion: number;
  isCorrect: boolean;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  generalExplanation: string;
  optionFeedbacks: OptionEvaluationFeedback[];
}

export interface StartQuizInput {
  subjectId: string;
  topicId?: string | null;
  mode: QuizMode;
  questionCount: number;
  seed?: string;
}

export interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  selectedOptionIds: string[];
  elapsedMs?: number;
}

export interface SubmitAnswerOutput {
  attempt: AttemptEntity;
  evaluation: AnswerEvaluationResult;
  sessionScore: number;
  sessionAccuracy: number;
  wasDuplicateRetry: boolean;
  xpAwarded?: number;
}

export interface QuizSessionDetail {
  session: QuizSessionEntity;
  questions: QuestionEntity[];
  attempts: AttemptEntity[];
}
