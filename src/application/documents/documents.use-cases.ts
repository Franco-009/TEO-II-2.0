import type {
  DocumentsRepository,
  PrivateDocumentStoragePort,
} from "@/domain/documents/documents.ports";
import {
  buildPrivateStoragePath,
  canAccessPrivateDocument,
  canTransitionDocumentStatus,
  validateDocumentUpload,
} from "@/domain/documents/documents.rules";
import type {
  DocumentEntity,
  DocumentResult,
  SignedDocumentUrl,
  UploadDocumentInput,
} from "@/domain/documents/documents.types";
import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import type { ActorContext } from "@/domain/subjects/subjects.types";
import type { TopicsRepository } from "@/domain/topics/topics.ports";

const SIGNED_URL_EXPIRES_SECONDS = 300; // 5 minutos

export async function listMyDocumentsUseCase(
  docsRepo: DocumentsRepository,
  actor: ActorContext | null
): Promise<DocumentResult<DocumentEntity[]>> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para ver tus documentos PDF.",
      },
    };
  }

  const res = await docsRepo.listDocumentsByOwner(actor.userId);
  if (!res.ok) return res;

  return {
    ok: true,
    data: res.data.filter((d) => canAccessPrivateDocument(actor, d)),
  };
}

export async function listSubjectDocumentsUseCase(
  subjectsRepo: SubjectsRepository,
  docsRepo: DocumentsRepository,
  actor: ActorContext | null,
  subjectId: string
): Promise<DocumentResult<DocumentEntity[]>> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para consultar los documentos PDF.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "DOCUMENT_NOT_FOUND",
        message: "La materia solicitada no existe.",
      },
    };
  }

  if (subjectRes.data.ownerId !== actor.userId) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message:
          "No tienes permiso para acceder a los documentos PDF privados de otro usuario.",
      },
    };
  }

  return docsRepo.listDocumentsBySubject(subjectId, actor.userId);
}

export async function listTopicDocumentsUseCase(
  subjectsRepo: SubjectsRepository,
  docsRepo: DocumentsRepository,
  actor: ActorContext | null,
  subjectId: string,
  topicId: string
): Promise<DocumentResult<DocumentEntity[]>> {
  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para consultar documentos.",
      },
    };
  }

  const subjectRes = await subjectsRepo.findById(subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "DOCUMENT_NOT_FOUND",
        message: "La materia solicitada no existe.",
      },
    };
  }

  if (subjectRes.data.ownerId !== actor.userId) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message: "No tienes acceso a los documentos privados de otro usuario.",
      },
    };
  }

  return docsRepo.listDocumentsByTopic(topicId, actor.userId);
}

/**
 * Sube un documento PDF privado validando extensión .pdf, MIME application/pdf,
 * firma %PDF- y tamaño máximo 15 MB.
 * Si se provee `retryDocumentId` de un intento fallido del mismo propietario,
 * reutiliza el registro sin crear duplicados.
 */
