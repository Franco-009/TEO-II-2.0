import type {
  DocumentsRepository,
  PrivateDocumentStoragePort,
} from "@/domain/documents/documents.ports";
import type {
  DocumentEntity,
  DocumentResult,
  DocumentStatus,
  SignedDocumentUrl,
} from "@/domain/documents/documents.types";
import type {
  ContentStatus,
  ContentVisibility,
} from "@/domain/models/studyplay";
import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import type {
  SubjectEntity,
  SubjectResult,
} from "@/domain/subjects/subjects.types";
import type { TopicsRepository } from "@/domain/topics/topics.ports";
import type { TopicEntity, TopicResult } from "@/domain/topics/topics.types";
import {
  MOCK_DOCUMENTS,
  MOCK_PRIVATE_SUBJECTS,
  MOCK_PUBLIC_SUBJECTS,
  MOCK_TOPICS,
  MOCK_USER_PROFILE,
} from "@/features/mock-data/phase1-fixtures";

function buildInitialSubjects(): SubjectEntity[] {
  const nowIso = "2026-11-10T12:00:00.000Z";
  const privates: SubjectEntity[] = MOCK_PRIVATE_SUBJECTS.map((s) => ({
    id: s.id,
    ownerId: MOCK_USER_PROFILE.id,
    title: s.title,
    description: s.description,
    visibility: s.visibility,
    status: s.status,
    publishedAt: s.status === "published" ? nowIso : null,
    createdAt: nowIso,
    updatedAt: s.updatedAt,
    topicsCount: s.topicsCount,
    questionsCount: s.questionsCount,
    documentsCount: s.documentsCount,
    masteryAccuracy: s.masteryAccuracy,
    attemptsCount: s.attemptsCount,
  }));

  const publics: SubjectEntity[] = MOCK_PUBLIC_SUBJECTS.map((s) => ({
    id: s.id,
    ownerId: "usr-admin-catalog",
    title: s.title,
    description: s.description,
    visibility: s.visibility,
    status: s.status,
    publishedAt: s.status === "published" ? nowIso : null,
    createdAt: nowIso,
    updatedAt: s.updatedAt,
    authorName: s.authorName,
    topicsCount: s.topicsCount,
    questionsCount: s.questionsCount,
    documentsCount: s.documentsCount,
    masteryAccuracy: s.masteryAccuracy,
    attemptsCount: s.attemptsCount,
  }));

  return [...privates, ...publics];
}

function buildInitialTopics(): TopicEntity[] {
  const nowIso = "2026-11-10T12:00:00.000Z";
  return MOCK_TOPICS.map((t) => ({
    id: t.id,
    subjectId: t.subjectId,
    parentTopicId: t.parentTopicId,
    title: t.title,
    description: t.description,
    sortOrder: t.sortOrder,
    createdAt: nowIso,
    updatedAt: nowIso,
    questionsCount: t.questionsCount,
    documentsCount: t.documentsCount,
    accuracy: t.accuracy,
    attemptsCount: t.attemptsCount,
  }));
}

function buildInitialDocuments(): DocumentEntity[] {
  return MOCK_DOCUMENTS.map((d) => ({
    id: d.id,
    ownerId: MOCK_USER_PROFILE.id,
    subjectId: d.subjectId,
    subjectTitle: d.subjectTitle,
    topicId: d.topicId,
    topicTitle: d.topicTitle,
    storagePath: `${MOCK_USER_PROFILE.id}/${d.id}/${d.filename}`,
    filename: d.filename,
    mimeType: "application/pdf",
    sizeBytes: d.sizeBytes,
    status: d.status,
    linkedQuestionsCount: d.linkedQuestionsCount,
    createdAt: d.createdAt,
  }));
}

