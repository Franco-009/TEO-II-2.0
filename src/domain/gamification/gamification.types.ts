/**
 * Tipos puros del dominio de Gamificación (Fase 7 — StudyPlay).
 * Sin dependencias de frameworks de UI ni SDKs externos.
 */

export type XpEventType =
  | "attempt_correct"
  | "quiz_completed"
  | "daily_goal_reached"
  | "topic_mastered";

export interface XpEventEntity {
  id: string;
  userId: string;
  eventKey: string;
  eventType: XpEventType;
  points: number;
  referenceId: string | null;
  createdAt: string;
}

export interface AwardXpInput {
  userId: string;
  eventKey: string;
  eventType: XpEventType;
  points: number;
  referenceId?: string | null;
}

export interface AwardXpOutput {
  event: XpEventEntity;
  wasDuplicate: boolean;
}

export interface UserLevelProgress {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

export interface DailyStreakSummary {
  streakDays: number;
  longestStreakDays: number;
  isActiveToday: boolean;
  lastActiveDate: string | null;
}
