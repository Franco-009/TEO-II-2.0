import type { QuestionEntity } from "@/domain/questions/questions.types";

export interface AttemptResponsePayload {
  selectedOptionIds: string[];
}

export interface AttemptEntity {
  id: string;
  sessionId: string;
  userId: string;
  questionId: string;
  responseJson: AttemptResponsePayload;
  isCorrect: boolean;
  elapsedMs: number;
  answeredAt: string;
  questionVersion: number;
}

export interface MistakeQuestionItem {
  question: QuestionEntity;
  failedAttemptsCount: number;
  lastFailedAt: string;
  lastAttemptIsCorrect: boolean;
}
