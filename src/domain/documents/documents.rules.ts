import { APP_CONFIG } from "@/config/env";
import type {
  ActorContext,
  SubjectEntity,
} from "@/domain/subjects/subjects.types";
import type { TopicEntity } from "@/domain/topics/topics.types";
import type {
  DocumentEntity,
  DocumentResult,
  DocumentStatus,
  UploadDocumentInput,
} from "./documents.types";

const PDF_MAGIC_PREFIX = "%PDF-";

/**
 * Sanitiza un nombre de archivo eliminando separadores de ruta, secuencias `..`
 * y caracteres de control, garantizando que termine en `.pdf` y mida entre 5 y 200 caracteres.
 */
export function sanitizePdfFilename(rawFilename: string): string {
  const withoutDirs = rawFilename
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("-");

  const cleaned = withoutDirs
    .replace(/[^a-zA-Z0-9._\-\sáéíóúÁÉÍÓÚñÑ]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .trim();

  const lower = cleaned.toLowerCase();
  const base = lower.endsWith(".pdf") ? lower.slice(0, -4) : lower;
  const safeBase = (
    base
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "apunte"
  ).slice(0, 180);

  return `${safeBase}.pdf`;
}

/**
 * Verifica que la cabecera binaria o ASCII comience con `%PDF-` (0x25 0x50 0x44 0x46 0x2D).
 */
export function hasValidPdfSignature(
  header?: string | Uint8Array | null
): boolean {
  if (header === undefined || header === null) {
    return true;
  }

  if (typeof header === "string") {
    return header.startsWith(PDF_MAGIC_PREFIX);
  }

  if (header.length < 5) {
    return false;
  }

  return (
    header[0] === 0x25 && // %
    header[1] === 0x50 && // P
    header[2] === 0x44 && // D
    header[3] === 0x46 && // F
    header[4] === 0x2d // -
  );
}

/**
 * Genera determinísticamente la ruta privada `{ownerId}/{documentId}/{sanitizedFilename}`.
 */
export function buildPrivateStoragePath(
  ownerId: string,
  documentId: string,
  rawFilename: string
): string {
  const safeFilename = sanitizePdfFilename(rawFilename);
  return `${ownerId.trim()}/${documentId.trim()}/${safeFilename}`;
}

/**
 * Verifica acceso estricto al PDF privado:
 * Según docs/05-SEGURIDAD-RLS.md, ni otros usuarios ni administradores por defecto
 * pueden leer, descargar ni borrar documentos PDF privados ajenos.
 */
export function canAccessPrivateDocument(
  actor: ActorContext | null,
  doc: Pick<DocumentEntity, "ownerId">
): boolean {
  if (!actor || !actor.userId) {
    return false;
  }
  return doc.ownerId === actor.userId;
}

/**
 * Máquina de estados válida para documentos PDF:
 * - uploading -> available | failed
 * - failed -> uploading | available
 * - available -> unavailable
 */
export function canTransitionDocumentStatus(
  from: DocumentStatus,
  to: DocumentStatus
): boolean {
  if (from === to) return true;
  if (from === "uploading" && (to === "available" || to === "failed")) {
    return true;
  }
  if (from === "failed" && (to === "uploading" || to === "available")) {
    return true;
  }
  if (from === "available" && to === "unavailable") {
    return true;
  }
  return false;
}

export function validateDocumentUpload(
  actor: ActorContext | null,
  subject: SubjectEntity,
  topic: TopicEntity | null,
  input: UploadDocumentInput
): DocumentResult<{
  ownerId: string;
  subjectId: string;
  topicId: string | null;
  sanitizedFilename: string;
  mimeType: "application/pdf";
  sizeBytes: number;
}> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para subir documentos PDF.",
      },
    };
  }

  if (subject.ownerId !== actor.userId) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message:
          "Solo el propietario de la materia puede asociarle documentos PDF privados.",
      },
    };
  }

  if (input.topicId) {
    if (!topic || topic.subjectId !== subject.id) {
      return {
        ok: false,
        error: {
          code: "INVALID_DOCUMENT_TOPIC",
          message: "El tema seleccionado no pertenece a esta materia.",
        },
      };
    }
  }

  const trimmedName = input.filename?.trim() ?? "";
  if (!trimmedName.toLowerCase().endsWith(".pdf") || trimmedName.length < 5) {
    return {
      ok: false,
      error: {
        code: "INVALID_PDF_EXTENSION",
        message: "El archivo debe tener extensión .pdf válida.",
      },
    };
  }

  if (input.mimeType?.trim().toLowerCase() !== "application/pdf") {
    return {
      ok: false,
      error: {
        code: "INVALID_PDF_MIME",
        message:
          "Tipo MIME inválido: solo se aceptan archivos application/pdf.",
      },
    };
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return {
      ok: false,
      error: {
        code: "EMPTY_PDF_FILE",
        message: "El archivo PDF está vacío (0 bytes).",
      },
    };
  }

  if (input.sizeBytes > APP_CONFIG.maxPdfSizeBytes) {
    const maxMb = (APP_CONFIG.maxPdfSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      error: {
        code: "PDF_TOO_LARGE",
        message: `El archivo supera el límite máximo permitido de ${maxMb} MB (${APP_CONFIG.maxPdfSizeBytes} bytes).`,
      },
    };
  }

  if (!hasValidPdfSignature(input.headerSignature)) {
    return {
      ok: false,
      error: {
        code: "INVALID_PDF_SIGNATURE",
        message:
          "El contenido del archivo no posee una firma de encabezado %PDF- válida.",
      },
    };
  }

  const sanitizedFilename = sanitizePdfFilename(trimmedName);

  return {
    ok: true,
    data: {
      ownerId: actor.userId,
      subjectId: subject.id,
      topicId: input.topicId ?? null,
      sanitizedFilename,
      mimeType: "application/pdf",
      sizeBytes: Math.floor(input.sizeBytes),
    },
  };
}
