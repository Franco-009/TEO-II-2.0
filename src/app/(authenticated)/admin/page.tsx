import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminSubnav } from "@/components/layout/AdminSubnav";
import { StatCard } from "@/components/ui/StatCard";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de Administración"
        description="Supervisión del catálogo público compartido y publicación de materias verificadas."
        badge={<StatusBadge variant="neutral" label="Rol requerido: admin" />}
        primaryAction={{
          label: "Revisar cola de publicación",
          href: "/admin/content",
        }}
      />

      <AdminSubnav />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Catálogo Público"
          value="2 materias"
          helperText="114 preguntas activas (published)"
          status={{ variant: "success", label: "Visible" }}
        />
        <StatCard
          label="Pendientes de Revisión"
          value="1 materia"
          helperText="Estado draft en espera de aprobación"
          status={{ variant: "warning", label: "Por revisar" }}
        />
        <StatCard
          label="Contenido Archivado"
          value="1 materia"
          helperText="Oculta en búsquedas, preserva intentos"
          status={{ variant: "info", label: "Histórico" }}
        />
      </div>

      <SemanticAlert
        variant="info"
        title="Límite estricto de privacidad para Administradores"
        description="De acuerdo con la Matriz RLS (docs/05-SEGURIDAD-RLS.md), el rol admin gestiona y publica el catálogo público compartido, pero NO tiene acceso rutinario a los documentos PDF privados ni a los intentos personales de otros usuarios."
      />
    </div>
  );
}
