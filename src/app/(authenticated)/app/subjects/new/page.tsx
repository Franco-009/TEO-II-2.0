import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";

export default function NewSubjectPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: "Mis Materias", href: "/app/subjects" },
          { label: "Nueva Materia" },
        ]}
        title="Crear Materia Privada"
        description="Define el nombre, descripción y estado inicial de tu nueva materia de estudio."
      />

      <Card elevated className="p-6 space-y-5">
        <form action="/app/subjects" className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-xs font-semibold text-slate-200">
              Título de la materia
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Ej. Farmacología General y Clínica"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-xs font-semibold text-slate-200">
              Descripción y objetivos de estudio
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Describe las unidades temáticas, bibliografía o parciales que abarca..."
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="status" className="block text-xs font-semibold text-slate-200">
                Estado del contenido
              </label>
              <select
                id="status"
                name="status"
                defaultValue="published"
                className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
              >
                <option value="draft">Borrador (draft — en edición)</option>
                <option value="published">Publicada (published — lista para practicar)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="visibility" className="block text-xs font-semibold text-slate-200">
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
            <Button type="submit" variant="primary">
              Guardar materia
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
