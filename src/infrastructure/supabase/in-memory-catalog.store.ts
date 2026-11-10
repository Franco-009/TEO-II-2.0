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

export class InMemoryStudyCatalogStore
  implements SubjectsRepository, TopicsRepository
{
  private subjects: SubjectEntity[];
  private topics: TopicEntity[];
  private seq = 100;

  constructor(seedWithDefaults = true) {
    this.subjects = seedWithDefaults ? buildInitialSubjects() : [];
    this.topics = seedWithDefaults ? buildInitialTopics() : [];
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
}

const globalForCatalog = globalThis as unknown as {
  studyPlayCatalogStore?: InMemoryStudyCatalogStore;
};

export const defaultInMemoryCatalogStore =
  globalForCatalog.studyPlayCatalogStore ??
  (globalForCatalog.studyPlayCatalogStore = new InMemoryStudyCatalogStore(true));
