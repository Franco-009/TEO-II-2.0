import type {
  ContentStatus,
  ContentVisibility,
} from "@/domain/models/studyplay";
import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import type {
  SubjectEntity,
  SubjectResult,
} from "@/domain/subjects/subjects.types";
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
    topicsCount: 0,
    questionsCount: 0,
    documentsCount: 0,
    masteryAccuracy: 0,
    attemptsCount: 0,
  };
}

export class SupabaseSubjectsRepository implements SubjectsRepository {
  async listByOwner(ownerId: string): Promise<SubjectResult<SubjectEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listByOwner(ownerId);
    }

    const { data, error } = await supabase
      .from("subjects")
      .select(
        "id, owner_id, title, description, visibility, status, published_at, created_at, updated_at"
      )
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: {
          code: "INVALID_SUBJECT_INPUT",
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: (data as SubjectRow[]).map(mapSubjectRow),
    };
  }

  async listPublicPublished(): Promise<SubjectResult<SubjectEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listPublicPublished();
    }

    const { data, error } = await supabase
      .from("subjects")
      .select(
        "id, owner_id, title, description, visibility, status, published_at, created_at, updated_at"
      )
      .eq("visibility", "public")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: {
          code: "INVALID_SUBJECT_INPUT",
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: (data as SubjectRow[]).map(mapSubjectRow),
    };
  }

  async findById(
    subjectId: string
  ): Promise<SubjectResult<SubjectEntity | null>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.findById(subjectId);
    }

    const { data, error } = await supabase
      .from("subjects")
      .select(
        "id, owner_id, title, description, visibility, status, published_at, created_at, updated_at"
      )
      .eq("id", subjectId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: {
          code: "SUBJECT_NOT_FOUND",
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: data ? mapSubjectRow(data as SubjectRow) : null,
    };
  }

  async create(params: {
    ownerId: string;
    title: string;
    description: string;
    visibility: ContentVisibility;
    status: ContentStatus;
    publishedAt: string | null;
  }): Promise<SubjectResult<SubjectEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.create(params);
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert({
        owner_id: params.ownerId,
        title: params.title,
        description: params.description,
        visibility: params.visibility,
        status: params.status,
        published_at: params.publishedAt,
      })
      .select(
        "id, owner_id, title, description, visibility, status, published_at, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "INVALID_SUBJECT_INPUT",
          message: error?.message ?? "No se pudo crear la materia.",
        },
      };
    }

    return { ok: true, data: mapSubjectRow(data as SubjectRow) };
  }

  async update(
    subjectId: string,
    params: {
      title: string;
      description: string;
      visibility: ContentVisibility;
      status: ContentStatus;
      publishedAt: string | null;
    }
  ): Promise<SubjectResult<SubjectEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.update(subjectId, params);
    }

    const { data, error } = await supabase
      .from("subjects")
      .update({
        title: params.title,
        description: params.description,
        visibility: params.visibility,
        status: params.status,
        published_at: params.publishedAt,
      })
      .eq("id", subjectId)
      .select(
        "id, owner_id, title, description, visibility, status, published_at, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN_NOT_OWNER",
          message: error?.message ?? "No se pudo actualizar la materia.",
        },
      };
    }

    return { ok: true, data: mapSubjectRow(data as SubjectRow) };
  }

  async delete(subjectId: string): Promise<SubjectResult<{ deleted: true }>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.delete(subjectId);
    }

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subjectId);

    if (error) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN_NOT_OWNER",
          message: error.message,
        },
      };
    }

    return { ok: true, data: { deleted: true } };
  }
}
