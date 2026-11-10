import { canWriteSubject } from "@/domain/subjects/subjects.rules";
import type {
  ActorContext,
  SubjectEntity,
} from "@/domain/subjects/subjects.types";
import type {
  CreateTopicInput,
  TopicEntity,
  TopicResult,
  TopicTreeItem,
  UpdateTopicInput,
} from "./topics.types";

/**
 * Verifica si asignar `candidateParentId` como padre de `topicId`
 * generaría un ciclo directo (A -> A) o indirecto (A -> B -> C -> A).
 */
export function wouldCreateTopicCycle(
  existingTopics: TopicEntity[],
  topicId: string,
  candidateParentId: string | null
): boolean {
  if (!candidateParentId) {
    return false;
  }

  if (candidateParentId === topicId) {
    return true;
  }

  const byId = new Map<string, TopicEntity>(
    existingTopics.map((t) => [t.id, t])
  );
  const visited = new Set<string>([topicId]);

  let currentId: string | null = candidateParentId;
  while (currentId) {
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);
    const node = byId.get(currentId);
    currentId = node ? node.parentTopicId : null;
  }

  return false;
}

export function validateCreateTopic(
  actor: ActorContext | null,
  subject: SubjectEntity,
  existingTopics: TopicEntity[],
  input: CreateTopicInput
): TopicResult<{
  subjectId: string;
  parentTopicId: string | null;
  title: string;
  description: string;
  sortOrder: number;
}> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para agregar temas.",
      },
    };
  }

  if (!canWriteSubject(actor, subject)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes permisos para crear temas en esta materia.",
      },
    };
  }

  const title = input.title?.trim() ?? "";
  if (title.length < 1 || title.length > 120) {
    return {
      ok: false,
      error: {
        code: "INVALID_TOPIC_INPUT",
        message: "El título del tema debe tener entre 1 y 120 caracteres.",
      },
    };
  }

  const description = input.description?.trim() ?? "";
  if (description.length > 1000) {
    return {
      ok: false,
      error: {
        code: "INVALID_TOPIC_INPUT",
        message: "La descripción del tema no puede superar los 1000 caracteres.",
      },
    };
  }

  const parentTopicId = input.parentTopicId ?? null;
  if (parentTopicId !== null) {
    const parentTopic = existingTopics.find((t) => t.id === parentTopicId);
    if (!parentTopic || parentTopic.subjectId !== subject.id) {
      return {
        ok: false,
        error: {
          code: "INVALID_PARENT_TOPIC",
          message:
            "El tema padre seleccionado no existe o pertenece a otra materia.",
        },
      };
    }
  }

  const nextSortOrder =
    input.sortOrder !== undefined
      ? input.sortOrder
      : existingTopics.filter((t) => t.subjectId === subject.id).length + 1;

  if (!Number.isInteger(nextSortOrder) || nextSortOrder < 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_TOPIC_INPUT",
        message: "El orden (sort_order) debe ser un número entero mayor o igual a 0.",
      },
    };
  }

  return {
    ok: true,
    data: {
      subjectId: subject.id,
      parentTopicId,
      title,
      description,
      sortOrder: nextSortOrder,
    },
  };
}

export function validateUpdateTopic(
  actor: ActorContext | null,
  subject: SubjectEntity,
  existingTopics: TopicEntity[],
  targetTopic: TopicEntity,
  patch: UpdateTopicInput
): TopicResult<{
  parentTopicId: string | null;
  title: string;
  description: string;
  sortOrder: number;
}> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para editar un tema.",
      },
    };
  }

  if (!canWriteSubject(actor, subject)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes permisos para modificar temas de esta materia.",
      },
    };
  }

  const nextParentId =
    patch.parentTopicId !== undefined
      ? patch.parentTopicId
      : targetTopic.parentTopicId;

  if (nextParentId !== null) {
    if (nextParentId === targetTopic.id) {
      return {
        ok: false,
        error: {
          code: "TOPIC_CYCLE_DETECTED",
          message: "Un tema no puede ser padre de sí mismo.",
        },
      };
    }

    const parentNode = existingTopics.find((t) => t.id === nextParentId);
    if (!parentNode || parentNode.subjectId !== subject.id) {
      return {
        ok: false,
        error: {
          code: "INVALID_PARENT_TOPIC",
          message: "El tema padre debe pertenecer a la misma materia.",
        },
      };
    }

    if (wouldCreateTopicCycle(existingTopics, targetTopic.id, nextParentId)) {
      return {
        ok: false,
        error: {
          code: "TOPIC_CYCLE_DETECTED",
          message:
            "Ciclo jerárquico detectado: un tema no puede depender de uno de sus subtemas.",
        },
      };
    }
  }

  const nextTitle =
    patch.title !== undefined ? patch.title.trim() : targetTopic.title;
  if (nextTitle.length < 1 || nextTitle.length > 120) {
    return {
      ok: false,
      error: {
        code: "INVALID_TOPIC_INPUT",
        message: "El título del tema debe tener entre 1 y 120 caracteres.",
      },
    };
  }

  const nextDescription =
    patch.description !== undefined
      ? patch.description.trim()
      : targetTopic.description;
  if (nextDescription.length > 1000) {
    return {
      ok: false,
      error: {
        code: "INVALID_TOPIC_INPUT",
        message: "La descripción no puede superar los 1000 caracteres.",
      },
    };
  }

  const nextSortOrder =
    patch.sortOrder !== undefined ? patch.sortOrder : targetTopic.sortOrder;
  if (!Number.isInteger(nextSortOrder) || nextSortOrder < 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_TOPIC_INPUT",
        message: "El orden (sort_order) debe ser un entero mayor o igual a 0.",
      },
    };
  }

  return {
    ok: true,
    data: {
      parentTopicId: nextParentId,
      title: nextTitle,
      description: nextDescription,
      sortOrder: nextSortOrder,
    },
  };
}

/**
 * Construye el árbol jerárquico de temas ordenado por `sortOrder ASC, title ASC`
 * y lo devuelve aplanado en pre-orden con `depth` y `parentTitle`.
 */
export function buildOrderedTopicTree(topics: TopicEntity[]): TopicTreeItem[] {
  const byId = new Map<string, TopicEntity>(topics.map((t) => [t.id, t]));
  const childrenByParent = new Map<string | null, TopicEntity[]>();

  for (const topic of topics) {
    const validParentId =
      topic.parentTopicId && byId.has(topic.parentTopicId)
        ? topic.parentTopicId
        : null;
    const list = childrenByParent.get(validParentId) ?? [];
    list.push(topic);
    childrenByParent.set(validParentId, list);
  }

  for (const list of childrenByParent.values()) {
    list.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.title.localeCompare(b.title, "es");
    });
  }

  const result: TopicTreeItem[] = [];
  const visited = new Set<string>();

  function traverse(parentId: string | null, depth: number) {
    const children = childrenByParent.get(parentId) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const parentNode = child.parentTopicId
        ? byId.get(child.parentTopicId)
        : undefined;
      result.push({
        ...child,
        depth,
        parentTitle: parentNode ? parentNode.title : null,
      });
      traverse(child.id, depth + 1);
    }
  }

  traverse(null, 0);
  return result;
}
