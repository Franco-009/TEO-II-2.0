import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import {
  canReadSubject,
  canWriteSubject,
  filterPublicCatalogSubjects,
  validateCreateSubject,
  validateUpdateSubject,
} from "@/domain/subjects/subjects.rules";
import type {
  ActorContext,
  CreateSubjectInput,
  SubjectEntity,
  SubjectResult,
  UpdateSubjectInput,
} from "@/domain/subjects/subjects.types";

export async function listMySubjectsUseCase(
  repo: SubjectsRepository,
  actor: ActorContext | null
): Promise<SubjectResult<SubjectEntity[]>> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para consultar tus materias privadas.",
      },
    };
  }

  const res = await repo.listByOwner(actor.userId);
  if (!res.ok) return res;

  // Garantiza aislamiento estricto por propietario incluso en repositorios en memoria
  return {
    ok: true,
    data: res.data.filter((s) => s.ownerId === actor.userId),
  };
}

export async function listPublicCatalogUseCase(
  repo: SubjectsRepository
): Promise<SubjectResult<SubjectEntity[]>> {
  const res = await repo.listPublicPublished();
  if (!res.ok) return res;

  // Doble garantía de dominio: solo visibility = 'public' AND status = 'published'
  return {
    ok: true,
    data: filterPublicCatalogSubjects(res.data),
  };
}

export async function getSubjectByIdUseCase(
  repo: SubjectsRepository,
  actor: ActorContext | null,
  subjectId: string
): Promise<SubjectResult<SubjectEntity>> {
  const found = await repo.findById(subjectId);
  if (!found.ok) return found;

  if (!found.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia solicitada no existe.",
      },
    };
  }

  if (!canReadSubject(actor, found.data)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes acceso a esta materia.",
      },
    };
  }

  return { ok: true, data: found.data };
}

export async function createSubjectUseCase(
  repo: SubjectsRepository,
  actor: ActorContext | null,
  input: CreateSubjectInput
): Promise<SubjectResult<SubjectEntity>> {
  const validated = validateCreateSubject(actor, input);
  if (!validated.ok) return validated;

  return repo.create(validated.data);
}

export async function updateSubjectUseCase(
  repo: SubjectsRepository,
  actor: ActorContext | null,
  subjectId: string,
  patch: UpdateSubjectInput
): Promise<SubjectResult<SubjectEntity>> {
  const found = await repo.findById(subjectId);
  if (!found.ok) return found;

  if (!found.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia que intentas editar no existe.",
      },
    };
  }

  const validated = validateUpdateSubject(actor, found.data, patch);
  if (!validated.ok) return validated;

  return repo.update(subjectId, validated.data);
}

export async function deleteSubjectUseCase(
  repo: SubjectsRepository,
  actor: ActorContext | null,
  subjectId: string
): Promise<SubjectResult<{ deleted: true }>> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para eliminar una materia.",
      },
    };
  }

  const found = await repo.findById(subjectId);
  if (!found.ok) return found;

  if (!found.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia no existe.",
      },
    };
  }

  if (!canWriteSubject(actor, found.data)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes permiso para eliminar esta materia.",
      },
    };
  }

  return repo.delete(subjectId);
}
