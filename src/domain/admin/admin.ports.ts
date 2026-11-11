import type {
  AdminAuditLogEntity,
  AdminResult,
  CreateAdminAuditLogInput,
} from "@/domain/admin/admin.types";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";

/**
 * Puerto de persistencia para operaciones de moderación administrativa y auditoría (`public.admin_audit_logs`).
 */
export interface AdminRepository {
  /**
   * Lista todas las materias con `visibility = 'public'` en cualquier estado (`draft`, `published`, `archived`)
   * para la cola de revisión y moderación en `/admin/content`.
   * Nunca devuelve materias privadas (`visibility = 'private'`).
   */
  listAllPublicSubjectsForModeration(): Promise<AdminResult<SubjectEntity[]>>;

  /**
   * Registra un evento inmutable en `public.admin_audit_logs`.
   */
  recordAuditLog(
    input: CreateAdminAuditLogInput
  ): Promise<AdminResult<AdminAuditLogEntity>>;

  /**
   * Lista los eventos recientes de `public.admin_audit_logs` ordenados del más reciente al más antiguo.
   */
  listAuditLogs(limit?: number): Promise<AdminResult<AdminAuditLogEntity[]>>;
}
