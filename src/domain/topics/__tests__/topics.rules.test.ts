import { describe, expect, it } from "vitest";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";
import {
  buildOrderedTopicTree,
  validateCreateTopic,
  validateUpdateTopic,
  wouldCreateTopicCycle,
} from "../topics.rules";
import type { TopicEntity } from "../topics.types";

const subjectA: SubjectEntity = {
  id: "subj-a",
  ownerId: "user-a",
  title: "Algoritmos",
  description: "",
  visibility: "private",
  status: "published",
  publishedAt: null,
  createdAt: "",
  updatedAt: "",
};

const existingTopics: TopicEntity[] = [
  {
    id: "top-1",
    subjectId: "subj-a",
    parentTopicId: null,
    title: "2. Grafos",
    description: "",
    sortOrder: 2,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "top-2",
    subjectId: "subj-a",
    parentTopicId: null,
    title: "1. Árboles",
    description: "",
    sortOrder: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "top-3",
    subjectId: "subj-a",
    parentTopicId: "top-2",
    title: "1.1 Árboles AVL",
    description: "",
    sortOrder: 1,
    createdAt: "",
    updatedAt: "",
  },
];

describe("Reglas puras de Temas, Jerarquía sin Ciclos y sort_order (Fase 3)", () => {
  it("ordena correctamente los temas por sort_order y anida subtemas con su depth correspondiente", () => {
    const tree = buildOrderedTopicTree(existingTopics);

    expect(tree.map((t) => ({ id: t.id, depth: t.depth }))).toEqual([
      { id: "top-2", depth: 0 },
      { id: "top-3", depth: 1 },
      { id: "top-1", depth: 0 },
    ]);
    expect(tree[1].parentTitle).toBe("1. Árboles");
  });

  it("rechaza crear un subtema cuyo parentTopicId pertenezca a otra materia o no exista", () => {
    const res = validateCreateTopic(
      { userId: "user-a", role: "user" },
      subjectA,
      existingTopics,
      {
        subjectId: "subj-a",
        parentTopicId: "top-de-otra-materia",
        title: "Subtema inválido",
      }
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_PARENT_TOPIC");
    }
  });

  it("detecta y bloquea ciclos directos (A -> A) e indirectos (Padre -> Hijo -> Padre)", () => {
    expect(wouldCreateTopicCycle(existingTopics, "top-2", "top-2")).toBe(true);
    expect(wouldCreateTopicCycle(existingTopics, "top-2", "top-3")).toBe(true);
    expect(wouldCreateTopicCycle(existingTopics, "top-1", "top-2")).toBe(false);

    const cycleUpdate = validateUpdateTopic(
      { userId: "user-a", role: "user" },
      subjectA,
      existingTopics,
      existingTopics[1], // top-2 (padre de top-3)
      { parentTopicId: "top-3" }
    );

    expect(cycleUpdate.ok).toBe(false);
    if (!cycleUpdate.ok) {
      expect(cycleUpdate.error.code).toBe("TOPIC_CYCLE_DETECTED");
    }
  });
});
