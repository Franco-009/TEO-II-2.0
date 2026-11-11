import React from "react";
import Link from "next/link";
import { getUserProgressUseCase } from "@/application/progress/progress.use-cases";
import { getMistakeQuestionsUseCase } from "@/application/quizzes/quizzes.use-cases";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseProgressRepository } from "@/infrastructure/supabase/supabase-progress.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseQuizzesRepository } from "@/infrastructure/supabase/supabase-quizzes.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function DashboardPage() {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();
  const quizzesRepo = new SupabaseQuizzesRepository();
  const progressRepo = new SupabaseProgressRepository();

  const [progressRes, mistakesRes] = await Promise.all([
    getUserProgressUseCase({
      subjectsRepo,
      topicsRepo,
      questionsRepo,
      quizzesRepo,
      progressRepo,
      actor,
    }),
    getMistakeQuestionsUseCase({
      subjectsRepo,
      questionsRepo,
      quizzesRepo,
      actor,
    }),
  ]);

  const progress = progressRes.ok ? progressRes.data : null;
  const mistakesCount = mistakesRes.ok ? mistakesRes.data.length : 0;

  const level = progress?.levelProgress.level ?? 1;
  const totalXp = progress?.levelProgress.totalXp ?? MOCK_USER_PROFILE.totalXp;
  const dailyAnswered =
    progress?.dailyAnsweredQuestions ?? MOCK_USER_PROFILE.dailyAnsweredQuestions;
  const dailyGoal = progress?.dailyGoalQuestions ?? 10;
  const dailyPercent = progress?.dailyGoalPercent ?? 60;
  const dailyReached = progress?.dailyGoalReached ?? false;

  const streakDays = progress?.streak.streakDays ?? MOCK_USER_PROFILE.streakDays;
  const minutesToday =
    progress?.minutesStudiedToday ?? MOCK_USER_PROFILE.minutesStudiedToday;

  const lastXpEvent = progress?.recentXpEvents[0] ?? null;
  const weakTopics = progress?.weakTopics ?? [];
  const subjectsStats = progress?.subjectsStats ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${MOCK_USER_PROFILE.displayName}`}
        description="Continúa practicando tus materias, cumple tu objetivo diario y refuerza los temas con menor precisión."
        primaryAction={{
          label: "Continuar practicando (Quiz rápido)",
          href: "/app/quizzes/new",
        }}
        badge={
          <StatusBadge
            variant="neutral"
            label={`Nivel ${level} • ${totalXp} XP`}
          />
        }
      />

      <section
        aria-label="Métricas de hoy"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Objetivo Diario"
          value={`${dailyAnswered} / ${dailyGoal}`}
          helperText={`Preguntas respondidas hoy (${dailyPercent}%)`}
          status={{
            variant: dailyReached ? "success" : "info",
            label: dailyReached ? "Cumplido (+30 XP)" : "En progreso",
          }}
        />
        <StatCard
          label="Racha Activa"
          value={`${streakDays} ${streakDays === 1 ? "día" : "días"}`}
          helperText={`${minutesToday} min estudiados hoy`}
          status={{
            variant: streakDays > 0 ? "success" : "neutral",
            label: streakDays > 0 ? "Activa" : "Inicia hoy",
          }}
        />
        <StatCard
          label="Experiencia (XP)"
          value={`${totalXp} XP`}
          helperText={
            lastXpEvent
              ? `+${lastXpEvent.points} XP (${lastXpEvent.eventType})`
              : "Puntos idempotentes por event_key"
          }
          status={{ variant: "neutral", label: "Idempotente" }}
        />
        <StatCard
          label="Errores por Repasar"
          value={`${mistakesCount} ${
            mistakesCount === 1 ? "pregunta" : "preguntas"
          }`}
          helperText="Listas en modo repaso de errores"
          status={{
            variant: mistakesCount > 0 ? "warning" : "success",
            label: mistakesCount > 0 ? "Por reforzar" : "Al día",
          }}
        />
      </section>

      <ViewStateSimulator
        title="tu actividad en el Dashboard"
        emptyTitle="Todavía no has creado materias ni respondido cuestionarios"
        emptyDescription="Comienza creando tu primera materia privada o explora el catálogo público compartido."
        emptyActionLabel="Crear mi primera materia"
        emptyActionHref="/app/subjects/new"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">
                Materias Recientes y Progreso
              </h2>
              <Link
                href="/app/subjects"
                className="text-xs font-medium text-blue-400 hover:underline"
              >
                Ver todas mis materias
              </Link>
            </div>

            <div className="space-y-3">
              {subjectsStats.map((subject) => (
                <Card
                  key={subject.subjectId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/subjects/${subject.subjectId}`}
                        className="text-base font-semibold text-slate-50 hover:text-blue-400 transition-colors"
                      >
                        {subject.subjectTitle}
                      </Link>
                      {subject.status === "published" ? (
                        <StatusBadge
                          variant="success"
                          label="Activa (published)"
                        />
                      ) : (
                        <StatusBadge
                          variant="warning"
                          label="Borrador (draft)"
                        />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 pt-1">
                      {subject.topicsCount} temas ({subject.masteredTopicsCount}{" "}
                      dominados) • {subject.questionsCount} preguntas •{" "}
                      {subject.documentsCount} PDFs • Precisión:{" "}
                      {subject.accuracy}% ({subject.attemptsCount} intentos)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      href={`/app/subjects/${subject.subjectId}`}
                      variant="secondary"
                      size="sm"
                    >
                      Abrir materia
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">
                Temas por Reforzar
              </h2>
              <Link
                href="/app/progress"
                className="text-xs font-medium text-blue-400 hover:underline"
              >
                Ver estadísticas
              </Link>
            </div>
            <Card elevated className="p-4 space-y-4">
              {weakTopics.length > 0 ? (
                weakTopics.map((topic) => (
                  <div
                    key={topic.topicId}
                    className="border-b border-slate-800 pb-3 last:border-none last:pb-0 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/app/topics/${topic.topicId}`}
                        className="text-sm font-semibold text-slate-100 hover:text-blue-400"
                      >
                        {topic.topicTitle}
                      </Link>
                      <StatusBadge
                        variant="error"
                        label={`${topic.accuracy}% precisión`}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      {topic.attemptsCount} intentos registrados • Requiere
                      repaso
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">
                  No tienes temas con baja precisión actualmente. Continúa
                  practicando para alcanzar la muestra mínima de 5 intentos por
                  tema.
                </p>
              )}

              <Button
                href="/app/review"
                variant="secondary"
                size="sm"
                className="w-full"
              >
                Practicar Modo Repaso de Errores
              </Button>
            </Card>
          </div>
        </div>
      </ViewStateSimulator>
    </div>
  );
}
