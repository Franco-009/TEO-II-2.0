"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import type { ContentStatus } from "@/domain/models/studyplay";
import { createSubjectAction } from "@/features/subjects/subjects.actions";

export function CreateSubjectForm() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<ContentStatus>("published");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const result = await createSubjectAction({
        title,
        description,
        status,
      });

      if (!result.ok) {
        setErrorMessage(result.error.message);
        return;
      }

      router.push(`/app/subjects/${result.data.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage && (
        <SemanticAlert
          variant="error"
          title="No se pudo crear la materia"
          description={errorMessage}
        />
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="title"
          className="block text-xs font-semibold text-slate-200"
        >
          Título de la materia
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Farmacología General y Clínica"
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="description"
          className="block text-xs font-semibold text-slate-200"
        >
          Descripción y objetivos de estudio
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe las unidades temáticas, bibliografía o parciales que abarca..."
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="status"
            className="block text-xs font-semibold text-slate-200"
          >
            Estado del contenido
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
            className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
          >
            <option value="draft">Borrador (draft — en edición)</option>
            <option value="published">
              Publicada (published — lista para practicar)
            </option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="visibility"
            className="block text-xs font-semibold text-slate-200"
          >
            Ámbito de visibilidad
          </label>
          <input
            id="visibility"
            type="text"
            disabled
            value="Privada (solo propietario)"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-400"
          />
        </div>
      </div>

      <SemanticAlert
        variant="info"
        title="Privacidad garantizada por diseño"
        description="Tus materias privadas solo son visibles para tu usuario mediante Row Level Security (RLS). La publicación en el catálogo público está reservada a administradores."
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button href="/app/subjects" variant="ghost">
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Guardando materia..." : "Guardar materia"}
        </Button>
      </div>
    </form>
  );
}
