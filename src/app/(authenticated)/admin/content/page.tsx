import React from "react";
import { getAdminDashboardSummaryUseCase } from "@/application/admin/admin.use-cases";
import { AdminSubnav } from "@/components/layout/AdminSubnav";
import { PageHeader } from "@/components/ui/PageHeader";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { AdminModerationQueueClient } from "@/features/admin/components/AdminModerationQueueClient";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseAdminRepository } from "@/infrastructure/supabase/supabase-admin.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function AdminContentQueuePage() {
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
          breadcrumbs={[
            { label: "Administración", href: "/admin" },
            { label: "Moderación y Publicación" },
          ]}
          title="Cola de Revisión y Publicación del Catálogo Público"
          description="Acceso restringido a administradores verificados en el servidor."
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

  const { draftCount, moderationQueue, recentAuditLogs } = summaryRes.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Administración", href: "/admin" },
          { label: "Moderación y Publicación" },
        ]}
        title="Cola de Revisión y Publicación del Catálogo Público"
        description="Transiciona materias del catálogo público entre los estados draft, published y archived exigiendo al menos 1 tema y 1 pregunta publicada verificada."
        badge={
          <StatusBadge
            variant={draftCount > 0 ? "warning" : "success"}
            label={`${draftCount} pendiente(s) en draft`}
          />
        }
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
        <AdminModerationQueueClient
          initialQueue={moderationQueue}
          initialAuditLogs={recentAuditLogs}
        />
      </ViewStateSimulator>
    </div>
  );
}
