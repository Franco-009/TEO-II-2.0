import type {
  DocumentEntity,
  DocumentResult,
  DocumentStatus,
  SignedDocumentUrl,
} from "./documents.types";

export interface DocumentsRepository {
  listDocumentsByOwner(
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>>;
  listDocumentsBySubject(
    subjectId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>>;
  listDocumentsByTopic(
    topicId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>>;
  findDocumentById(
    documentId: string
  ): Promise<DocumentResult<DocumentEntity | null>>;
  createDocumentRecord(params: {
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
  }): Promise<DocumentResult<DocumentEntity>>;
  updateDocumentStatus(
    documentId: string,
    status: DocumentStatus
  ): Promise<DocumentResult<DocumentEntity>>;
  deleteDocumentRecord(
    documentId: string
  ): Promise<
    DocumentResult<{
      deleted: true;
      preservedLinkedQuestions: number;
    }>
  >;
}

export interface PrivateDocumentStoragePort {
  uploadPdfObject(params: {
    storagePath: string;
    mimeType: "application/pdf";
    sizeBytes: number;
    simulateFailure?: boolean;
  }): Promise<DocumentResult<{ storagePath: string }>>;

  createSignedReadUrl(params: {
    documentId: string;
    filename: string;
    storagePath: string;
    expiresInSeconds: number;
  }): Promise<DocumentResult<SignedDocumentUrl>>;

  removePdfObject(
    storagePath: string
  ): Promise<DocumentResult<{ removed: true }>>;
}
