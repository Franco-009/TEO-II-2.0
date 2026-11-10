import type { PrivateDocumentStoragePort } from "@/domain/documents/documents.ports";
import {
  STUDY_DOCUMENTS_BUCKET,
  type DocumentResult,
  type SignedDocumentUrl,
} from "@/domain/documents/documents.types";
import { defaultInMemoryCatalogStore } from "@/infrastructure/supabase/in-memory-catalog.store";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server-client";

export class SupabasePrivateStorageAdapter
  implements PrivateDocumentStoragePort
{
  async uploadPdfObject(params: {
    storagePath: string;
    mimeType: "application/pdf";
    sizeBytes: number;
    simulateFailure?: boolean;
  }): Promise<DocumentResult<{ storagePath: string }>> {
    if (params.simulateFailure) {
      return {
        ok: false,
        error: {
          code: "STORAGE_UPLOAD_FAILED",
          message:
            "Fallo simulado de subida a Supabase Storage. Puedes reintentar la carga de forma idempotente.",
        },
      };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.uploadPdfObject(params);
    }

    // En servidor subimos un placeholder binario %PDF-1.7 o el buffer correspondiente al storage_path privado
    const pdfPlaceholder = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const { error } = await supabase.storage
      .from(STUDY_DOCUMENTS_BUCKET)
      .upload(params.storagePath, pdfPlaceholder, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      return {
        ok: false,
        error: {
          code: "STORAGE_UPLOAD_FAILED",
          message: error.message,
        },
      };
    }

    return {
      ok: true,
      data: { storagePath: params.storagePath },
    };
  }

  async createSignedReadUrl(params: {
    documentId: string;
    filename: string;
    storagePath: string;
    expiresInSeconds: number;
  }): Promise<DocumentResult<SignedDocumentUrl>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.createSignedReadUrl(params);
    }

    const { data, error } = await supabase.storage
      .from(STUDY_DOCUMENTS_BUCKET)
      .createSignedUrl(params.storagePath, params.expiresInSeconds);

    if (error || !data?.signedUrl) {
      return {
        ok: false,
        error: {
          code: "DOCUMENT_UNAVAILABLE",
          message:
            error?.message ?? "No se pudo generar la URL firmada temporal.",
        },
      };
    }

    return {
      ok: true,
      data: {
        documentId: params.documentId,
        filename: params.filename,
        storagePath: params.storagePath,
        signedUrl: data.signedUrl,
        expiresInSeconds: params.expiresInSeconds,
        expiresAt: new Date(
          Date.now() + params.expiresInSeconds * 1000
        ).toISOString(),
      },
    };
  }

  async removePdfObject(
    storagePath: string
  ): Promise<DocumentResult<{ removed: true }>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return defaultInMemoryCatalogStore.removePdfObject(storagePath);
    }

    const { error } = await supabase.storage
      .from(STUDY_DOCUMENTS_BUCKET)
      .remove([storagePath]);

    if (error) {
      return {
        ok: false,
        error: {
          code: "STORAGE_UPLOAD_FAILED",
          message: error.message,
        },
      };
    }

    return { ok: true, data: { removed: true } };
  }
}
