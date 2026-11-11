import type {
  ContentStatus,
  QuestionDifficulty,
  QuestionType,
} from "@/domain/models/studyplay";
import type { QuestionsRepository } from "@/domain/questions/questions.ports";
import type {
  QuestionEntity,
  QuestionOptionEntity,
  QuestionResult,
} from "@/domain/questions/questions.types";
import { defaultInMemoryCatalogStore } from "./in-memory-catalog.store";
import { createServerSupabaseClient } from "./server-client";

interface QuestionOptionRow {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  feedback: string;
  sort_order: number;
}

interface QuestionRow {
  id: string;
  topic_id: string;
  author_id: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  difficulty: QuestionDifficulty;
  status: ContentStatus;
  source_document_id: string | null;
  source_document_name: string | null;
  source_page: number | null;
  version: number;
  created_at: string;
  updated_at: string;
  question_options?: QuestionOptionRow[];
}

function mapQuestionRow(row: QuestionRow): QuestionEntity {
  const options: QuestionOptionEntity[] = (row.question_options ?? [])
    .map((opt) => ({
      id: opt.id,
      questionId: opt.question_id,
      text: opt.text,
      isCorrect: opt.is_correct,
      feedback: opt.feedback,
      sortOrder: opt.sort_order,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: row.id,
    topicId: row.topic_id,
    authorId: row.author_id,
    type: row.type,
    prompt: row.prompt,
    explanation: row.explanation,
    difficulty: row.difficulty,
    status: row.status,
    sourceDocumentId: row.source_document_id,
    sourceDocumentName: row.source_document_name,
    sourceDocumentAvailable: Boolean(row.source_document_id),
    sourcePage: row.source_page,
    version: row.version,
    options,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const QUESTION_SELECT_COLUMNS =
  "id, topic_id, author_id, type, prompt, explanation, difficulty, status, source_document_id, source_document_name, source_page, version, created_at, updated_at, question_options(id, question_id, text, is_correct, feedback, sort_order)";

export class SupabaseQuestionsRepository implements QuestionsRepository {
  async listQuestionsByTopic(
    topicId: string
  ): Promise<QuestionResult<QuestionEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listQuestionsByTopic(topicId);
    }

    const { data, error } = await supabase
      .from("questions")
      .select(QUESTION_SELECT_COLUMNS)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: { code: "QUESTION_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: (data as unknown as QuestionRow[]).map(mapQuestionRow),
    };
  }

  async listQuestionsBySubject(
    subjectId: string
  ): Promise<QuestionResult<QuestionEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listQuestionsBySubject(subjectId);
    }

    const { data: topicsData, error: topicsErr } = await supabase
      .from("topics")
      .select("id")
      .eq("subject_id", subjectId);

    if (topicsErr) {
      return {
        ok: false,
        error: { code: "TOPIC_NOT_FOUND", message: topicsErr.message },
      };
    }

    const topicIds = (topicsData ?? []).map((t: { id: string }) => t.id);
    if (topicIds.length === 0) {
      return { ok: true, data: [] };
    }

    const { data, error } = await supabase
      .from("questions")
      .select(QUESTION_SELECT_COLUMNS)
      .in("topic_id", topicIds)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: { code: "QUESTION_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: (data as unknown as QuestionRow[]).map(mapQuestionRow),
    };
  }

  async findQuestionById(
    questionId: string
  ): Promise<QuestionResult<QuestionEntity | null>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.findQuestionById(questionId);
    }

    const { data, error } = await supabase
      .from("questions")
      .select(QUESTION_SELECT_COLUMNS)
      .eq("id", questionId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: { code: "QUESTION_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: data ? mapQuestionRow(data as unknown as QuestionRow) : null,
    };
  }

  async createQuestionRecord(params: {
    topicId: string;
    authorId: string;
    type: QuestionType;
    prompt: string;
    explanation: string;
    difficulty: QuestionDifficulty;
    status: ContentStatus;
    sourceDocumentId: string | null;
    sourceDocumentName: string | null;
    sourcePage: number | null;
    version: number;
    options: Array<{
      id?: string;
      text: string;
      isCorrect: boolean;
      feedback: string;
      sortOrder: number;
    }>;
  }): Promise<QuestionResult<QuestionEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.createQuestionRecord(params);
    }

    const { data: qData, error: qError } = await supabase
      .from("questions")
      .insert({
        topic_id: params.topicId,
        author_id: params.authorId,
        type: params.type,
        prompt: params.prompt,
        explanation: params.explanation,
        difficulty: params.difficulty,
        status: params.status,
        source_document_id: params.sourceDocumentId,
        source_document_name: params.sourceDocumentName,
        source_page: params.sourcePage,
        version: params.version,
      })
      .select("id")
      .single();

    if (qError || !qData) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN_NOT_OWNER",
          message: qError?.message ?? "No se pudo crear la pregunta.",
        },
      };
    }

    const createdId = (qData as { id: string }).id;

    if (params.options.length > 0) {
      const optionRows = params.options.map((opt) => ({
        question_id: createdId,
        text: opt.text,
        is_correct: opt.isCorrect,
        feedback: opt.feedback,
        sort_order: opt.sortOrder,
      }));

      const { error: optError } = await supabase
        .from("question_options")
        .insert(optionRows);

      if (optError) {
        return {
          ok: false,
          error: {
            code: "FORBIDDEN_NOT_OWNER",
            message: optError.message,
          },
        };
      }
    }

    const fetched = await this.findQuestionById(createdId);
    if (!fetched.ok || !fetched.data) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "No se pudo recuperar la pregunta recién creada.",
        },
      };
    }

    return { ok: true, data: fetched.data };
  }

  async updateQuestionRecord(
    questionId: string,
    params: {
      type: QuestionType;
      prompt: string;
      explanation: string;
      difficulty: QuestionDifficulty;
      status: ContentStatus;
      sourceDocumentId: string | null;
      sourceDocumentName: string | null;
      sourcePage: number | null;
      version: number;
      options: Array<{
        id?: string;
        text: string;
        isCorrect: boolean;
        feedback: string;
        sortOrder: number;
      }>;
    }
  ): Promise<QuestionResult<QuestionEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.updateQuestionRecord(
        questionId,
        params
      );
    }

    // 1. Reemplazar opciones primero para que el trigger de validación de publicación vea el conjunto actualizado
    await supabase
      .from("question_options")
      .delete()
      .eq("question_id", questionId);

    if (params.options.length > 0) {
      const optionRows = params.options.map((opt) => ({
        question_id: questionId,
        text: opt.text,
        is_correct: opt.isCorrect,
        feedback: opt.feedback,
        sort_order: opt.sortOrder,
      }));
      const { error: optErr } = await supabase
        .from("question_options")
        .insert(optionRows);

      if (optErr) {
        return {
          ok: false,
          error: { code: "FORBIDDEN_NOT_OWNER", message: optErr.message },
        };
      }
    }

    // 2. Actualizar cabecera y versión de la pregunta
    const { error: qErr } = await supabase
      .from("questions")
      .update({
        type: params.type,
        prompt: params.prompt,
        explanation: params.explanation,
        difficulty: params.difficulty,
        status: params.status,
        source_document_id: params.sourceDocumentId,
        source_document_name: params.sourceDocumentName,
        source_page: params.sourcePage,
        version: params.version,
      })
      .eq("id", questionId);

    if (qErr) {
      return {
        ok: false,
        error: { code: "FORBIDDEN_NOT_OWNER", message: qErr.message },
      };
    }

    const fetched = await this.findQuestionById(questionId);
    if (!fetched.ok || !fetched.data) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "No se pudo leer la pregunta actualizada.",
        },
      };
    }

    return { ok: true, data: fetched.data };
  }

  async updateQuestionStatus(
    questionId: string,
    status: ContentStatus
  ): Promise<QuestionResult<QuestionEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.updateQuestionStatus(
        questionId,
        status
      );
    }

    const { error } = await supabase
      .from("questions")
      .update({ status })
      .eq("id", questionId);

    if (error) {
      return {
        ok: false,
        error: { code: "FORBIDDEN_NOT_OWNER", message: error.message },
      };
    }

    const fetched = await this.findQuestionById(questionId);
    if (!fetched.ok || !fetched.data) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "Pregunta no encontrada.",
        },
      };
    }

    return { ok: true, data: fetched.data };
  }

  async deleteQuestionRecord(
    questionId: string
  ): Promise<QuestionResult<{ deleted: true }>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.deleteQuestionRecord(questionId);
    }

    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      return {
        ok: false,
        error: { code: "FORBIDDEN_NOT_OWNER", message: error.message },
      };
    }

    return { ok: true, data: { deleted: true } };
  }
}
