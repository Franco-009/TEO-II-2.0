import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminSubnav } from "@/components/layout/AdminSubnav";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { MOCK_ADMIN_QUEUE } from "@/features/mock-data/phase1-fixtures";

export default function AdminContentQueuePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Administración", href: "/admin" },
          { label: "Moderación y Publicación" },
        ]}
        title="Cola de Revisión y Publicación del Catálogo Público"
        description="Transiciona materias y bancos de preguntas entre los estados draft, published y archived."
        badge={<StatusBadge variant="warning" label="1 pendiente en draft" />}
        primaryAction={{
          label: "Ver catálogo público en vivo",
          href: "/library",
        }}
      />

      <AdminSubnav />

      <ViewStateSimulator
        title="la cola de moderación administrativa"
        emptyTitle="No hay elementos pendientes de moderación"
        emptyDescription="Todos los recursos del catálogo público han sido revisados."
        emptyActionLabel="Volver al resumen de administración"
        emptyActionHref="/admin"
      >
        <div className="space-y-4">
          {MOCK_ADMIN_QUEUE.map((item) => (
            <Card key={item.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {item.itemType}
                  </span>
                  {item.status === "published" && (
                    <StatusBadge variant="success" label="Publicado (published)" />
                  )}
                  {item.status === "draft" && (
                    <StatusBadge variant="warning" label="En borrador (draft)" />
                  )}
                  {item.status === "archived" && (
                    <StatusBadge variant="info" label="Archivado (archived)" />
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  Actualizado: {item.submittedAt}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-50">{item.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Autor: {item.author} • {item.questionsCount} preguntas verificadas
                </p>
              </div>

              <p className="text-xs text-slate-300 bg-[#0B0F19] border border-slate-800 rounded-lg p-3">
                {item.validationNotes}
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {item.status === "draft" && (
                  <Button variant="primary" size="sm">
                    Aprobar y Publicar en Catálogo
                  </Button>
                )}
                {item.status === "published" && (
                  <Button variant="secondary" size="sm">
                    Archivar recurso (conservar historial)
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ViewStateSimulator>
    </div>
  );
}
