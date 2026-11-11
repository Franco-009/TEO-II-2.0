import React from "react";
import { getMistakeQuestionsUseCase } from "@/application/quizzes/quizzes.use-cases";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { StartMistakesQuizButton } from "@/features/quizzes/components/StartMistakesQuizButton";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseQuizzesRepository } from "@/infrastructure/supabase/supabase-quizzes.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";

export default async function ReviewMistakesPage() {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();
  const quizzesRepo = new SupabaseQuizzesRepository();

  const mistakesRes = await getMistakeQuestionsUseCase({
    subjectsRepo,
    questionsRepo,
    quizzesRepo,
    actor,
  });

  const mistakes = mistakesRes.ok ? mistakesRes.data : [];
  const defaultSubjectId =
    mistakes[0]?.question.subjectId ?? "subj-anatomia";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modo Repaso de Errores"
        description="Practica focalizadamente las preguntas publicadas en las que registraste fallos previos sin borrar tu historial de intentos."
        badge={
          <StatusBadge
            variant={mistakes.length > 0 ? "warning" : "success"}
            label={`${mistakes.length} preguntas por reforzar`}
          />
        }
        primaryAction={{
          label: "Configurar sesión de errores",
          href: `/app/quizzes/new?subject=${defaultSubjectId}&mode=mistakes`,
        }}
      />

      {mistakes.length > 0 && (
        <Card elevated className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            Tienes <strong>{mistakes.length}</strong> pregunta(s) con errores
            pendientes en{" "}
            <strong>
              {mistakes[0]?.question.subjectTitle ?? "Fisiología y Biofísica"}
            </strong>
            .
          </div>
          <StartMistakesQuizButton
            subjectId={defaultSubjectId}
            label="Lanzar partida rápida de errores"
          />
        </Card>
      )}

      <ViewStateSimulator
        title="tu cola de repaso de errores"
        emptyTitle="¡Excelente! No tienes errores pendientes de repaso"
        emptyDescription="Has respondido correctamente todas las preguntas de refuerzo recientes."
        emptyActionLabel="Practicar un nuevo cuestionario"
        emptyActionHref="/app/quizzes/new"
      >
        <div className="space-y-4">
          {mistakes.map((item) => {
            const q = item.question;
            return (
              <Card key={q.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      variant="error"
                      label={`Fallada (${item.failedAttemptsCount} intento${
                        item.failedAttemptsCount === 1 ? "" : "s"
                      } fallido${item.failedAttemptsCount === 1 ? "" : "s"})`}
                    />
                    <StatusBadge
                      variant="info"
                      label={`Tipo: ${q.type} • v${q.version}`}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {q.subjectTitle} • {q.topicTitle}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-slate-50">
                  {q.prompt}
                </h2>

                <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3 text-xs text-slate-300">
                  <strong className="text-slate-100">
                    Clave de corrección:{" "}
                  </strong>
                  {q.explanation}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    href={`/app/quizzes/new?subject=${
                      q.subjectId ?? "subj-anatomia"
                    }&topic=${q.topicId}&mode=mistakes`}
                    variant="secondary"
                    size="sm"
                  >
                    Practicar errores de este tema
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </ViewStateSimulator>
    </div>
  );
}
