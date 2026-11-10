import { describe, expect, it } from "vitest";
import {
  canReadSubject,
  filterPublicCatalogSubjects,
  validateCreateSubject,
  validateUpdateSubject,
} from "../subjects.rules";
import type { SubjectEntity } from "../subjects.types";

const baseSubject: SubjectEntity = {
  id: "subj-a1",
  ownerId: "user-a",
  title: "Fisiología",
  description: "Materia privada de Usuario A",
  visibility: "private",
  status: "published",
  publishedAt: "2026-11-10T12:00:00Z",
  createdAt: "2026-11-10T10:00:00Z",
  updatedAt: "2026-11-10T12:00:00Z",
};

describe("Reglas puras de Materias y Catálogo Público (Fase 3)", () => {
  it("impide que un usuario estándar (role = user) cree o pase una materia a visibility = public (ADR-0001)", () => {
    const createAttempt = validateCreateSubject(
      { userId: "user-a", role: "user" },
      {
        title: "Materia Pública No Autorizada",
        visibility: "public",
        status: "published",
      }
    );

    expect(createAttempt.ok).toBe(false);
    if (!createAttempt.ok) {
      expect(createAttempt.error.code).toBe("FORBIDDEN_PUBLIC_CATALOG");
    }

    const updateAttempt = validateUpdateSubject(
      { userId: "user-a", role: "user" },
      baseSubject,
      { visibility: "public" }
    );

    expect(updateAttempt.ok).toBe(false);
    if (!updateAttempt.ok) {
      expect(updateAttempt.error.code).toBe("FORBIDDEN_PUBLIC_CATALOG");
    }
  });

  it("permite a un administrador (role = admin) crear y publicar materias en el catálogo público", () => {
    const adminCreate = validateCreateSubject(
      { userId: "admin-1", role: "admin" },
      {
        title: "Bioestadística Oficial",
        visibility: "public",
        status: "published",
      }
    );

    expect(adminCreate.ok).toBe(true);
    if (adminCreate.ok) {
      expect(adminCreate.data.visibility).toBe("public");
      expect(adminCreate.data.publishedAt).not.toBeNull();
    }
  });

  it("Caso Imprescindible #4: propietario edita su materia; otro usuario recibe FORBIDDEN_NOT_OWNER", () => {
    const ownerEdit = validateUpdateSubject(
      { userId: "user-a", role: "user" },
      baseSubject,
      { title: "Fisiología II" }
    );
    expect(ownerEdit.ok).toBe(true);

    const intruderEdit = validateUpdateSubject(
      { userId: "user-b", role: "user" },
      baseSubject,
      { title: "Intento de Usuario B" }
    );
    expect(intruderEdit.ok).toBe(false);
    if (!intruderEdit.ok) {
      expect(intruderEdit.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }
  });

  it("Caso Imprescindible #5: materia pública en draft o archived NO aparece en el catálogo público", () => {
    const items: SubjectEntity[] = [
      { ...baseSubject, id: "s1", visibility: "private", status: "published" },
      { ...baseSubject, id: "s2", visibility: "public", status: "draft" },
      { ...baseSubject, id: "s3", visibility: "public", status: "archived" },
      { ...baseSubject, id: "s4", visibility: "public", status: "published" },
    ];

    const publicCatalog = filterPublicCatalogSubjects(items);
    expect(publicCatalog.map((s) => s.id)).toEqual(["s4"]);

    // Visitante no autenticado no puede leer materia pública en draft ni archived
    expect(canReadSubject(null, items[1])).toBe(false);
    expect(canReadSubject(null, items[2])).toBe(false);
    expect(canReadSubject(null, items[3])).toBe(true);
  });
});
