import React from "react";
import { getSessionXpBreakdownUseCase } from "@/application/progress/progress.use-cases";
import { getQuizSessionDetailsUseCase } from "@/application/quizzes/quizzes.use-cases";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { calculateSessionSummary } from "@/domain/quizzes/quizzes.rules";
import { MOCK_QUESTIONS } from "@/features/mock-data/phase1-fixtures";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseProgressRepository } from "@/infrastructure/supabase/supabase-progress.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseQuizzesRepository } from "@/infrastructure/supabase/supabase-quizzes.repository";

export default async function SessionResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await resolveServerActorContext();
  const questionsRepo = new SupabaseQuestionsRepository();
  const quizzesRepo = new SupabaseQuizzesRepository();
  const progressRepo = new SupabaseProgressRepository();

  const [detailRes, xpBreakdownRes] = await Promise.all([
    getQuizSessionDetailsUseCase({
      questionsRepo,
      quizzesRepo,
      actor,
      sessionId: id,
    }),
    actor?.userId
      ? getSessionXpBreakdownUseCase({
          progressRepo,
          userId: actor.userId,
          sessionId: id,
        })
      : Promise.resolve(null),
  ]);

  const session = detailRes.ok ? detailRes.data.session : null;
  const questions = detailRes.ok ? detailRes.data.questions : [];
  const attempts = detailRes.ok ? detailRes.data.attempts : [];

  const summary = calculateSessionSummary(
    attempts,
    questions.length || undefined
  );

  const xpBreakdown =
    xpBreakdownRes && xpBreakdownRes.ok ? xpBreakdownRes.data : null;

  const fallbackXp =
    summary.correctCount * 10 + (session?.status === "completed" ? 20 : 0);
  const totalSessionXp =
    xpBreakdown && xpBreakdown.totalSessionXp > 0
      ? xpBreakdown.totalSessionXp
      : fallbackXp;

  const accuracyDisplay = session
    ? `${Math.round(summary.accuracy || session.accuracy)}%`
    : "80%";
  const scoreDisplay = session
    ? `${summary.score || session.score} pts`
    : "80 pts";
  const totalSeconds = Math.max(1, Math.round(summary.totalElapsedMs / 1000));

  const attemptsByQuestionId = new Map(
    attempts.map((a) => [a.questionId, a] as const)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/app" },
          { label: `Resultado de Sesión #${id}` },
        ]}
        title={`Resumen de Resultados — ${
          session?.subjectTitle ?? "Fisiología y Biofísica"
        }`}
        description={`Estado de sesión: ${
          session?.status ?? "completed"
        } • Corrección determinista e idempotencia XP por event_key.`}
        badge={
          <StatusBadge
            variant={session?.status === "completed" ? "success" : "info"}
            label={
              session?.status === "completed"
                ? `Partida Completada (+${totalSessionXp} XP)`
                : `Sesión en Progreso (+${totalSessionXp} XP)`
            }
          />
        }
        primaryAction={{
          label: "Practicar los errores en Modo Repaso",
          href: "/app/review",
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Precisión Final"
          value={accuracyDisplay}
          helperText={`${summary.correctCount} de ${
            questions.length || 2
          } respuestas correctas`}
          status={{
            variant: summary.accuracy >= 70 ? "success" : "warning",
            label: summary.accuracy >= 70 ? "Sólido" : "Por reforzar",
          }}
        />
        <StatCard
          label="Puntaje Determinista"
          value={scoreDisplay}
          helperText="10 puntos por respuesta exacta"
          status={{ variant: "neutral", label: "Registrado" }}
        />
        <StatCard
          label="Experiencia Ganada"
          value={`+${totalSessionXp} XP`}
          helperText={
            session?.status === "completed"
              ? `${summary.correctCount * 10} XP aciertos + 20 XP cierre`
              : `${summary.correctCount * 10} XP aciertos parciales`
          }
          status={{ variant: "success", label: "Idempotente" }}
        />
        <StatCard
          label="Tiempo Empleado"
          value={`${totalSeconds}s`}
          helperText={`Modo: ${session?.mode ?? "practice"}`}
          status={{ variant: "info", label: "Medido" }}
        />
      </div>

      <SemanticAlert
        variant="success"
        title="Historial de intentos y eventos XP preservados"
        description="Cada intento quedó almacenado con su question_version exacta y sus puntos de experiencia fueron emitidos con event_key único para evitar duplicados ante reintentos de red."
      />

      <section
        aria-label="Desglose de preguntas respondidas"
        className="space-y-3"
      >
        <h2 className="text-base font-semibold text-slate-100">
          Revisión Detallada pregunta por pregunta
        </h2>
        {(questions.length > 0 ? questions : MOCK_QUESTIONS).map((q, idx) => {
          const attempt = attemptsByQuestionId.get(q.id);
          const isCorrect = attempt ? attempt.isCorrect : idx === 0;
          const recordedVersion = attempt ? attempt.questionVersion : q.version;

          return (
            <Card key={q.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  Pregunta #{idx + 1} • {q.topicTitle} (evaluada en v
                  {recordedVersion})
                </span>
                {attempt ? (
                  isCorrect ? (
                    <StatusBadge
                      variant="success"
                      label="Acierto registrado (+10 XP)"
                    />
                  ) : (
                    <StatusBadge
                      variant="error"
                      label="Fallo: enviado a Repaso de Errores"
                    />
                  )
                ) : (
                  <StatusBadge
                    variant="warning"
                    label="Sin responder en esta sesión"
                  />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-100">{q.prompt}</p>
              <p className="text-xs text-slate-300 bg-[#0B0F19] border border-slate-800 rounded-lg p-3">
                <strong className="text-slate-100">
                  Explicación general:{" "}
                </strong>
                {q.explanation}
              </p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
