import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import {
  MOCK_PRIVATE_SUBJECTS,
  MOCK_TOPICS,
  MOCK_USER_PROFILE,
} from "@/features/mock-data/phase1-fixtures";

export default function DashboardPage() {
  const weakTopics = MOCK_TOPICS.filter((t) => t.accuracy < 75);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${MOCK_USER_PROFILE.displayName}`}
        description="Continúa practicando tus materias, cumple tu objetivo diario y refuerza los temas con menor precisión."
        primaryAction={{
          label: "Continuar practicando (Quiz rápido)",
          href: "/app/quizzes/session-demo",
        }}
        badge={<StatusBadge variant="neutral" label="Nivel 6 • 1.420 XP" />}
      />

      <section aria-label="Métricas de hoy" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Objetivo Diario"
          value={`${MOCK_USER_PROFILE.dailyAnsweredQuestions} / ${MOCK_USER_PROFILE.dailyGoalQuestions}`}
          helperText="Preguntas respondidas hoy (70%)"
          status={{ variant: "info", label: "En progreso" }}
        />
        <StatCard
          label="Racha Activa"
          value={`${MOCK_USER_PROFILE.streakDays} días`}
          helperText={`${MOCK_USER_PROFILE.minutesStudiedToday} min estudiados hoy`}
          status={{ variant: "success", label: "Activa" }}
        />
        <StatCard
          label="Experiencia (XP)"
          value={`${MOCK_USER_PROFILE.totalXp} XP`}
          helperText="+30 XP en tu última sesión"
          status={{ variant: "neutral", label: "Idempotente" }}
        />
        <StatCard
          label="Errores por Repasar"
          value="3 preguntas"
          helperText="Listas en modo repaso de errores"
          status={{ variant: "warning", label: "Por reforzar" }}
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
                Materias Recientes y Fijadas
              </h2>
              <Link
                href="/app/subjects"
                className="text-xs font-medium text-blue-400 hover:underline"
              >
                Ver todas mis materias
              </Link>
            </div>

            <div className="space-y-3">
              {MOCK_PRIVATE_SUBJECTS.map((subject) => (
                <Card
                  key={subject.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/subjects/${subject.id}`}
                        className="text-base font-semibold text-slate-50 hover:text-blue-400 transition-colors"
                      >
                        {subject.title}
                      </Link>
                      {subject.status === "published" ? (
                        <StatusBadge variant="success" label="Activa (published)" />
                      ) : (
                        <StatusBadge variant="warning" label="Borrador (draft)" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{subject.description}</p>
                    <p className="text-xs text-slate-300 pt-1">
                      {subject.topicsCount} temas • {subject.questionsCount} preguntas •{" "}
                      {subject.documentsCount} PDFs • Precisión: {subject.masteryAccuracy}% (
                      {subject.attemptsCount} intentos)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      href={`/app/subjects/${subject.id}`}
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
            <h2 className="text-base font-semibold text-slate-100">
              Temas por Reforzar
            </h2>
            <Card elevated className="p-4 space-y-4">
              {weakTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="border-b border-slate-800 pb-3 last:border-none last:pb-0 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/app/topics/${topic.id}`}
                      className="text-sm font-semibold text-slate-100 hover:text-blue-400"
                    >
                      {topic.title}
                    </Link>
                    <StatusBadge
                      variant="error"
                      label={`${topic.accuracy}% precisión`}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {topic.attemptsCount} intentos registrados • Requiere repaso
                  </p>
                </div>
              ))}

              <Button href="/app/review" variant="secondary" size="sm" className="w-full">
                Practicar Modo Repaso de Errores
              </Button>
            </Card>
          </div>
        </div>
      </ViewStateSimulator>
    </div>
  );
}
