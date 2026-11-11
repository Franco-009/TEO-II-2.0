import type { DocumentsRepository } from "@/domain/documents/documents.ports";
import type { ContentStatus } from "@/domain/models/studyplay";
import type { QuestionsRepository } from "@/domain/questions/questions.ports";
import {
  canReadQuestion,
  canWriteQuestion,
  computeNextQuestionVersion,
  validateQuestionDraftInput,
  validateQuestionForPublication,
} from "@/domain/questions/questions.rules";
import type {
  CreateQuestionInput,
  QuestionEntity,
  QuestionResult,
  UpdateQuestionInput,
} from "@/domain/questions/questions.types";
import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import type { ActorContext } from "@/domain/subjects/subjects.types";
import type { TopicsRepository } from "@/domain/topics/topics.ports";

export async function listTopicQuestionsUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  questionsRepo: QuestionsRepository;
  actor: ActorContext | null;
  topicId: string;
}): Promise<QuestionResult<QuestionEntity[]>> {
  const { subjectsRepo, topicsRepo, questionsRepo, actor, topicId } = params;

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
        code: "SUBJECT_NOT_FOUND",
        message: "La materia asociada al tema no existe.",
      },
    };
  }

  const subject = subjectRes.data;
  const listRes = await questionsRepo.listQuestionsByTopic(topicId);
  if (!listRes.ok) {
    return listRes;
  }

  // Verificar si el actor tiene acceso al menos de lectura a la materia
  const canReadAny = canReadQuestion(actor, subject, { status: "published" });
  if (!canReadAny) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message:
          "Acceso denegado: no tienes permiso para leer las preguntas privadas de otro usuario.",
      },
    };
  }

  return {
    ok: true,
    data: listRes.data.filter((q) => canReadQuestion(actor, subject, q)),
  };
}

export async function listSubjectQuestionsUseCase(params: {
  subjectsRepo: SubjectsRepository;
  questionsRepo: QuestionsRepository;
  actor: ActorContext | null;
  subjectId: string;
}): Promise<QuestionResult<QuestionEntity[]>> {
  const { subjectsRepo, questionsRepo, actor, subjectId } = params;

  const subjectRes = await subjectsRepo.findById(subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia solicitada no existe.",
      },
    };
  }

  const subject = subjectRes.data;
  const canReadAny = canReadQuestion(actor, subject, { status: "published" });
  if (!canReadAny) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message:
          "Acceso denegado: no tienes permiso para consultar las preguntas de esta materia.",
      },
    };
  }

  const listRes = await questionsRepo.listQuestionsBySubject(subjectId);
  if (!listRes.ok) {
    return listRes;
  }

  return {
    ok: true,
    data: listRes.data.filter((q) => canReadQuestion(actor, subject, q)),
  };
}

export async function createQuestionUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  docsRepo: DocumentsRepository;
  questionsRepo: QuestionsRepository;
  actor: ActorContext | null;
  input: CreateQuestionInput;
}): Promise<QuestionResult<QuestionEntity>> {
  const { subjectsRepo, topicsRepo, docsRepo, questionsRepo, actor, input } =
    params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para crear preguntas.",
      },
    };
  }

  const topicRes = await topicsRepo.findTopicById(input.topicId);
  if (!topicRes.ok || !topicRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "El tema seleccionado no existe.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(topicRes.data.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia seleccionada no existe.",
      },
    };
  }

  const subject = subjectRes.data;
  if (!canWriteQuestion(actor, subject)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message:
          "No tienes permiso para crear preguntas en una materia que no te pertenece.",
      },
    };
  }

  const resolvedDocId: string | null = input.sourceDocumentId ?? null;
  let resolvedDocName: string | null = input.sourceDocumentName?.trim() || null;

  if (resolvedDocId) {
    const docRes = await docsRepo.findDocumentById(resolvedDocId);
    if (!docRes.ok || !docRes.data) {
      return {
        ok: false,
        error: {
          code: "INVALID_SOURCE_DOCUMENT",
          message: "El documento PDF fuente seleccionado no existe.",
        },
      };
    }

    if (
      docRes.data.ownerId !== actor.userId ||
      docRes.data.subjectId !== subject.id
    ) {
      return {
        ok: false,
        error: {
          code: "INVALID_SOURCE_DOCUMENT",
          message:
            "El documento PDF fuente debe pertenecer a tu cuenta y a esta misma materia.",
        },
      };
    }

    resolvedDocName = docRes.data.filename;
  }

  const requestedStatus: ContentStatus = input.status ?? "draft";
  const validated =
    requestedStatus === "published"
      ? validateQuestionForPublication(input)
      : validateQuestionDraftInput({ ...input, status: requestedStatus });

  if (!validated.ok) {
    return validated;
  }

  return questionsRepo.createQuestionRecord({
    topicId: topicRes.data.id,
    authorId: actor.userId,
    type: validated.data.type,
    prompt: validated.data.prompt,
    explanation: validated.data.explanation,
    difficulty: validated.data.difficulty,
    status: validated.data.status,
    sourceDocumentId: resolvedDocId,
    sourceDocumentName: resolvedDocName,
    sourcePage: validated.data.sourcePage,
    version: 1,
    options: validated.data.options,
  });
}

