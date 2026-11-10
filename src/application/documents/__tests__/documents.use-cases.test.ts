import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteDocumentUseCase,
  getSignedDocumentUrlUseCase,
  listSubjectDocumentsUseCase,
  uploadDocumentUseCase,
} from "../documents.use-cases";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { InMemoryStudyCatalogStore } from "@/infrastructure/supabase/in-memory-catalog.store";

const userA = { userId: MOCK_USER_PROFILE.id, role: "user" as const };
const userB = { userId: "other-student-b", role: "user" as const };

describe("Casos de uso de Documentos PDF y Storage Privado (Fase 4)", () => {
  let store: InMemoryStudyCatalogStore;

  beforeEach(() => {
    store = new InMemoryStudyCatalogStore();
  });

  it("sube un PDF válido, lo registra en el bucket privado y permite generar una URL firmada temporal (5 min)", async () => {
    const uploadRes = await uploadDocumentUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      storagePort: store,
      actor: userA,
      input: {
        subjectId: "subj-anatomia",
        topicId: "top-cardio-1",
        filename: "Resumen Canales Ionicos.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1_200_000,
        headerSignature: "%PDF-1.7",
      },
    });

    expect(uploadRes.ok).toBe(true);
    if (!uploadRes.ok) return;

    expect(uploadRes.data.status).toBe("available");
    expect(uploadRes.data.storagePath).toContain(
      `${userA.userId}/${uploadRes.data.id}/resumen-canales-ionicos.pdf`
    );

    const signedRes = await getSignedDocumentUrlUseCase({
      docsRepo: store,
      storagePort: store,
      actor: userA,
      documentId: uploadRes.data.id,
    });

    expect(signedRes.ok).toBe(true);
    if (signedRes.ok) {
      expect(signedRes.data.signedUrl).toContain(
        "https://storage.studyplay.local/study-documents/"
      );
      expect(signedRes.data.storagePath).toBe(uploadRes.data.storagePath);
    }
  });

  it("gestiona fallos de subida a Storage marcando estado failed y permite reintento idempotente sin duplicar registros", async () => {
    const initialDocs = await store.listDocumentsByOwner(userA.userId);
    const initialCount = initialDocs.ok ? initialDocs.data.length : 0;

    // 1) Intento con fallo simulado de red/Storage
    const failedRes = await uploadDocumentUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      storagePort: store,
      actor: userA,
      input: {
        subjectId: "subj-anatomia",
        filename: "Apunte Con Corte De Red.pdf",
        mimeType: "application/pdf",
        sizeBytes: 950_000,
        headerSignature: "%PDF-1.7",
        simulateStorageFailure: true,
      },
    });

    expect(failedRes.ok).toBe(false);
    if (!failedRes.ok) {
      expect(failedRes.error.code).toBe("STORAGE_UPLOAD_FAILED");
    }

    const afterFailDocs = await store.listDocumentsByOwner(userA.userId);
    expect(afterFailDocs.ok).toBe(true);
    if (!afterFailDocs.ok) return;

    // Se creó 1 único registro en estado 'failed'
    expect(afterFailDocs.data.length).toBe(initialCount + 1);
    const failedDoc = afterFailDocs.data[0];
    expect(failedDoc.status).toBe("failed");

    // 2) Reintento idempotente pasando retryDocumentId
    const retryRes = await uploadDocumentUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      storagePort: store,
      actor: userA,
      input: {
        subjectId: "subj-anatomia",
        filename: failedDoc.filename,
        mimeType: "application/pdf",
        sizeBytes: failedDoc.sizeBytes,
        headerSignature: "%PDF-1.7",
        retryDocumentId: failedDoc.id,
        simulateStorageFailure: false,
      },
    });

    expect(retryRes.ok).toBe(true);
    if (retryRes.ok) {
      expect(retryRes.data.id).toBe(failedDoc.id);
      expect(retryRes.data.status).toBe("available");
    }

    // Verificar que NO se crearon filas duplicadas
    const afterRetryDocs = await store.listDocumentsByOwner(userA.userId);
    if (afterRetryDocs.ok) {
      expect(afterRetryDocs.data.length).toBe(initialCount + 1);
    }
  });

  it("Caso Imprescindible #10: Usuario B no puede listar, pedir URL firmada ni eliminar el PDF privado del Usuario A", async () => {
    // El documento 'doc-01' pertenece a Usuario A ('usr-demo-01')
    const listAttempt = await listSubjectDocumentsUseCase(
      store,
      store,
      userB,
      "subj-anatomia"
    );
    expect(listAttempt.ok).toBe(false);
    if (!listAttempt.ok) {
      expect(listAttempt.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    const signedUrlAttempt = await getSignedDocumentUrlUseCase({
      docsRepo: store,
      storagePort: store,
      actor: userB,
      documentId: "doc-01",
    });
    expect(signedUrlAttempt.ok).toBe(false);
    if (!signedUrlAttempt.ok) {
      expect(signedUrlAttempt.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    const deleteAttempt = await deleteDocumentUseCase({
      docsRepo: store,
      storagePort: store,
      actor: userB,
      documentId: "doc-01",
    });
    expect(deleteAttempt.ok).toBe(false);
    if (!deleteAttempt.ok) {
      expect(deleteAttempt.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }
  });

  it("elimina el PDF del bucket privado cuando lo solicita su dueño pero preserva el conteo de preguntas asociadas", async () => {
    const deleteRes = await deleteDocumentUseCase({
      docsRepo: store,
      storagePort: store,
      actor: userA,
      documentId: "doc-01",
    });

    expect(deleteRes.ok).toBe(true);
    if (deleteRes.ok) {
      expect(deleteRes.data.deleted).toBe(true);
      expect(deleteRes.data.preservedLinkedQuestions).toBeGreaterThan(0);
    }

    const checkDeleted = await store.findDocumentById("doc-01");
    expect(checkDeleted.ok && checkDeleted.data).toBeNull();
  });
});