export class InMemoryStudyCatalogStore
  implements
    SubjectsRepository,
    TopicsRepository,
    DocumentsRepository,
    PrivateDocumentStoragePort
{
  private subjects: SubjectEntity[];
  private topics: TopicEntity[];
  private documents: DocumentEntity[];
  private storedBlobs = new Set<string>();
  private seq = 100;

  constructor(seedWithDefaults = true) {
    this.subjects = seedWithDefaults ? buildInitialSubjects() : [];
    this.topics = seedWithDefaults ? buildInitialTopics() : [];
    this.documents = seedWithDefaults ? buildInitialDocuments() : [];
    for (const doc of this.documents) {
      if (doc.status === "available") {
        this.storedBlobs.add(doc.storagePath);
      }
    }
  }

  async listByOwner(ownerId: string): Promise<SubjectResult<SubjectEntity[]>> {
    return {
      ok: true,
      data: this.subjects
        .filter((s) => s.ownerId === ownerId)
        .map((s) => ({
          ...s,
          topicsCount:
            this.topics.filter((t) => t.subjectId === s.id).length ||
            (s.topicsCount ?? 0),
          documentsCount:
            this.documents.filter(
              (d) => d.subjectId === s.id && d.status === "available"
            ).length ||
            (s.documentsCount ?? 0),
        })),
    };
  }

  async listPublicPublished(): Promise<SubjectResult<SubjectEntity[]>> {
    return {
      ok: true,
      data: this.subjects.filter(
        (s) => s.visibility === "public" && s.status === "published"
      ),
    };
  }

  async findById(
    subjectId: string
  ): Promise<SubjectResult<SubjectEntity | null>> {
    const found = this.subjects.find((s) => s.id === subjectId) ?? null;
    if (!found) {
      return { ok: true, data: null };
    }
    return {
      ok: true,
      data: {
        ...found,
        topicsCount:
          this.topics.filter((t) => t.subjectId === found.id).length ||
          (found.topicsCount ?? 0),
        documentsCount:
          this.documents.filter(
            (d) => d.subjectId === found.id && d.status === "available"
          ).length ||
          (found.documentsCount ?? 0),
      },
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
    this.seq += 1;
    const nowIso = new Date().toISOString();
    const created: SubjectEntity = {
      id: `subj-${this.seq}`,
      ownerId: params.ownerId,
      title: params.title,
      description: params.description,
      visibility: params.visibility,
      status: params.status,
      publishedAt: params.publishedAt,
      createdAt: nowIso,
      updatedAt: "Recién creada",
      topicsCount: 0,
      questionsCount: 0,
      documentsCount: 0,
      masteryAccuracy: 0,
      attemptsCount: 0,
      authorName:
        params.visibility === "public"
          ? "Equipo Académico StudyPlay"
          : undefined,
    };

    this.subjects.unshift(created);
    return { ok: true, data: created };
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
    const idx = this.subjects.findIndex((s) => s.id === subjectId);
    if (idx === -1) {
      return {
        ok: false,
        error: { code: "SUBJECT_NOT_FOUND", message: "Materia no encontrada" },
      };
    }

    const updated: SubjectEntity = {
      ...this.subjects[idx],
      title: params.title,
      description: params.description,
      visibility: params.visibility,
      status: params.status,
      publishedAt: params.publishedAt,
      updatedAt: "Actualizado recién",
    };

    this.subjects[idx] = updated;
    return { ok: true, data: updated };
  }

  async delete(subjectId: string): Promise<SubjectResult<{ deleted: true }>> {
    this.subjects = this.subjects.filter((s) => s.id !== subjectId);
    this.topics = this.topics.filter((t) => t.subjectId !== subjectId);
    this.documents = this.documents.filter((d) => d.subjectId !== subjectId);
    return { ok: true, data: { deleted: true } };
  }

  async listBySubject(subjectId: string): Promise<TopicResult<TopicEntity[]>> {
    const list = this.topics.filter((t) => t.subjectId === subjectId);
    return { ok: true, data: list };
  }

  async findTopicById(
    topicId: string
  ): Promise<TopicResult<TopicEntity | null>> {
    const topic = this.topics.find((t) => t.id === topicId) ?? null;
    return { ok: true, data: topic };
  }

  async createTopic(params: {
    subjectId: string;
    parentTopicId: string | null;
    title: string;
    description: string;
    sortOrder: number;
  }): Promise<TopicResult<TopicEntity>> {
    this.seq += 1;
    const nowIso = new Date().toISOString();
    const created: TopicEntity = {
      id: `top-${this.seq}`,
      subjectId: params.subjectId,
      parentTopicId: params.parentTopicId,
      title: params.title,
      description: params.description,
      sortOrder: params.sortOrder,
      createdAt: nowIso,
      updatedAt: nowIso,
      questionsCount: 0,
      documentsCount: 0,
      accuracy: 0,
      attemptsCount: 0,
    };

    this.topics.push(created);
    return { ok: true, data: created };
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
    const idx = this.topics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      return {
        ok: false,
        error: { code: "TOPIC_NOT_FOUND", message: "Tema no encontrado" },
      };
    }

    const updated: TopicEntity = {
      ...this.topics[idx],
      parentTopicId: params.parentTopicId,
      title: params.title,
      description: params.description,
      sortOrder: params.sortOrder,
      updatedAt: new Date().toISOString(),
    };

    this.topics[idx] = updated;
    return { ok: true, data: updated };
  }

  async deleteTopic(
    topicId: string
  ): Promise<TopicResult<{ deleted: true }>> {
    this.topics = this.topics.filter(
      (t) => t.id !== topicId && t.parentTopicId !== topicId
    );
    return { ok: true, data: { deleted: true } };
  }

  // --- DocumentsRepository ---

  async listDocumentsByOwner(
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents.filter((d) => d.ownerId === ownerId),
    };
  }

  async listDocumentsBySubject(
    subjectId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents.filter(
        (d) => d.subjectId === subjectId && d.ownerId === ownerId
      ),
    };
  }

  async listDocumentsByTopic(
    topicId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents.filter(
        (d) => d.topicId === topicId && d.ownerId === ownerId
      ),
    };
  }

  async findDocumentById(
    documentId: string
  ): Promise<DocumentResult<DocumentEntity | null>> {
    const found = this.documents.find((d) => d.id === documentId) ?? null;
    return { ok: true, data: found };
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
    const subject = this.subjects.find((s) => s.id === params.subjectId);
    const topic = params.topicId
      ? this.topics.find((t) => t.id === params.topicId)
      : null;

    const entity: DocumentEntity = {
      id: params.id,
      ownerId: params.ownerId,
      subjectId: params.subjectId,
      subjectTitle: params.subjectTitle ?? subject?.title ?? "Materia",
      topicId: params.topicId,
      topicTitle: params.topicTitle ?? topic?.title ?? null,
      storagePath: params.storagePath,
      filename: params.filename,
      mimeType: "application/pdf",
      sizeBytes: params.sizeBytes,
      status: params.status,
      linkedQuestionsCount: 0,
      createdAt: new Date().toLocaleDateString("es-AR"),
    };

    // Idempotencia por id o storagePath
    const existingIdx = this.documents.findIndex(
      (d) => d.id === params.id || d.storagePath === params.storagePath
    );
    if (existingIdx !== -1) {
      this.documents[existingIdx] = entity;
    } else {
      this.documents.unshift(entity);
    }

    return { ok: true, data: entity };
  }

  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus
  ): Promise<DocumentResult<DocumentEntity>> {
    const idx = this.documents.findIndex((d) => d.id === documentId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "Documento no encontrado",
        },
      };
    }

    const updated: DocumentEntity = {
      ...this.documents[idx],
      status,
    };
    this.documents[idx] = updated;
    return { ok: true, data: updated };
  }

  async deleteDocumentRecord(
    documentId: string
  ): Promise<
    DocumentResult<{
      deleted: true;
      preservedLinkedQuestions: number;
    }>
  > {
    const idx = this.documents.findIndex((d) => d.id === documentId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "Documento no encontrado",
        },
      };
    }

    const target = this.documents[idx];
    const preserved = target.linkedQuestionsCount ?? 0;

    // Eliminar de la lista de documentos activos (las preguntas asociadas conservan su existencia
    // pasando a "fuente no disponible" según docs/01-REQUISITOS.md y ON DELETE SET NULL)
    this.documents.splice(idx, 1);

    return {
      ok: true,
      data: {
        deleted: true,
        preservedLinkedQuestions: preserved,
      },
    };
  }

  // --- PrivateDocumentStoragePort ---

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
            "Error de red al subir el PDF al bucket privado. Puedes reintentar sin duplicar el registro.",
        },
      };
    }

    this.storedBlobs.add(params.storagePath);
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
    const expiresAt = new Date(
      Date.now() + params.expiresInSeconds * 1000
    ).toISOString();
    const token = Buffer.from(
      `${params.storagePath}:${expiresAt}`,
      "utf-8"
    ).toString("base64url");

    return {
      ok: true,
      data: {
        documentId: params.documentId,
        filename: params.filename,
        storagePath: params.storagePath,
        signedUrl: `https://storage.studyplay.local/study-documents/${params.storagePath}?token=${token}&exp=${params.expiresInSeconds}`,
        expiresInSeconds: params.expiresInSeconds,
        expiresAt,
      },
    };
  }

  async removePdfObject(
    storagePath: string
  ): Promise<DocumentResult<{ removed: true }>> {
    this.storedBlobs.delete(storagePath);
    return { ok: true, data: { removed: true } };
  }
}

const globalForCatalog = globalThis as unknown as {
  studyPlayCatalogStore?: InMemoryStudyCatalogStore;
};

export const defaultInMemoryCatalogStore =
  globalForCatalog.studyPlayCatalogStore ??
  (globalForCatalog.studyPlayCatalogStore = new InMemoryStudyCatalogStore(true));