export async function updateQuestionUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  docsRepo: DocumentsRepository;
  questionsRepo: QuestionsRepository;
  actor: ActorContext | null;
  questionId: string;
  input: UpdateQuestionInput;
}): Promise<QuestionResult<QuestionEntity>> {
  const {
    subjectsRepo,
    topicsRepo,
    docsRepo,
    questionsRepo,
    actor,
    questionId,
    input,
  } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para editar preguntas.",
      },
    };
  }

  const existingRes = await questionsRepo.findQuestionById(questionId);
  if (!existingRes.ok || !existingRes.data) {
    return {
      ok: false,
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "La pregunta solicitada no existe.",
      },
    };
  }

  const existing = existingRes.data;
  const topicRes = await topicsRepo.findTopicById(existing.topicId);
  if (!topicRes.ok || !topicRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "El tema de la pregunta no existe.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(topicRes.data.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia de la pregunta no existe.",
      },
    };
  }

  if (!canWriteQuestion(actor, subjectRes.data)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes permiso para editar preguntas de otro usuario.",
      },
    };
  }

  let resolvedDocId: string | null =
    input.sourceDocumentId !== undefined
      ? input.sourceDocumentId
      : existing.sourceDocumentId;
  let resolvedDocName: string | null =
    input.sourceDocumentName !== undefined
      ? input.sourceDocumentName
      : existing.sourceDocumentName;

  if (resolvedDocId) {
    const docRes = await docsRepo.findDocumentById(resolvedDocId);
    if (!docRes.ok || !docRes.data) {
      resolvedDocId = null;
    } else if (
      docRes.data.ownerId !== actor.userId ||
      docRes.data.subjectId !== subjectRes.data.id
    ) {
      return {
        ok: false,
        error: {
          code: "INVALID_SOURCE_DOCUMENT",
          message:
            "El documento PDF fuente debe pertenecer a tu cuenta y a esta materia.",
        },
      };
    } else {
      resolvedDocName = docRes.data.filename;
    }
  }

  const mergedInput = {
    type: input.type ?? existing.type,
    prompt: input.prompt ?? existing.prompt,
    explanation: input.explanation ?? existing.explanation,
    difficulty: input.difficulty ?? existing.difficulty,
    status: input.status ?? existing.status,
    sourcePage:
      input.sourcePage !== undefined ? input.sourcePage : existing.sourcePage,
    options: input.options ?? existing.options,
  };

  const validated =
    mergedInput.status === "published"
      ? validateQuestionForPublication(mergedInput)
      : validateQuestionDraftInput(mergedInput);

  if (!validated.ok) {
    return validated;
  }

  const nextVersion = computeNextQuestionVersion(existing, validated.data);

  return questionsRepo.updateQuestionRecord(questionId, {
    type: validated.data.type,
    prompt: validated.data.prompt,
    explanation: validated.data.explanation,
    difficulty: validated.data.difficulty,
    status: validated.data.status,
    sourceDocumentId: resolvedDocId,
    sourceDocumentName: resolvedDocName,
    sourcePage: validated.data.sourcePage,
    version: nextVersion,
    options: validated.data.options,
  });
}

export async function changeQuestionStatusUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  questionsRepo: QuestionsRepository;
  actor: ActorContext | null;
  questionId: string;
  status: ContentStatus;
}): Promise<QuestionResult<QuestionEntity>> {
  const { subjectsRepo, topicsRepo, questionsRepo, actor, questionId, status } =
    params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para cambiar el estado de la pregunta.",
      },
    };
  }

  const existingRes = await questionsRepo.findQuestionById(questionId);
  if (!existingRes.ok || !existingRes.data) {
    return {
      ok: false,
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "La pregunta no existe.",
      },
    };
  }

  const existing = existingRes.data;
  const topicRes = await topicsRepo.findTopicById(existing.topicId);
  if (!topicRes.ok || !topicRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "El tema de la pregunta no existe.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(topicRes.data.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia de la pregunta no existe.",
      },
    };
  }

  if (!canWriteQuestion(actor, subjectRes.data)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message:
          "No tienes permiso para modificar el estado de preguntas de otro usuario.",
      },
    };
  }

  if (status === "published") {
    const pubValidation = validateQuestionForPublication({
      type: existing.type,
      prompt: existing.prompt,
      explanation: existing.explanation,
      difficulty: existing.difficulty,
      sourcePage: existing.sourcePage,
      options: existing.options,
    });
    if (!pubValidation.ok) {
      return pubValidation;
    }
  }

  return questionsRepo.updateQuestionStatus(questionId, status);
}

export async function deleteQuestionUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  questionsRepo: QuestionsRepository;
  actor: ActorContext | null;
  questionId: string;
}): Promise<QuestionResult<{ deleted: true }>> {
  const { subjectsRepo, topicsRepo, questionsRepo, actor, questionId } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para eliminar una pregunta.",
      },
    };
  }

  const existingRes = await questionsRepo.findQuestionById(questionId);
  if (!existingRes.ok || !existingRes.data) {
    return {
      ok: false,
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "La pregunta no existe.",
      },
    };
  }

  const topicRes = await topicsRepo.findTopicById(existingRes.data.topicId);
  if (!topicRes.ok || !topicRes.data) {
    return {
      ok: false,
      error: {
        code: "TOPIC_NOT_FOUND",
        message: "El tema no existe.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(topicRes.data.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "SUBJECT_NOT_FOUND",
        message: "La materia no existe.",
      },
    };
  }

  if (!canWriteQuestion(actor, subjectRes.data)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes permiso para eliminar preguntas de otro usuario.",
      },
    };
  }

  return questionsRepo.deleteQuestionRecord(questionId);
}
