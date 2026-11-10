import type {
  ContentStatus,
  ContentVisibility,
} from "@/domain/models/studyplay";
import type { SubjectEntity, SubjectResult } from "./subjects.types";

export interface SubjectsRepository {
  listByOwner(ownerId: string): Promise<SubjectResult<SubjectEntity[]>>;
  listPublicPublished(): Promise<SubjectResult<SubjectEntity[]>>;
  findById(subjectId: string): Promise<SubjectResult<SubjectEntity | null>>;
  create(params: {
    ownerId: string;
    title: string;
    description: string;
    visibility: ContentVisibility;
    status: ContentStatus;
    publishedAt: string | null;
  }): Promise<SubjectResult<SubjectEntity>>;
  update(
    subjectId: string,
    params: {
      title: string;
      description: string;
      visibility: ContentVisibility;
      status: ContentStatus;
      publishedAt: string | null;
    }
  ): Promise<SubjectResult<SubjectEntity>>;
  delete(subjectId: string): Promise<SubjectResult<{ deleted: true }>>;
}
