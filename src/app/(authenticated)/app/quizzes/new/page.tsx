import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MOCK_PRIVATE_SUBJECTS } from "@/features/mock-data/phase1-fixtures";

export default function NewQuizPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Configurar Cuestionario de Práctica"
        description="Elige la materia, el modo de juego y la cantidad de preguntas para iniciar una sesión autocorregible."
        badge={<StatusBadge variant="info" label="Corrección 100% Determinista" />}
      />

      <Card elevated className="p-6 space-y-5">
        <form action="/app/quizzes/session-demo" className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="subjectId" className="block text-xs font-semibold text-slate-200">
              Materia (solo estado published)
            </label>
            <select
              id="subjectId"
              name="subjectId"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            >
              {MOCK_PRIVATE_SUBJECTS.filter((s) => s.status === "published").map(
                (s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.questionsCount} preguntas)
                  </option>
                )
              )}
            </select>
          </div>

          <fieldset className="space-y-2.5">
            <legend className="text-xs font-semibold text-slate-200">
              Modo de Cuestionario (mode)
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 rounded-lg border border-blue-500/50 bg-blue-950/30 p-3 cursor-pointer">
                <span className="text-xs font-bold text-blue-300">
                  Práctica (practice)
                </span>
                <span className="text-[11px] text-slate-300">
                  Devolución inmediata opción por opción tras cada respuesta.
                </span>
              </label>

              <label className="flex flex-col gap-1 rounded-lg border border-slate-700 bg-[#0B0F19] p-3 cursor-pointer">
                <span className="text-xs font-bold text-slate-100">
                  Desafío (challenge)
                </span>
                <span className="text-[11px] text-slate-400">
                  Tiempo medido y puntaje global al cerrar la sesión (+XP extra).
                </span>
              </label>

              <label className="flex flex-col gap-1 rounded-lg border border-slate-700 bg-[#0B0F19] p-3 cursor-pointer">
                <span className="text-xs font-bold text-amber-300">
                  Errores (mistakes)
                </span>
                <span className="text-[11px] text-slate-400">
                  Filtra exclusivamente preguntas falladas en intentos previos.
                </span>
              </label>
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="questionCount" className="block text-xs font-semibold text-slate-200">
              Cantidad de preguntas
            </label>
            <select
              id="questionCount"
              name="questionCount"
              defaultValue="10"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            >
              <option value="5">5 preguntas (Repaso rápido)</option>
              <option value="10">10 preguntas (Sesión estándar)</option>
              <option value="20">20 preguntas (Simulacro completo)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button href="/app" variant="ghost">
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Comenzar partida ahora
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
