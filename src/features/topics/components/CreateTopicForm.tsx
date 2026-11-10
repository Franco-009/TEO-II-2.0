"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import type { TopicTreeItem } from "@/domain/topics/topics.types";
import { createTopicAction } from "@/features/topics/topics.actions";

export interface CreateTopicFormProps {
  subjectId: string;
  existingTopics: TopicTreeItem[];
}

export function CreateTopicForm({
  subjectId,
  existingTopics,
}: CreateTopicFormProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [parentTopicId, setParentTopicId] = React.useState<string>("");
  const [sortOrder, setSortOrder] = React.useState<number>(
    existingTopics.length + 1
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const result = await createTopicAction({
        subjectId,
        parentTopicId: parentTopicId ? parentTopicId : null,
        title,
        description,
        sortOrder: Number(sortOrder),
      });

      if (!result.ok) {
        setErrorMessage(result.error.message);
        return;
      }

      setTitle("");
      setDescription("");
      setSortOrder((prev) => prev + 1);
      setSuccessMessage(
        `Tema "${result.data.title}" agregado correctamente en orden #${result.data.sortOrder}.`
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card elevated className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100">
          Agregar Tema o Subtema Jerárquico
        </h3>
        <span className="text-[11px] text-slate-400">
          Soporta jerarquía sin ciclos y sort_order manual
        </span>
      </div>

      {errorMessage && (
        <SemanticAlert
          variant="error"
          title="Error al crear tema"
          description={errorMessage}
        />
      )}

      {successMessage && (
        <SemanticAlert
          variant="success"
          title="Tema creado"
          description={successMessage}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2 space-y-1">
            <label
              htmlFor="topic-title"
              className="block text-xs font-semibold text-slate-200"
            >
              Título del tema
            </label>
            <input
              id="topic-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. 3. Regulación del Equilibrio Ácido-Base"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="topic-sort-order"
              className="block text-xs font-semibold text-slate-200"
            >
              Orden (sort_order)
            </label>
            <input
              id="topic-sort-order"
              type="number"
              min={0}
              required
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="topic-parent"
              className="block text-xs font-semibold text-slate-200"
            >
              Tema padre opcional (parent_topic_id)
            </label>
            <select
              id="topic-parent"
              value={parentTopicId}
              onChange={(e) => setParentTopicId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100"
            >
              <option value="">Ninguno (Tema raíz principal)</option>
              {existingTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {"— ".repeat(t.depth)}
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="topic-desc"
              className="block text-xs font-semibold text-slate-200"
            >
              Descripción breve
            </label>
            <input
              id="topic-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conceptos clave incluidos en este tema..."
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {submitting ? "Agregando..." : "Agregar tema a la materia"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
