import type { TopicsRepository } from "@/domain/topics/topics.ports";
import type { TopicEntity, TopicResult } from "@/domain/topics/topics.types";
import { defaultInMemoryCatalogStore } from "./in-memory-catalog.store";
import { createServerSupabaseClient } from "./server-client";

interface TopicRow {
  id: string;
  subject_id: string;
  parent_topic_id: string | null;
  title: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapTopicRow(row: TopicRow): TopicEntity {
  return {
    id: row.id,
    subjectId: row.subject_id,
    parentTopicId: row.parent_topic_id,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questionsCount: 0,
    documentsCount: 0,
    accuracy: 0,
    attemptsCount: 0,
  };
}

export class SupabaseTopicsRepository implements TopicsRepository {
  async listBySubject(subjectId: string): Promise<TopicResult<TopicEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listBySubject(subjectId);
    }

    const { data, error } = await supabase
      .from("topics")
      .select(
        "id, subject_id, parent_topic_id, title, description, sort_order, created_at, updated_at"
      )
      .eq("subject_id", subjectId)
      .order("sort_order", { ascending: true });

    if (error) {
      return {
        ok: false,
        error: {
          code: "INVALID_TOPIC_INPUT",
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: (data as TopicRow[]).map(mapTopicRow),
    };
  }

  async findTopicById(
    topicId: string
  ): Promise<TopicResult<TopicEntity | null>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.findTopicById(topicId);
    }

    const { data, error } = await supabase
      .from("topics")
      .select(
        "id, subject_id, parent_topic_id, title, description, sort_order, created_at, updated_at"
      )
      .eq("id", topicId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: {
          code: "TOPIC_NOT_FOUND",
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: data ? mapTopicRow(data as TopicRow) : null,
    };
  }

  async createTopic(params: {
    subjectId: string;
    parentTopicId: string | null;
    title: string;
    description: string;
    sortOrder: number;
  }): Promise<TopicResult<TopicEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.createTopic(params);
    }

    const { data, error } = await supabase
      .from("topics")
      .insert({
        subject_id: params.subjectId,
        parent_topic_id: params.parentTopicId,
        title: params.title,
        description: params.description,
        sort_order: params.sortOrder,
      })
      .select(
        "id, subject_id, parent_topic_id, title, description, sort_order, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "INVALID_TOPIC_INPUT",
          message: error?.message ?? "No se pudo crear el tema.",
        },
      };
    }

    return { ok: true, data: mapTopicRow(data as TopicRow) };
  }

  async updateTopic(
    topicId: string,
    params: {
      parentTopicId: string | null;
      title: string;
      description: string;
      sortOrder: number;
    }
  ): Promise<TopicResult<TopicEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.updateTopic(topicId, params);
    }

    const { data, error } = await supabase
      .from("topics")
      .update({
        parent_topic_id: params.parentTopicId,
        title: params.title,
        description: params.description,
        sort_order: params.sortOrder,
      })
      .eq("id", topicId)
      .select(
        "id, subject_id, parent_topic_id, title, description, sort_order, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "INVALID_TOPIC_INPUT",
          message: error?.message ?? "No se pudo actualizar el tema.",
        },
      };
    }

    return { ok: true, data: mapTopicRow(data as TopicRow) };
  }

  async deleteTopic(
    topicId: string
  ): Promise<TopicResult<{ deleted: true }>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.deleteTopic(topicId);
    }

    const { error } = await supabase
      .from("topics")
      .delete()
      .eq("id", topicId);

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
