import type {
  DailyStreakSummary,
  UserLevelProgress,
  XpEventEntity,
} from "@/domain/gamification/gamification.types";

/**
 * Estados de dominio de un tema según cantidad de intentos y precisión:
 * - `insufficient_sample`: menos de `masteryMinAttempts` (5) intentos registrados.
 * - `needs_review`: >= 5 intentos con precisión baja (< 60%).
 * - `in_progress`: >= 5 intentos con precisión intermedia (60%..79%).
 * - `mastered`: >= 5 intentos con precisión alta (>= 80%).
 */
export type TopicMasteryStatus =
  | "insufficient_sample"
  | "needs_review"
  | "in_progress"
  | "mastered";

export interface DailyActivityEntity {
  id: string;
  userId: string;
  activityDate: string; // YYYY-MM-DD
  questionsAnswered: number;
  correctAnswers: number;
  quizzesCompleted: number;
  minutesStudied: number;
  updatedAt: string;
}

export interface RecordDailyActivityInput {
  userId: string;
  activityDate: string; // YYYY-MM-DD
  questionsAnsweredDelta?: number;
  correctAnswersDelta?: number;
  quizzesCompletedDelta?: number;
  minutesStudiedDelta?: number;
}

export interface TopicProgressStats {
  topicId: string;
  subjectId: string;
  subjectTitle: string;
  topicTitle: string;
  attemptsCount: number;
  correctCount: number;
  accuracy: number;
  masteryStatus: TopicMasteryStatus;
  hasMinSample: boolean;
  isMastered: boolean;
  needsReinforcement: boolean;
}

export interface SubjectProgressStats {
  subjectId: string;
  subjectTitle: string;
  visibility: "private" | "public";
  status: "draft" | "published" | "archived";
  topicsCount: number;
  masteredTopicsCount: number;
  questionsCount: number;
  documentsCount: number;
  attemptsCount: number;
  correctCount: number;
  accuracy: number;
  updatedAt: string;
}

export interface SessionXpBreakdown {
  sessionId: string;
  totalSessionXp: number;
  correctAnswersXp: number;
  completionBonusXp: number;
  dailyGoalBonusXp: number;
  masteredTopicsBonusXp: number;
  events: XpEventEntity[];
}

export interface UserProgressOverview {
  userId: string;
  levelProgress: UserLevelProgress;
  streak: DailyStreakSummary;
  dailyGoalQuestions: number;
  dailyAnsweredQuestions: number;
  dailyGoalPercent: number;
  dailyGoalReached: boolean;
  minutesStudiedToday: number;
  totalAttemptsCount: number;
  totalCorrectCount: number;
  globalAccuracy: number;
  masteredTopicsCount: number;
  evaluatedTopicsCount: number;
  topicsStats: TopicProgressStats[];
  weakTopics: TopicProgressStats[];
  subjectsStats: SubjectProgressStats[];
  recentXpEvents: XpEventEntity[];
}

export type ProgressErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "PERSISTENCE_ERROR";

export interface ProgressError {
  code: ProgressErrorCode;
  message: string;
}

export type ProgressResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProgressError };
