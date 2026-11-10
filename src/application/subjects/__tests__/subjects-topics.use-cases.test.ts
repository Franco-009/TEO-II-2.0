import { describe, expect, it } from "vitest";
import {
  createSubjectUseCase,
  getSubjectByIdUseCase,
  listMySubjectsUseCase,
  listPublicCatalogUseCase,
  updateSubjectUseCase,
} from "@/application/subjects/subjects.use-cases";
import {
  createTopicUseCase,
  listSubjectTopicsTreeUseCase,
} from "@/application/topics/topics.use-cases";
import { InMemoryStudyCatalogStore } from "@/infrastructure/supabase/in-memory-catalog.store";

describe("Casos de Uso Integrados de Materias, Temas y Aislamiento RLS (Fase 3)", () => {
  it("Caso Imprescindible #3 y #4: dos usuarios crean materias con el mismo título sin cruzar datos y Usuario B no puede editar ni ver lo de Usuario A", async () => {
    const store = new InMemoryStudyCatalogStore(false);
    const userA = { userId: "user-a-uuid", role: "user" as const };
    const userB = { userId: "user-b-uuid", role: "user" as const };

    const subjA = await createSubjectUseCase(store, userA, {
      title: "Anatomía Humana",
      description: "Apuntes privados de A",
      status: "published",
    });

    const subjB = await createSubjectUseCase(store, userB, {
      title: "Anatomía Humana",
      description: "Apuntes privados de B",
      status: "published",
    });

    expect(subjA.ok && subjB.ok).toBe(true);
    if (!subjA.ok || !subjB.ok) return;

    // Ambos tienen el mismo título pero distinto ID y propietario
    expect(subjA.data.id).not.toBe(subjB.data.id);

    const listA = await listMySubjectsUseCase(store, userA);
    const listB = await listMySubjectsUseCase(store, userB);

    expect(listA.ok && listB.ok).toBe(true);
    if (!listA.ok || !listB.ok) return;

    expect(listA.data).toHaveLength(1);
    expect(listA.data[0].description).toBe("Apuntes privados de A");

    expect(listB.data).toHaveLength(1);
    expect(listB.data[0].description).toBe("Apuntes privados de B");

    // Usuario B intenta leer o editar la materia privada de Usuario A -> Denegado
    const readCross = await getSubjectByIdUseCase(store, userB, subjA.data.id);
    expect(readCross.ok).toBe(false);
    if (!readCross.ok) {
      expect(readCross.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    const editCross = await updateSubjectUseCase(store, userB, subjA.data.id, {
      title: "Hackeada por B",
    });
    expect(editCross.ok).toBe(false);
    if (!editCross.ok) {
      expect(editCross.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    // Usuario B intenta insertar un tema en la materia de Usuario A -> Denegado
    const topicCross = await createTopicUseCase(store, store, userB, {
      subjectId: subjA.data.id,
      title: "Tema intruso",
    });
    expect(topicCross.ok).toBe(false);
    if (!topicCross.ok) {
      expect(topicCross.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    // Usuario A sí puede crear tema raíz y subtema en su propia materia
    const rootTopic = await createTopicUseCase(store, store, userA, {
      subjectId: subjA.data.id,
      title: "1. Osteología",
      sortOrder: 1,
    });
    expect(rootTopic.ok).toBe(true);
    if (!rootTopic.ok) return;

    const subTopic = await createTopicUseCase(store, store, userA, {
      subjectId: subjA.data.id,
      parentTopicId: rootTopic.data.id,
      title: "1.1 Cráneo",
      sortOrder: 2,
    });
    expect(subTopic.ok).toBe(true);

    const treeA = await listSubjectTopicsTreeUseCase(
      store,
      store,
      userA,
      subjA.data.id
    );
    expect(treeA.ok).toBe(true);
    if (treeA.ok) {
      expect(treeA.data).toHaveLength(2);
      expect(treeA.data[1].depth).toBe(1);
      expect(treeA.data[1].parentTitle).toBe("1. Osteología");
    }
  });

  it("Caso Imprescindible #5: materia pública en draft o archived no aparece en el catálogo público hasta que admin la publica", async () => {
    const store = new InMemoryStudyCatalogStore(false);
    const admin = { userId: "admin-uuid", role: "admin" as const };

    const draftPub = await createSubjectUseCase(store, admin, {
      title: "Física Cuántica",
      visibility: "public",
      status: "draft",
    });
    expect(draftPub.ok).toBe(true);
    if (!draftPub.ok) return;

    // En estado draft no aparece en el catálogo público
    const catalog1 = await listPublicCatalogUseCase(store);
    expect(catalog1.ok && catalog1.data).toEqual([]);

    // Admin la publica -> ahora sí aparece
    await updateSubjectUseCase(store, admin, draftPub.data.id, {
      status: "published",
    });
    const catalog2 = await listPublicCatalogUseCase(store);
    expect(catalog2.ok && catalog2.data.map((s) => s.title)).toEqual([
      "Física Cuántica",
    ]);

    // Admin la archiva -> deja de aparecer en el catálogo público nuevo
    await updateSubjectUseCase(store, admin, draftPub.data.id, {
      status: "archived",
    });
    const catalog3 = await listPublicCatalogUseCase(store);
    expect(catalog3.ok && catalog3.data).toEqual([]);
  });
});
