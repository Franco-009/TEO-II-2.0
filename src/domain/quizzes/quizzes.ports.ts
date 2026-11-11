import type { AttemptEntity } from "@/domain/attempts/attempts.types";
import type { QuizMode } from "@/domain/models/studyplay";
import type {
  QuizResult,
  QuizSessionEntity,
  QuizSessionSettings,
  QuizSessionStatus,
} from "./quizzes.types";

export interface QuizzesRepository {
  createQuizSessionRecord(params: {
    userId: string;
    subjectId: string;
    mode: QuizMode;
    settingsJson: QuizSessionSettings;
  }): Promise<QuizResult<QuizSessionEntity>>;

  findQuizSessionById(
    sessionId: string
  ): Promise<QuizResult<QuizSessionEntity | null>>;

  listQuizSessionsByUser(
    userId: string
  ): Promise<QuizResult<QuizSessionEntity[]>>;

  updateQuizSessionProgress(
    sessionId: string,
    params: {
      status: QuizSessionStatus;
      score: number;
      accuracy: number;
      completedAt: string | null;
    }
  ): Promise<QuizResult<QuizSessionEntity>>;

  recordAttemptIdempotent(params: {
    sessionId: string;
    userId: string;
    questionId: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
    elapsedMs: number;
    questionVersion: number;
  }): Promise<
    QuizResult<{
      attempt: AttemptEntity;
      wasDuplicateRetry: boolean;
    }>
  >;

  listAttemptsBySession(
    sessionId: string
  ): Promise<QuizResult<AttemptEntity[]>>;

  listAttemptsByUser(
    userId: string,
    subjectId?: string
  ): Promise<QuizResult<AttemptEntity[]>>;
}