export async function uploadDocumentUseCase(params: {
  subjectsRepo: SubjectsRepository;
  topicsRepo: TopicsRepository;
  docsRepo: DocumentsRepository;
  storagePort: PrivateDocumentStoragePort;
  actor: ActorContext | null;
  input: UploadDocumentInput;
}): Promise<DocumentResult<DocumentEntity>> {
  const { subjectsRepo, topicsRepo, docsRepo, storagePort, actor, input } =
    params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para subir un documento PDF.",
      },
    };
  }

  // Si es un reintento idempotente sobre un documento existente:
  if (input.retryDocumentId) {
    const existingRes = await docsRepo.findDocumentById(input.retryDocumentId);
    if (!existingRes.ok || !existingRes.data) {
      return {
        ok: false,
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "El documento que intentas reintentar no existe.",
        },
      };
    }

    const existingDoc = existingRes.data;
    if (!canAccessPrivateDocument(actor, existingDoc)) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN_NOT_OWNER",
          message: "No tienes permiso para reintentar un documento ajeno.",
        },
      };
    }

    if (!canTransitionDocumentStatus(existingDoc.status, "available")) {
      return {
        ok: false,
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `No se puede reintentar un documento en estado '${existingDoc.status}'.`,
        },
      };
    }

    await docsRepo.updateDocumentStatus(existingDoc.id, "uploading");

    const uploadRetry = await storagePort.uploadPdfObject({
      storagePath: existingDoc.storagePath,
      mimeType: "application/pdf",
      sizeBytes: existingDoc.sizeBytes,
      simulateFailure: input.simulateStorageFailure,
    });

    if (!uploadRetry.ok) {
      await docsRepo.updateDocumentStatus(existingDoc.id, "failed");
      return uploadRetry;
    }

    return docsRepo.updateDocumentStatus(existingDoc.id, "available");
  }

  // Subida nueva: validar materia y tema opcional
  const subjectRes = await subjectsRepo.findById(input.subjectId);
  if (!subjectRes.ok || !subjectRes.data) {
    return {
      ok: false,
      error: {
        code: "DOCUMENT_NOT_FOUND",
        message: "La materia seleccionada no existe.",
      },
    };
  }

  let topicEntity = null;
  if (input.topicId) {
    const topicRes = await topicsRepo.findTopicById(input.topicId);
    if (topicRes.ok && topicRes.data) {
      topicEntity = topicRes.data;
    }
  }

  const validated = validateDocumentUpload(
    actor,
    subjectRes.data,
    topicEntity,
    input
  );
  if (!validated.ok) {
    return validated;
  }

  const newDocId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = buildPrivateStoragePath(
    validated.data.ownerId,
    newDocId,
    validated.data.sanitizedFilename
  );

  // 1) Crear registro en estado 'uploading'
  const createdRes = await docsRepo.createDocumentRecord({
    id: newDocId,
    ownerId: validated.data.ownerId,
    subjectId: validated.data.subjectId,
    subjectTitle: subjectRes.data.title,
    topicId: validated.data.topicId,
    topicTitle: topicEntity?.title ?? null,
    storagePath,
    filename: validated.data.sanitizedFilename,
    mimeType: "application/pdf",
    sizeBytes: validated.data.sizeBytes,
    status: "uploading",
  });

  if (!createdRes.ok) {
    return createdRes;
  }

  // 2) Subir al bucket privado study-documents
  const storageRes = await storagePort.uploadPdfObject({
    storagePath,
    mimeType: "application/pdf",
    sizeBytes: validated.data.sizeBytes,
    simulateFailure: input.simulateStorageFailure,
  });

  if (!storageRes.ok) {
    // Marcar como 'failed' para permitir reintento idempotente sin duplicar fila
    await docsRepo.updateDocumentStatus(newDocId, "failed");
    return storageRes;
  }

  // 3) Marcar como 'available'
  return docsRepo.updateDocumentStatus(newDocId, "available");
}

export async function getSignedDocumentUrlUseCase(params: {
  docsRepo: DocumentsRepository;
  storagePort: PrivateDocumentStoragePort;
  actor: ActorContext | null;
  documentId: string;
}): Promise<DocumentResult<SignedDocumentUrl>> {
  const { docsRepo, storagePort, actor, documentId } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para abrir un documento privado.",
      },
    };
  }

  const docRes = await docsRepo.findDocumentById(documentId);
  if (!docRes.ok || !docRes.data) {
    return {
      ok: false,
      error: {
        code: "DOCUMENT_NOT_FOUND",
        message: "El documento solicitado no existe.",
      },
    };
  }

  const doc = docRes.data;
  if (!canAccessPrivateDocument(actor, doc)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message:
          "Acceso denegado: no puedes generar una URL firmada para el documento privado de otro usuario.",
      },
    };
  }

  if (doc.status !== "available") {
    return {
      ok: false,
      error: {
        code: "DOCUMENT_UNAVAILABLE",
        message: `El documento no está disponible para lectura (estado actual: '${doc.status}').`,
      },
    };
  }

  return storagePort.createSignedReadUrl({
    documentId: doc.id,
    filename: doc.filename,
    storagePath: doc.storagePath,
    expiresInSeconds: SIGNED_URL_EXPIRES_SECONDS,
  });
}

export async function deleteDocumentUseCase(params: {
  docsRepo: DocumentsRepository;
  storagePort: PrivateDocumentStoragePort;
  actor: ActorContext | null;
  documentId: string;
}): Promise<
  DocumentResult<{
    deleted: true;
    preservedLinkedQuestions: number;
  }>
> {
  const { docsRepo, storagePort, actor, documentId } = params;

  if (!actor || !actor.userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para eliminar un documento.",
      },
    };
  }

  const docRes = await docsRepo.findDocumentById(documentId);
  if (!docRes.ok || !docRes.data) {
    return {
      ok: false,
      error: {
        code: "DOCUMENT_NOT_FOUND",
        message: "El documento no existe.",
      },
    };
  }

  const doc = docRes.data;
  if (!canAccessPrivateDocument(actor, doc)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_NOT_OWNER",
        message:
          "Acceso denegado: no puedes eliminar el documento PDF privado de otro usuario.",
      },
    };
  }

  await storagePort.removePdfObject(doc.storagePath);
  return docsRepo.deleteDocumentRecord(doc.id);
}
