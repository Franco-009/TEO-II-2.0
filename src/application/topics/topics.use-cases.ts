import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import { canReadSubject, canWriteSubject } from "@/domain/subjects/subjects.rules";
import type { ActorContext } from "@/domain/subjects/subjects.types";
import type { TopicsRepository } from "@/domain/topics/topics.ports";
import {
  buildOrderedTopicTree,
  validateCreateTopic,
  validateUpdateTopic,
} from "@/domain/topics/topics.rules";
import type {
  CreateTopicInput,
  TopicEntity,
  TopicResult,
  TopicTreeItem,
  UpdateTopicInput,
} from "@/domain/topics/topics.types";

export async function listSubjectTopicsTreeUseCase(
  subjectsRepo: SubjectsRepository,
  topicsRepo: TopicsRepository,
  actor: ActorContext | null,
  subjectId: string
): Promise<TopicResult<TopicTreeItem[]>> {
  const subjectRes = await subjectsRepo.findById(subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "La materia asociada no fue encontrada.",
      },
    };
  }

  if (!canReadSubject(actor, subjectRes.data)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes permiso para consultar los temas de esta materia.",
      },
    };
  }

  const topicsRes = await topicsRepo.listBySubject(subjectId);
  if (!topicsRes.ok) return topicsRes;

  return {
    ok: true,
    data: buildOrderedTopicTree(topicsRes.data),
  };
}

export async function getTopicByIdUseCase(
  subjectsRepo: SubjectsRepository,
  topicsRepo: TopicsRepository,
  actor: ActorContext | null,
  topicId: string
): Promise<TopicResult<{ topic: TopicEntity; parentTitle: string | null }>> {
  const topicRes = await topicsRepo.findTopicById(topicId);
  if (!topicRes.ok || !topicRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "El tema solicitado no existe.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(topicRes.data.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "La materia del tema no existe.",
      },
    };
  }

  if (!canReadSubject(actor, subjectRes.data)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes acceso a este tema.",
      },
    };
  }

  let parentTitle: string | null = null;
  if (topicRes.data.parentTopicId) {
    const parentRes = await topicsRepo.findTopicById(
      topicRes.data.parentTopicId
    );
    if (parentRes.ok && parentRes.data) {
      parentTitle = parentRes.data.title;
    }
  }

  return {
    ok: true,
    data: {
      topic: topicRes.data,
      parentTitle,
    },
  };
}

export async function createTopicUseCase(
  subjectsRepo: SubjectsRepository,
  topicsRepo: TopicsRepository,
  actor: ActorContext | null,
  input: CreateTopicInput
): Promise<TopicResult<TopicEntity>> {
  const subjectRes = await subjectsRepo.findById(input.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "La materia donde intentas crear el tema no existe.",
      },
    };
  }

  const existingTopicsRes = await topicsRepo.listBySubject(input.subjectId);
  if (!existingTopicsRes.ok) return existingTopicsRes;

  const validated = validateCreateTopic(
    actor,
    subjectRes.data,
    existingTopicsRes.data,
    input
  );
  if (!validated.ok) return validated;

  return topicsRepo.createTopic(validated.data);
}

export async function updateTopicUseCase(
  subjectsRepo: SubjectsRepository,
  topicsRepo: TopicsRepository,
  actor: ActorContext | null,
  topicId: string,
  patch: UpdateTopicInput
): Promise<TopicResult<TopicEntity>> {
  const targetRes = await topicsRepo.findTopicById(topicId);
  if (!targetRes.ok || !targetRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "El tema que intentas actualizar no existe.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(targetRes.data.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "La materia asociada no existe.",
      },
    };
  }

  const existingTopicsRes = await topicsRepo.listBySubject(
    targetRes.data.subjectId
  );
  if (!existingTopicsRes.ok) return existingTopicsRes;

  const validated = validateUpdateTopic(
    actor,
    subjectRes.data,
    existingTopicsRes.data,
    targetRes.data,
    patch
  );
  if (!validated.ok) return validated;

  return topicsRepo.updateTopic(topicId, validated.data);
}

export async function deleteTopicUseCase(
  subjectsRepo: SubjectsRepository,
  topicsRepo: TopicsRepository,
  actor: ActorContext | null,
  topicId: string
): Promise<TopicResult<{ deleted: true }>> {
  const targetRes = await topicsRepo.findTopicById(topicId);
  if (!targetRes.ok || !targetRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "El tema no existe.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(targetRes.data.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "La materia asociada no existe.",
      },
    };
  }

  if (!canWriteSubject(actor, subjectRes.data)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes permisos para eliminar temas en esta materia.",
      },
    };
  }

  return topicsRepo.deleteTopic(topicId);
}
