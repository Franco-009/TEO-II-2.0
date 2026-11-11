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
  QuestionDifficulty,
  QuestionType,
} from "@/domain/models/studyplay";
import type { QuestionsRepository } from "@/domain/questions/questions.ports";
import type {
  QuestionEntity,
  QuestionOptionEntity,
  QuestionResult,
} from "@/domain/questions/questions.types";
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
  MOCK_QUESTIONS,
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
  const privateTopics = MOCK_TOPICS.map((t) => ({
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

  const publicTopics: TopicEntity[] = [
    {
      id: "top-pub-prob-1",
      subjectId: "pub-estadistica",
      parentTopicId: null,
      title: "1. Variables Aleatorias y Esperanza Matemática",
      description:
        "Variables discretas y continuas, función de densidad y propiedades de la esperanza y varianza.",
      sortOrder: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      questionsCount: 2,
      documentsCount: 0,
      accuracy: 80,
      attemptsCount: 5,
    },
  ];

  return [...privateTopics, ...publicTopics];
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

function buildInitialQuestions(): QuestionEntity[] {
  const nowIso = "2026-11-10T12:00:00.000Z";
  const privateQuestions: QuestionEntity[] = MOCK_QUESTIONS.map((q) => {
    const isAvailableDoc = q.sourceDocumentAvailable && q.sourceDocumentName;
    const sourceDocId = isAvailableDoc ? "doc-01" : null;

    return {
      id: q.id,
      topicId: q.topicId,
      topicTitle: q.topicTitle,
      subjectId: "subj-anatomia",
      subjectTitle: q.subjectTitle,
      authorId: MOCK_USER_PROFILE.id,
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation,
      difficulty: q.difficulty,
      status: q.status,
      sourceDocumentId: sourceDocId,
      sourceDocumentName: q.sourceDocumentName,
      sourceDocumentAvailable: q.sourceDocumentAvailable,
      sourcePage: q.sourcePage,
      version: q.version,
      options: q.options.map((opt) => ({
        id: opt.id,
        questionId: q.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
        feedback: opt.feedback,
        sortOrder: opt.sortOrder,
      })),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  const publicQuestions: QuestionEntity[] = [
    {
      id: "q-pub-201",
      topicId: "top-pub-prob-1",
      topicTitle: "1. Variables Aleatorias y Esperanza Matemática",
      subjectId: "pub-estadistica",
      subjectTitle: "Probabilidad y Estadística Aplicada",
      authorId: "usr-admin-catalog",
      type: "single_choice",
      prompt:
        "Si X es una variable aleatoria con esperanza E(X) = 4 y varianza Var(X) = 3, ¿cuál es el valor de Var(2X + 5)?",
      explanation:
        "Por propiedades de la varianza, Var(aX + b) = a² Var(X). Por lo tanto, Var(2X + 5) = 4 * 3 = 12.",
      difficulty: "medium",
      status: "published",
      sourceDocumentId: null,
      sourceDocumentName: null,
      sourceDocumentAvailable: false,
      sourcePage: null,
      version: 1,
      options: [
        {
          id: "opt-pub-1",
          questionId: "q-pub-201",
          text: "12",
          isCorrect: true,
          feedback:
            "Correcto: la constante aditiva no altera la dispersión y el factor 2 se eleva al cuadrado (4 * 3 = 12).",
          sortOrder: 1,
        },
        {
          id: "opt-pub-2",
          questionId: "q-pub-201",
          text: "11",
          isCorrect: false,
          feedback:
            "Incorrecto: la varianza no es lineal como la esperanza matemática.",
          sortOrder: 2,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "q-pub-202-draft",
      topicId: "top-pub-prob-1",
      topicTitle: "1. Variables Aleatorias y Esperanza Matemática",
      subjectId: "pub-estadistica",
      subjectTitle: "Probabilidad y Estadística Aplicada",
      authorId: "usr-admin-catalog",
      type: "true_false",
      prompt: "Borrador interno de administración aún no publicado.",
      explanation: "En revisión.",
      difficulty: "easy",
      status: "draft",
      sourceDocumentId: null,
      sourceDocumentName: null,
      sourceDocumentAvailable: false,
      sourcePage: null,
      version: 1,
      options: [
        {
          id: "opt-pub-d1",
          questionId: "q-pub-202-draft",
          text: "Verdadero",
          isCorrect: true,
          feedback: "Correcto.",
          sortOrder: 1,
        },
        {
          id: "opt-pub-d2",
          questionId: "q-pub-202-draft",
          text: "Falso",
          isCorrect: false,
          feedback: "Incorrecto.",
          sortOrder: 2,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return [...privateQuestions, ...publicQuestions];
}

export class InMemoryStudyCatalogStore
  implements
    SubjectsRepository,
    TopicsRepository,
    DocumentsRepository,
    PrivateDocumentStoragePort,
    QuestionsRepository
{
  private subjects: SubjectEntity[];
  private topics: TopicEntity[];
  private documents: DocumentEntity[];
  private questions: QuestionEntity[];
  private storedBlobs = new Set<string>();
  private seq = 100;

  constructor(seedWithDefaults = true) {
    this.subjects = seedWithDefaults ? buildInitialSubjects() : [];
    this.topics = seedWithDefaults ? buildInitialTopics() : [];
    this.documents = seedWithDefaults ? buildInitialDocuments() : [];
    this.questions = seedWithDefaults ? buildInitialQuestions() : [];
    for (const doc of this.documents) {
      if (doc.status === "available") {
        this.storedBlobs.add(doc.storagePath);
      }
    }
  }

  private enrichQuestion(q: QuestionEntity): QuestionEntity {
    const topic = this.topics.find((t) => t.id === q.topicId);
    const subject = topic
      ? this.subjects.find((s) => s.id === topic.subjectId)
      : undefined;
    const doc = q.sourceDocumentId
      ? this.documents.find((d) => d.id === q.sourceDocumentId)
      : undefined;

    const sourceAvailable = Boolean(doc && doc.status === "available");

    return {
      ...q,
      topicTitle: topic?.title ?? q.topicTitle ?? "Tema",
      subjectId: subject?.id ?? topic?.subjectId ?? q.subjectId,
      subjectTitle: subject?.title ?? q.subjectTitle ?? "Materia",
      sourceDocumentId: sourceAvailable ? doc!.id : null,
      sourceDocumentName: doc?.filename ?? q.sourceDocumentName ?? null,
      sourceDocumentAvailable: sourceAvailable,
      options: [...q.options].sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  async listByOwner(ownerId: string): Promise<SubjectResult<SubjectEntity[]>> {
    return {
      ok: true,
      data: this.subjects
        .filter((s) => s.ownerId === ownerId)
        .map((s) => {
          const subjectTopicIds = new Set(
            this.topics.filter((t) => t.subjectId === s.id).map((t) => t.id)
          );
          const qCount = this.questions.filter((q) =>
            subjectTopicIds.has(q.topicId)
          ).length;

          return {
            ...s,
            topicsCount: subjectTopicIds.size || (s.topicsCount ?? 0),
            questionsCount: qCount || (s.questionsCount ?? 0),
            documentsCount:
              this.documents.filter(
                (d) => d.subjectId === s.id && d.status === "available"
              ).length || (s.documentsCount ?? 0),
          };
        }),
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
    const subjectTopicIds = new Set(
      this.topics.filter((t) => t.subjectId === found.id).map((t) => t.id)
    );
    const qCount = this.questions.filter((q) =>
      subjectTopicIds.has(q.topicId)
    ).length;

    return {
      ok: true,
      data: {
        ...found,
        topicsCount: subjectTopicIds.size || (found.topicsCount ?? 0),
        questionsCount: qCount || (found.questionsCount ?? 0),
        documentsCount:
          this.documents.filter(
            (d) => d.subjectId === found.id && d.status === "available"
          ).length || (found.documentsCount ?? 0),
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
    const topicIds = new Set(
      this.topics.filter((t) => t.subjectId === subjectId).map((t) => t.id)
    );
    this.subjects = this.subjects.filter((s) => s.id !== subjectId);
    this.topics = this.topics.filter((t) => t.subjectId !== subjectId);
    this.documents = this.documents.filter((d) => d.subjectId !== subjectId);
    this.questions = this.questions.filter((q) => !topicIds.has(q.topicId));
    return { ok: true, data: { deleted: true } };
  }

  async listBySubject(subjectId: string): Promise<TopicResult<TopicEntity[]>> {
    const list = this.topics
      .filter((t) => t.subjectId === subjectId)
      .map((t) => ({
        ...t,
        questionsCount: this.questions.filter((q) => q.topicId === t.id).length,
        documentsCount: this.documents.filter(
          (d) => d.topicId === t.id && d.status === "available"
        ).length,
      }));
    return { ok: true, data: list };
  }

  async findTopicById(
    topicId: string
  ): Promise<TopicResult<TopicEntity | null>> {
    const topic = this.topics.find((t) => t.id === topicId) ?? null;
    if (!topic) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        ...topic,
        questionsCount: this.questions.filter((q) => q.topicId === topic.id)
          .length,
        documentsCount: this.documents.filter(
          (d) => d.topicId === topic.id && d.status === "available"
        ).length,
      },
    };
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
    const toRemove = new Set(
      this.topics
        .filter((t) => t.id === topicId || t.parentTopicId === topicId)
        .map((t) => t.id)
    );
    this.topics = this.topics.filter((t) => !toRemove.has(t.id));
    this.questions = this.questions.filter((q) => !toRemove.has(q.topicId));
    return { ok: true, data: { deleted: true } };
  }

  // --- DocumentsRepository ---

  async listDocumentsByOwner(
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents
        .filter((d) => d.ownerId === ownerId)
        .map((d) => ({
          ...d,
          linkedQuestionsCount:
            this.questions.filter((q) => q.sourceDocumentId === d.id).length ||
            d.linkedQuestionsCount,
        })),
    };
  }

  async listDocumentsBySubject(
    subjectId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents
        .filter((d) => d.subjectId === subjectId && d.ownerId === ownerId)
        .map((d) => ({
          ...d,
          linkedQuestionsCount:
            this.questions.filter((q) => q.sourceDocumentId === d.id).length ||
            d.linkedQuestionsCount,
        })),
    };
  }

  async listDocumentsByTopic(
    topicId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents
        .filter((d) => d.topicId === topicId && d.ownerId === ownerId)
        .map((d) => ({
          ...d,
          linkedQuestionsCount:
            this.questions.filter((q) => q.sourceDocumentId === d.id).length ||
            d.linkedQuestionsCount,
        })),
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

    // Simular ON DELETE SET NULL en preguntas vinculadas preservando sourceDocumentName
    let affectedQuestions = 0;
    this.questions = this.questions.map((q) => {
      if (q.sourceDocumentId === documentId) {
        affectedQuestions += 1;
        return {
          ...q,
          sourceDocumentId: null,
          sourceDocumentName: q.sourceDocumentName ?? target.filename,
          sourceDocumentAvailable: false,
        };
      }
      return q;
    });

    const preserved = Math.max(
      affectedQuestions,
      target.linkedQuestionsCount ?? 0
    );

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

  // --- QuestionsRepository ---

  async listQuestionsByTopic(
    topicId: string
  ): Promise<QuestionResult<QuestionEntity[]>> {
    const list = this.questions
      .filter((q) => q.topicId === topicId)
      .map((q) => this.enrichQuestion(q));
    return { ok: true, data: list };
  }

  async listQuestionsBySubject(
    subjectId: string
  ): Promise<QuestionResult<QuestionEntity[]>> {
    const topicIds = new Set(
      this.topics.filter((t) => t.subjectId === subjectId).map((t) => t.id)
    );
    const list = this.questions
      .filter((q) => topicIds.has(q.topicId))
      .map((q) => this.enrichQuestion(q));
    return { ok: true, data: list };
  }

  async findQuestionById(
    questionId: string
  ): Promise<QuestionResult<QuestionEntity | null>> {
    const found = this.questions.find((q) => q.id === questionId) ?? null;
    return {
      ok: true,
      data: found ? this.enrichQuestion(found) : null,
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
    this.seq += 1;
    const questionId = `q-${this.seq}`;
    const nowIso = new Date().toISOString();

    const mappedOptions: QuestionOptionEntity[] = params.options.map(
      (opt, idx) => ({
        id: opt.id || `${questionId}-opt-${idx + 1}`,
        questionId,
        text: opt.text,
        isCorrect: opt.isCorrect,
        feedback: opt.feedback,
        sortOrder: opt.sortOrder,
      })
    );

    const created: QuestionEntity = {
      id: questionId,
      topicId: params.topicId,
      authorId: params.authorId,
      type: params.type,
      prompt: params.prompt,
      explanation: params.explanation,
      difficulty: params.difficulty,
      status: params.status,
      sourceDocumentId: params.sourceDocumentId,
      sourceDocumentName: params.sourceDocumentName,
      sourceDocumentAvailable: Boolean(params.sourceDocumentId),
      sourcePage: params.sourcePage,
      version: params.version,
      options: mappedOptions,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.questions.unshift(created);
    return { ok: true, data: this.enrichQuestion(created) };
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
    const idx = this.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "Pregunta no encontrada.",
        },
      };
    }

    const mappedOptions: QuestionOptionEntity[] = params.options.map(
      (opt, i) => ({
        id: opt.id || `${questionId}-opt-${i + 1}`,
        questionId,
        text: opt.text,
        isCorrect: opt.isCorrect,
        feedback: opt.feedback,
        sortOrder: opt.sortOrder,
      })
    );

    const updated: QuestionEntity = {
      ...this.questions[idx],
      type: params.type,
      prompt: params.prompt,
      explanation: params.explanation,
      difficulty: params.difficulty,
      status: params.status,
      sourceDocumentId: params.sourceDocumentId,
      sourceDocumentName: params.sourceDocumentName,
      sourcePage: params.sourcePage,
      version: params.version,
      options: mappedOptions,
      updatedAt: new Date().toISOString(),
    };

    this.questions[idx] = updated;
    return { ok: true, data: this.enrichQuestion(updated) };
  }

  async updateQuestionStatus(
    questionId: string,
    status: ContentStatus
  ): Promise<QuestionResult<QuestionEntity>> {
    const idx = this.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "Pregunta no encontrada.",
        },
      };
    }

    const updated: QuestionEntity = {
      ...this.questions[idx],
      status,
      updatedAt: new Date().toISOString(),
    };

    this.questions[idx] = updated;
    return { ok: true, data: this.enrichQuestion(updated) };
  }

  async deleteQuestionRecord(
    questionId: string
  ): Promise<QuestionResult<{ deleted: true }>> {
    const idx = this.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "Pregunta no encontrada.",
        },
      };
    }

    this.questions.splice(idx, 1);
    return { ok: true, data: { deleted: true } };
  }
}

const globalForCatalog = globalThis as unknown as {
  studyPlayCatalogStore?: InMemoryStudyCatalogStore;
};

export const defaultInMemoryCatalogStore =
  globalForCatalog.studyPlayCatalogStore ??
  (globalForCatalog.studyPlayCatalogStore = new InMemoryStudyCatalogStore(true));
