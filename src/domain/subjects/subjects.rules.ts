import type {
  ContentStatus,
  ContentVisibility,
} from "@/domain/models/studyplay";
import type {
  ActorContext,
  CreateSubjectInput,
  SubjectEntity,
  SubjectResult,
  UpdateSubjectInput,
} from "./subjects.types";

const VALID_VISIBILITIES: ContentVisibility[] = ["private", "public"];
const VALID_STATUSES: ContentStatus[] = ["draft", "published", "archived"];

export function canReadSubject(
  actor: ActorContext | null,
  subject: SubjectEntity
): boolean {
  if (subject.visibility === "public" && subject.status === "published") {
    return true;
  }

  if (!actor) {
    return false;
  }

  if (subject.ownerId === actor.userId) {
    return true;
  }

  if (actor.role === "admin" && subject.visibility === "public") {
    return true;
  }

  return false;
}

export function canWriteSubject(
  actor: ActorContext | null,
  subject: SubjectEntity
): boolean {
  if (!actor || !actor.userId) {
    return false;
  }

  if (subject.ownerId === actor.userId) {
    return true;
  }

  if (actor.role === "admin" && subject.visibility === "public") {
    return true;
  }

  return false;
}

export function filterPublicCatalogSubjects(
  subjects: SubjectEntity[]
): SubjectEntity[] {
  return subjects.filter(
    (s) => s.visibility === "public" && s.status === "published"
  );
}

export function validateCreateSubject(
  actor: ActorContext | null,
  input: CreateSubjectInput
): SubjectResult<{
  ownerId: string;
  title: string;
  description: string;
  visibility: ContentVisibility;
  status: ContentStatus;
  publishedAt: string | null;
}> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para crear una materia.",
      },
    };
  }

  const title = input.title?.trim() ?? "";
  if (title.length < 1 || title.length > 120) {
    return {
      ok: false,
      error: {
        code: "INVALID_SUBJECT_INPUT",
        message: "El título de la materia debe tener entre 1 y 120 caracteres.",
      },
    };
  }

  const description = input.description?.trim() ?? "";
  if (description.length > 1000) {
    return {
      ok: false,
      error: {
        code: "INVALID_SUBJECT_INPUT",
        message: "La descripción no puede superar los 1000 caracteres.",
      },
    };
  }

  const visibility: ContentVisibility = input.visibility ?? "private";
  if (!VALID_VISIBILITIES.includes(visibility)) {
    return {
      ok: false,
      error: {
        code: "INVALID_SUBJECT_INPUT",
        message: "Visibilidad de materia inválida.",
      },
    };
  }

  if (visibility === "public" && actor.role !== "admin") {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_PUBLIC_CATALOG",
        message:
          "Solo un administrador puede crear o publicar materias en el catálogo público.",
      },
    };
  }

  const status: ContentStatus = input.status ?? "draft";
  if (!VALID_STATUSES.includes(status)) {
    return {
      ok: false,
      error: {
        code: "INVALID_SUBJECT_INPUT",
        message: "Estado de materia inválido.",
      },
    };
  }

  const publishedAt =
    status === "published" ? new Date().toISOString() : null;

  return {
    ok: true,
    data: {
      ownerId: actor.userId,
      title,
      description,
      visibility,
      status,
      publishedAt,
    },
  };
}

export function validateUpdateSubject(
  actor: ActorContext | null,
  existing: SubjectEntity,
  patch: UpdateSubjectInput
): SubjectResult<{
  title: string;
  description: string;
  visibility: ContentVisibility;
  status: ContentStatus;
  publishedAt: string | null;
}> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para editar una materia.",
      },
    };
  }

  if (!canWriteSubject(actor, existing)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes permisos para modificar esta materia.",
      },
    };
  }

  const nextVisibility: ContentVisibility =
    patch.visibility ?? existing.visibility;
  if (!VALID_VISIBILITIES.includes(nextVisibility)) {
    return {
      ok: false,
      error: {
        code: "INVALID_SUBJECT_INPUT",
        message: "Visibilidad de materia inválida.",
      },
    };
  }

  if (nextVisibility === "public" && actor.role !== "admin") {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_PUBLIC_CATALOG",
        message:
          "Solo un administrador puede pasar una materia al catálogo público.",
      },
    };
  }

  const nextStatus: ContentStatus = patch.status ?? existing.status;
  if (!VALID_STATUSES.includes(nextStatus)) {
    return {
      ok: false,
      error: {
        code: "INVALID_SUBJECT_INPUT",
        message: "Estado de materia inválido.",
      },
    };
  }

  const nextTitle =
    patch.title !== undefined ? patch.title.trim() : existing.title;
  if (nextTitle.length < 1 || nextTitle.length > 120) {
    return {
      ok: false,
      error: {
        code: "INVALID_SUBJECT_INPUT",
        message: "El título de la materia debe tener entre 1 y 120 caracteres.",
      },
    };
  }

  const nextDescription =
    patch.description !== undefined
      ? patch.description.trim()
      : existing.description;
  if (nextDescription.length > 1000) {
    return {
      ok: false,
      error: {
        code: "INVALID_SUBJECT_INPUT",
        message: "La descripción no puede superar los 1000 caracteres.",
      },
    };
  }

  const publishedAt =
    nextStatus === "published"
      ? (existing.publishedAt ?? new Date().toISOString())
      : existing.publishedAt;

  return {
    ok: true,
    data: {
      title: nextTitle,
      description: nextDescription,
      visibility: nextVisibility,
      status: nextStatus,
      publishedAt,
    },
  };
}
