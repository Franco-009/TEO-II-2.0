import type { DocumentsRepository } from "@/domain/documents/documents.ports";
import type {
  DocumentEntity,
  DocumentResult,
  DocumentStatus,
} from "@/domain/documents/documents.types";
import { defaultInMemoryCatalogStore } from "./in-memory-catalog.store";
import { createServerSupabaseClient } from "./server-client";

interface DocumentRow {
  id: string;
  owner_id: string;
  subject_id: string;
  topic_id: string | null;
  storage_path: string;
  filename: string;
  mime_type: "application/pdf";
  size_bytes: number;
  status: DocumentStatus;
  created_at: string;
}

function mapDocumentRow(row: DocumentRow): DocumentEntity {
  return {
    id: row.id,
    ownerId: row.owner_id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    storagePath: row.storage_path,
    filename: row.filename,
    mimeType: "application/pdf",
    sizeBytes: row.size_bytes,
    status: row.status,
    linkedQuestionsCount: 0,
    createdAt: row.created_at,
  };
}

export class SupabaseDocumentsRepository implements DocumentsRepository {
  async listDocumentsByOwner(
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listDocumentsByOwner(ownerId);
    }

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, owner_id, subject_id, topic_id, storage_path, filename, mime_type, size_bytes, status, created_at"
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: { code: "DOCUMENT_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: (data as DocumentRow[]).map(mapDocumentRow),
    };
  }

  async listDocumentsBySubject(
    subjectId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listDocumentsBySubject(
        subjectId,
        ownerId
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, owner_id, subject_id, topic_id, storage_path, filename, mime_type, size_bytes, status, created_at"
      )
      .eq("subject_id", subjectId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: { code: "DOCUMENT_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: (data as DocumentRow[]).map(mapDocumentRow),
    };
  }

  async listDocumentsByTopic(
    topicId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.listDocumentsByTopic(topicId, ownerId);
    }

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, owner_id, subject_id, topic_id, storage_path, filename, mime_type, size_bytes, status, created_at"
      )
      .eq("topic_id", topicId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        error: { code: "DOCUMENT_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: (data as DocumentRow[]).map(mapDocumentRow),
    };
  }

  async findDocumentById(
    documentId: string
  ): Promise<DocumentResult<DocumentEntity | null>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.findDocumentById(documentId);
    }

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, owner_id, subject_id, topic_id, storage_path, filename, mime_type, size_bytes, status, created_at"
      )
      .eq("id", documentId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: { code: "DOCUMENT_NOT_FOUND", message: error.message },
      };
    }

    return {
      ok: true,
      data: data ? mapDocumentRow(data as DocumentRow) : null,
    };
  }

  async createDocumentRecord(params: {
    id: string;
    ownerId: string;
    subjectId: string;
    subjectTitle?: string;
    topicId: string | null;
    topicTitle?: string | null;
    storagePath: string;
    filename: string;
    mimeType: "application/pdf";
    sizeBytes: number;
    status: DocumentStatus;
  }): Promise<DocumentResult<DocumentEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.createDocumentRecord(params);
    }

    const { data, error } = await supabase
      .from("documents")
      .upsert(
        {
          id: params.id,
          owner_id: params.ownerId,
          subject_id: params.subjectId,
          topic_id: params.topicId,
          storage_path: params.storagePath,
          filename: params.filename,
          mime_type: params.mimeType,
          size_bytes: params.sizeBytes,
          status: params.status,
        },
        { onConflict: "id" }
      )
      .select(
        "id, owner_id, subject_id, topic_id, storage_path, filename, mime_type, size_bytes, status, created_at"
      )
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "STORAGE_UPLOAD_FAILED",
          message: error?.message ?? "No se pudo registrar el documento.",
        },
      };
    }

    return { ok: true, data: mapDocumentRow(data as DocumentRow) };
  }

  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus
  ): Promise<DocumentResult<DocumentEntity>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.updateDocumentStatus(
        documentId,
        status
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .update({ status })
      .eq("id", documentId)
      .select(
        "id, owner_id, subject_id, topic_id, storage_path, filename, mime_type, size_bytes, status, created_at"
      )
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: error?.message ?? "No se pudo actualizar el estado del PDF.",
        },
      };
    }

    return { ok: true, data: mapDocumentRow(data as DocumentRow) };
  }

  async deleteDocumentRecord(
    documentId: string
  ): Promise<
    DocumentResult<{
      deleted: true;
      preservedLinkedQuestions: number;
    }>
  > {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.deleteDocumentRecord(documentId);
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (error) {
      return {
        ok: false,
        error: { code: "FORBIDDEN_NOT_OWNER", message: error.message },
      };
    }

    return {
      ok: true,
      data: {
        deleted: true,
        preservedLinkedQuestions: 0,
      },
    };
  }
}
