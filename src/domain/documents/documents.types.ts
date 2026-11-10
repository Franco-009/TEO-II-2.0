export const STUDY_DOCUMENTS_BUCKET = "study-documents" as const;
export const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB (15_728_640 bytes)


export type DocumentStatus =
  | "uploading"
  | "available"
  | "failed"
  | "unavailable";

export type DocumentErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN_NOT_OWNER"
  | "INVALID_PDF_EXTENSION"
  | "INVALID_PDF_MIME"
  | "INVALID_PDF_SIGNATURE"
  | "PDF_TOO_LARGE"
  | "EMPTY_PDF_FILE"
  | "INVALID_DOCUMENT_TOPIC"
  | "INVALID_STATUS_TRANSITION"
  | "DOCUMENT_NOT_FOUND"
  | "DOCUMENT_UNAVAILABLE"
  | "STORAGE_UPLOAD_FAILED";

export interface DocumentDomainError {
  code: DocumentErrorCode;
  message: string;
}

export type DocumentResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DocumentDomainError };

export interface DocumentEntity {
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
  linkedQuestionsCount: number;
  createdAt: string;
}

export interface UploadDocumentInput {
  subjectId: string;
  topicId?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Primeros bytes o cabecera ASCII del archivo (ej. "%PDF-1.7") para verificar firma real */
  headerSignature?: string | Uint8Array | null;
  /** Si se provee, reintenta la subida sobre el registro fallido sin duplicarlo */
  retryDocumentId?: string;
  /** Permite simular fallo de red/storage en pruebas o entorno demo */
  simulateStorageFailure?: boolean;
}

export interface SignedDocumentUrl {
  documentId: string;
  filename: string;
  storagePath: string;
  signedUrl: string;
  expiresInSeconds: number;
  expiresAt: string;
}
