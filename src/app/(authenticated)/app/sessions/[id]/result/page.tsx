import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { MOCK_QUESTIONS } from "@/features/mock-data/phase1-fixtures";

export default async function SessionResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/app" },
          { label: `Resultado de Sesión #${id}` },
        ]}
        title="Resumen de Resultados de la Partida"
        description="Sesión cerrada (status = completed) • Corrección determinista registrada en historial."
        badge={<StatusBadge variant="success" label="Partida Completada (+30 XP)" />}
        primaryAction={{
          label: "Practicar los errores de esta sesión",
          href: "/app/review",
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Precisión Final"
          value="80%"
          helperText="8 de 10 respuestas correctas"
          status={{ variant: "success", label: "Excelente" }}
        />
        <StatCard
          label="XP Otorgado"
          value="+30 XP"
          helperText="Evento idempotente (event_key único)"
          status={{ variant: "neutral", label: "Acreditado" }}
        />
        <StatCard
          label="Tiempo Total"
          value="06m 14s"
          helperText="Promedio de 37s por pregunta"
          status={{ variant: "info", label: "Modo Práctica" }}
        />
      </div>

      <SemanticAlert
        variant="success"
        title="Progreso actualizado en Fisiología y Biofísica"
        description="Has superado el umbral mínimo de 5 intentos en Electrofisiología Cardíaca con 88% de precisión."
      />

      <section aria-label="Desglose de preguntas respondidas" className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">
          Revisión Detallada pregunta por pregunta
        </h2>
        {MOCK_QUESTIONS.map((q, idx) => {
          const simulatedCorrect = idx !== 2;
          return (
            <Card key={q.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  Pregunta #{idx + 1} • {q.topicTitle} (v{q.version})
                </span>
                {simulatedCorrect ? (
                  <StatusBadge variant="success" label="Acierto en primer intento" />
                ) : (
                  <StatusBadge variant="error" label="Fallo: enviado a Repaso de Errores" />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-100">{q.prompt}</p>
              <p className="text-xs text-slate-300 bg-[#0B0F19] border border-slate-800 rounded-lg p-3">
                <strong className="text-slate-100">Explicación: </strong>
                {q.explanation}
              </p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
