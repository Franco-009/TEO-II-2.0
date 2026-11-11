import React from "react";
import Link from "next/link";
import { getUserProgressUseCase } from "@/application/progress/progress.use-cases";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { APP_CONFIG } from "@/config/env";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseProgressRepository } from "@/infrastructure/supabase/supabase-progress.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseQuizzesRepository } from "@/infrastructure/supabase/supabase-quizzes.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function ProgressPage() {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();
  const quizzesRepo = new SupabaseQuizzesRepository();
  const progressRepo = new SupabaseProgressRepository();

  const progressRes = await getUserProgressUseCase({
    subjectsRepo,
    topicsRepo,
    questionsRepo,
    quizzesRepo,
    progressRepo,
    actor,
  });

  const progress = progressRes.ok ? progressRes.data : null;
  const totalXp = progress?.levelProgress.totalXp ?? 0;
  const level = progress?.levelProgress.level ?? 1;
  const globalAccuracy = progress?.globalAccuracy ?? 0;
  const totalAttempts = progress?.totalAttemptsCount ?? 0;
  const masteredCount = progress?.masteredTopicsCount ?? 0;
  const evaluatedTopicsCount = progress?.evaluatedTopicsCount ?? 0;
  const streakDays = progress?.streak.streakDays ?? 0;
  const longestStreak = progress?.streak.longestStreakDays ?? 0;
  const topicsStats = progress?.topicsStats ?? [];
  const subjectsStats = progress?.subjectsStats ?? [];
  const recentXpEvents = progress?.recentXpEvents ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas Detalladas y Gamificación"
        description={`Se requiere un mínimo de ${APP_CONFIG.masteryMinAttempts} intentos y precisión >= 80% para clasificar un tema como Dominado (+50 XP).`}
        badge={
          <StatusBadge
            variant="neutral"
            label={`Nivel ${level} • ${totalXp} XP Totales`}
          />
        }
        primaryAction={{
          label: "Practicar temas débiles",
          href: "/app/review",
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Precisión Global"
          value={`${globalAccuracy}%`}
          helperText={`En ${totalAttempts} intentos registrados`}
          status={{
            variant: globalAccuracy >= 75 ? "success" : "warning",
            label: globalAccuracy >= 75 ? "Sólido" : "En evolución",
          }}
        />
        <StatCard
          label="Temas Dominados"
          value={`${masteredCount} / ${evaluatedTopicsCount}`}
          helperText={`Regla >= ${APP_CONFIG.masteryMinAttempts} intentos y >= 80%`}
          status={{ variant: "info", label: "Verificado" }}
        />
        <StatCard
          label="Racha Actual"
          value={`${streakDays} ${streakDays === 1 ? "día" : "días"}`}
          helperText={`Mejor racha histórica: ${longestStreak} días`}
          status={{
            variant: streakDays > 0 ? "success" : "neutral",
            label: streakDays > 0 ? "En racha" : "Sin actividad hoy",
          }}
        />
        <StatCard
          label="Eventos XP"
          value="+10 / +20 / +30 / +50"
          helperText="Idempotentes por event_key"
          status={{ variant: "neutral", label: "Auditable" }}
        />
      </div>

      <section aria-label="Rendimiento por materia y tema" className="space-y-4">
        <h2 className="text-base font-semibold text-slate-100">
          Desglose de Dominio por Tema
        </h2>

        <div className="space-y-3">
          {topicsStats.map((topic) => {
            const {
              hasMinSample,
              isMastered,
              masteryStatus,
              attemptsCount,
              accuracy,
            } = topic;

            return (
              <Card key={topic.topicId} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/app/topics/${topic.topicId}`}
                      className="text-sm font-semibold text-slate-100 hover:text-blue-400"
                    >
                      {topic.topicTitle}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {topic.subjectTitle} • {attemptsCount} intentos
                      registrados (mínimo requerido:{" "}
                      {APP_CONFIG.masteryMinAttempts})
                    </p>
                  </div>

                  {isMastered ? (
                    <StatusBadge
                      variant="success"
                      label={`Dominado (${accuracy}%)`}
                    />
                  ) : !hasMinSample ? (
                    <StatusBadge
                      variant="warning"
                      label={`Insuficientes intentos (${attemptsCount}/${APP_CONFIG.masteryMinAttempts})`}
                    />
                  ) : masteryStatus === "in_progress" ? (
                    <StatusBadge
                      variant="info"
                      label={`En progreso (${accuracy}%)`}
                    />
                  ) : (
                    <StatusBadge
                      variant="error"
                      label={`Por reforzar (${accuracy}%)`}
                    />
                  )}
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      isMastered
                        ? "bg-emerald-500"
                        : hasMinSample
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-label="Resumen por materia" className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">
          Precisión por Materia
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {subjectsStats.map((subj) => (
            <Card key={subj.subjectId} className="p-4 space-y-1.5">
              <Link
                href={`/app/subjects/${subj.subjectId}`}
                className="text-sm font-semibold text-slate-100 hover:text-blue-400"
              >
                {subj.subjectTitle}
              </Link>
              <p className="text-2xl font-bold text-blue-400">
                {subj.accuracy}%
              </p>
              <p className="text-xs text-slate-400">
                {subj.attemptsCount} intentos acumulados •{" "}
                {subj.masteredTopicsCount}/{subj.topicsCount} temas dominados
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-label="Historial auditable de eventos XP"
        className="space-y-3"
      >
        <h2 className="text-base font-semibold text-slate-100">
          Registro Auditable de Eventos XP (Idempotencia por event_key)
        </h2>
        <Card className="p-4 space-y-2">
          {recentXpEvents.length > 0 ? (
            recentXpEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 last:border-none last:pb-0 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-100">
                    +{ev.points} XP • {ev.eventType}
                  </span>
                  <p className="font-mono text-[11px] text-slate-400">
                    event_key: {ev.eventKey}
                  </p>
                </div>
                <StatusBadge variant="success" label={`+${ev.points} XP`} />
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">
              Aún no se han registrado eventos de experiencia.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
