import type {
  AwardXpInput,
  AwardXpOutput,
  XpEventEntity,
} from "@/domain/gamification/gamification.types";
import type {
  DailyActivityEntity,
  ProgressResult,
  RecordDailyActivityInput,
} from "@/domain/progress/progress.types";

/**
 * Puerto de persistencia para eventos de experiencia (`public.xp_events`)
 * y actividad diaria (`public.user_daily_activity`).
 */
export interface ProgressRepository {
  /**
   * Registra un evento XP de manera estrictamente idempotente por `eventKey`.
   * Si el `eventKey` ya existe en `xp_events`, devuelve el registro original con `wasDuplicate: true`
   * sin duplicar puntos (Caso Imprescindible #8).
   */
  awardXpEventIdempotent(
    input: AwardXpInput
  ): Promise<ProgressResult<AwardXpOutput>>;

  /**
   * Lista todos los eventos XP pertenecientes a un usuario, ordenados del más reciente al más antiguo.
   */
  listXpEventsByUser(userId: string): Promise<ProgressResult<XpEventEntity[]>>;

  /**
   * Incrementa o inicializa el registro de actividad diaria `(userId, activityDate)`.
   */
  recordDailyActivityIncrement(
    input: RecordDailyActivityInput
  ): Promise<ProgressResult<DailyActivityEntity>>;

  /**
   * Lista el historial de actividad diaria del usuario ordenado por `activityDate` descendente.
   */
  listDailyActivityByUser(
    userId: string
  ): Promise<ProgressResult<DailyActivityEntity[]>>;
}
