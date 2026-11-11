import React from "react";
import Link from "next/link";
import { getAdminDashboardSummaryUseCase } from "@/application/admin/admin.use-cases";
import { AdminSubnav } from "@/components/layout/AdminSubnav";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseAdminRepository } from "@/infrastructure/supabase/supabase-admin.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function AdminOverviewPage() {
  const actor = await resolveServerActorContext();
  const adminRepo = new SupabaseAdminRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();

  const summaryRes = await getAdminDashboardSummaryUseCase({
    adminRepo,
    topicsRepo,
    questionsRepo,
    actor,
  });

  if (!summaryRes.ok) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Panel de Administración"
          description="Acceso restringido exclusivamente al rol admin verificado en servidor."
          badge={<StatusBadge variant="error" label="Acceso Denegado" />}
        />
        <SemanticAlert
          variant="error"
          title={`Autorización rechazada (${summaryRes.error.code})`}
          description={summaryRes.error.message}
        />
      </div>
    );
  }

  const {
    publishedCount,
    draftCount,
    archivedCount,
    totalPublicQuestionsCount,
    recentAuditLogs,
  } = summaryRes.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de Administración"
        description="Supervisión del catálogo público compartido y publicación de materias verificadas."
        badge={
          <StatusBadge variant="neutral" label="Rol verificado: admin" />
        }
        primaryAction={{
          label: "Revisar cola de publicación",
          href: "/admin/content",
        }}
      />

      <AdminSubnav />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Catálogo Público"
          value={`${publishedCount} ${
            publishedCount === 1 ? "materia" : "materias"
          }`}
          helperText={`${totalPublicQuestionsCount} preguntas activas (published)`}
          status={{ variant: "success", label: "Visible en /library" }}
        />
        <StatCard
          label="Pendientes de Revisión"
          value={`${draftCount} ${draftCount === 1 ? "materia" : "materias"}`}
          helperText="Estado draft en espera de aprobación"
          status={{
            variant: draftCount > 0 ? "warning" : "success",
            label: draftCount > 0 ? "Por revisar" : "Al día",
          }}
        />
        <StatCard
          label="Contenido Archivado"
          value={`${archivedCount} ${
            archivedCount === 1 ? "materia" : "materias"
          }`}
          helperText="Oculta en búsquedas, preserva intentos"
          status={{ variant: "info", label: "Histórico" }}
        />
      </div>

      <SemanticAlert
        variant="info"
        title="Límite estricto de privacidad para Administradores"
        description="De acuerdo con la Matriz RLS (docs/05-SEGURIDAD-RLS.md), el rol admin gestiona y publica el catálogo público compartido (visibility = 'public'), pero NO tiene acceso rutinario a materias privadas, documentos PDF privados ni intentos personales de otros usuarios."
      />

      <section
        aria-label="Actividad reciente de moderación"
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            Últimos Eventos de Auditoría (`public.admin_audit_logs`)
          </h2>
          <Link
            href="/admin/content"
            className="text-xs font-medium text-blue-400 hover:underline"
          >
            Ir a cola de moderación →
          </Link>
        </div>

        <Card className="p-4 space-y-2.5">
          {recentAuditLogs.length > 0 ? (
            recentAuditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 last:border-none last:pb-0 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-100">
                    {log.targetTitle} •{" "}
                    <span className="font-mono text-blue-400">
                      {log.action}
                    </span>
                  </p>
                  <p className="text-slate-400">{log.notes}</p>
                </div>
                <StatusBadge
                  variant={
                    log.newStatus === "published"
                      ? "success"
                      : log.newStatus === "draft"
                      ? "warning"
                      : "info"
                  }
                  label={`${log.previousStatus ?? "nuevo"} → ${log.newStatus}`}
                />
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">
              No se han registrado eventos de moderación todavía.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
