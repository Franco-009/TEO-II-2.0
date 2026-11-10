import { describe, expect, it } from "vitest";
import {
  buildPrivateStoragePath,
  canAccessPrivateDocument,
  canTransitionDocumentStatus,
  sanitizePdfFilename,
  validateDocumentUpload,
} from "../documents.rules";
import { MAX_PDF_SIZE_BYTES } from "../documents.types";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";
import type { TopicEntity } from "@/domain/topics/topics.types";

const ownerActor = { userId: "user-a", role: "user" as const };
const otherActor = { userId: "user-b", role: "user" as const };
const adminActor = { userId: "admin-1", role: "admin" as const };

const baseSubject: SubjectEntity = {
  id: "sub-1",
  ownerId: "user-a",
  title: "Fisiología",
  description: "Materia privada",
  visibility: "private",
  status: "published",
  publishedAt: null,
  createdAt: "2026-11-10T10:00:00.000Z",
  updatedAt: "2026-11-10T10:00:00.000Z",
};

const baseTopic: TopicEntity = {
  id: "top-1",
  subjectId: "sub-1",
  parentTopicId: null,
  title: "Potencial de Acción",
  description: "Tema 1",
  sortOrder: 1,
  createdAt: "2026-11-10T10:00:00.000Z",
  updatedAt: "2026-11-10T10:00:00.000Z",
};

describe("Reglas de dominio de Documentos PDF (Fase 4)", () => {
  it("acepta un archivo PDF válido dentro del límite de 15 MB", () => {
    const res = validateDocumentUpload(ownerActor, baseSubject, baseTopic, {
      subjectId: "sub-1",
      topicId: "top-1",
      filename: "Guyton Cap 4 - Membrana!.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2_500_000,
      headerSignature: "%PDF-1.7",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.sanitizedFilename).toBe("guyton-cap-4-membrana.pdf");
      expect(res.data.ownerId).toBe("user-a");
    }
  });

  it("rechaza archivos mayores a 15 MB (15_728_640 bytes) con PDF_TOO_LARGE", () => {
    const res = validateDocumentUpload(ownerActor, baseSubject, null, {
      subjectId: "sub-1",
      filename: "libro-pesado.pdf",
      mimeType: "application/pdf",
      sizeBytes: MAX_PDF_SIZE_BYTES + 1,
      headerSignature: "%PDF-1.5",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("PDF_TOO_LARGE");
    }
  });

  it("rechaza extensiones o tipos MIME distintos de PDF con INVALID_PDF_EXTENSION / INVALID_PDF_MIME", () => {
    const resWrongExt = validateDocumentUpload(ownerActor, baseSubject, null, {
      subjectId: "sub-1",
      filename: "ejecutable.exe",
      mimeType: "application/pdf",
      sizeBytes: 50_000,
    });
    expect(resWrongExt.ok).toBe(false);
    if (!resWrongExt.ok) {
      expect(resWrongExt.error.code).toBe("INVALID_PDF_EXTENSION");
    }

    const resWrongMime = validateDocumentUpload(ownerActor, baseSubject, null, {
      subjectId: "sub-1",
      filename: "imagen.pdf",
      mimeType: "image/png",
      sizeBytes: 50_000,
    });
    expect(resWrongMime.ok).toBe(false);
    if (!resWrongMime.ok) {
      expect(resWrongMime.error.code).toBe("INVALID_PDF_MIME");
    }
  });

  it("rechaza archivos con firma de cabecera corrupta (sin %PDF-) con INVALID_PDF_SIGNATURE", () => {
    const resCorrupt = validateDocumentUpload(ownerActor, baseSubject, null, {
      subjectId: "sub-1",
      filename: "corrupto.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      headerSignature: "HTML-FAKE",
    });

    expect(resCorrupt.ok).toBe(false);
    if (!resCorrupt.ok) {
      expect(resCorrupt.error.code).toBe("INVALID_PDF_SIGNATURE");
    }
  });

  it("genera storage_path determinista bajo {user_id}/{document_id}/{filename}", () => {
    const sanitized = sanitizePdfFilename("../../Apunte Electrofisiología.pdf");
    const path = buildPrivateStoragePath("user-a", "doc-99", sanitized);

    expect(path).toBe("user-a/doc-99/apunte-electrofisiolog-a.pdf");
  });

  it("valida la máquina de estados incluyendo reintento desde failed a available", () => {
    expect(canTransitionDocumentStatus("uploading", "available")).toBe(true);
    expect(canTransitionDocumentStatus("uploading", "failed")).toBe(true);
    expect(canTransitionDocumentStatus("failed", "available")).toBe(true);
    expect(canTransitionDocumentStatus("unavailable", "available")).toBe(false);
  });

  it("garantiza privacidad estricta del PDF: solo owner_id tiene acceso (ni otro usuario ni admin rutinario)", () => {
    const doc = { ownerId: "user-a" };

    expect(canAccessPrivateDocument(ownerActor, doc)).toBe(true);
    expect(canAccessPrivateDocument(otherActor, doc)).toBe(false);
    expect(canAccessPrivateDocument(adminActor, doc)).toBe(false);
  });
});
