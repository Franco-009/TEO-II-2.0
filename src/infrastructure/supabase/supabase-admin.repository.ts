import type { AdminRepository } from "@/domain/admin/admin.ports";
import type {
  AdminAuditActionType,
  AdminAuditLogEntity,
  AdminAuditTargetType,
  AdminResult,
  CreateAdminAuditLogInput,
} from "@/domain/admin/admin.types";
import type {
  ContentStatus,
  ContentVisibility,
} from "@/domain/models/studyplay";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";
import { defaultInMemoryCatalogStore } from "./in-memory-catalog.store";
import { createServerSupabaseClient } from "./server-client";

interface SubjectRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  visibility: ContentVisibility;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminAuditLogRow {
  id: string;
  actor_id: string;
  action: AdminAuditActionType;
  target_type: AdminAuditTargetType;
  target_id: string;
  target_title: string;
  previous_status: ContentStatus | null;
  new_status: ContentStatus;
  notes: string;
  created_at: string;
}

function mapSubjectRow(row: SubjectRow): SubjectEntity {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: "Equipo Académico StudyPlay",
    topicsCount: 0,
    questionsCount: 0,
    documentsCount: 0,
    masteryAccuracy: 0,
    attemptsCount: 0,
  };
}

function mapAuditLogRow(row: AdminAuditLogRow): AdminAuditLogEntity {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetTitle: row.target_title,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

const AUDIT_LOG_SELECT_COLUMNS =
  "id, actor_id, action, target_type, target_id, target_title, previous_status, new_status, notes, created_at";

export class SupabaseAdminRepository implements AdminRepository {
  async listAllPublicSubjectsForModeration(): Promise<
    AdminResult<SubjectEntity[]>
  > {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listAllPublicSubjectsForModeration();
    }

    const { data, error } = await supabase
      .from("subjects")
      .select(
        "id, owner_id, title, description, visibility, status, published_at, created_at, updated_at"
      )
      .eq("visibility", "public")
      .order("updated_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: ((data ?? []) as unknown as SubjectRow[]).map(mapSubjectRow),
    };
  }

  async recordAuditLog(
    input: CreateAdminAuditLogInput
  ): Promise<AdminResult<AdminAuditLogEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.recordAuditLog(input);
    }

    const { data, error } = await supabase
      .from("admin_audit_logs")
      .insert({
        actor_id: input.actorId,
        action: input.action,
        target_type: input.targetType ?? "subject",
        target_id: input.targetId,
        target_title: input.targetTitle.trim(),
        previous_status: input.previousStatus,
        new_status: input.newStatus,
        notes: (input.notes ?? "").trim().slice(0, 500),
      })
      .select(AUDIT_LOG_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message:
            error?.message ??
            "No se pudo registrar la bitácora de auditoría administrativa.",
        },
      };
    }

    return {
      ok: true,
      data: mapAuditLogRow(data as unknown as AdminAuditLogRow),
    };
  }

  async listAuditLogs(
    limit = 20
  ): Promise<AdminResult<AdminAuditLogEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listAuditLogs(limit);
    }

    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const { data, error } = await supabase
      .from("admin_audit_logs")
      .select(AUDIT_LOG_SELECT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      return {
        ok: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: ((data ?? []) as unknown as AdminAuditLogRow[]).map(mapAuditLogRow),
    };
  }
}
