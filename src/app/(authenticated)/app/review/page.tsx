import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { MOCK_QUESTIONS } from "@/features/mock-data/phase1-fixtures";

export default function ReviewMistakesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Modo Repaso de Errores"
        description="Practica focalizadamente las preguntas en las que tuviste fallos recientes hasta dominar su explicación."
        badge={<StatusBadge variant="warning" label="3 preguntas por reforzar" />}
        primaryAction={{
          label: "Iniciar sesión de repaso de errores",
          href: "/app/quizzes/session-mistakes",
        }}
      />

      <ViewStateSimulator
        title="tu cola de repaso de errores"
        emptyTitle="¡Excelente! No tienes errores pendientes de repaso"
        emptyDescription="Has respondido correctamente todas las preguntas de refuerzo recientes."
        emptyActionLabel="Practicar un nuevo cuestionario"
        emptyActionHref="/app/quizzes/new"
      >
        <div className="space-y-4">
          {MOCK_QUESTIONS.map((q) => (
            <Card key={q.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge variant="error" label="Fallada en intento previo" />
                <span className="text-xs text-slate-400">
                  {q.subjectTitle} • {q.topicTitle}
                </span>
              </div>

              <h2 className="text-base font-semibold text-slate-50">{q.prompt}</h2>

              <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3 text-xs text-slate-300">
                <strong className="text-slate-100">Clave de corrección: </strong>
                {q.explanation}
              </div>

              <div className="flex justify-end">
                <Button
                  href={`/app/quizzes/${q.id}`}
                  variant="secondary"
                  size="sm"
                >
                  Volver a intentar esta pregunta
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ViewStateSimulator>
    </div>
  );
}
