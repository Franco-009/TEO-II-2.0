import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { APP_CONFIG } from "@/config/env";
import {
  MOCK_PRIVATE_SUBJECTS,
  MOCK_TOPICS,
  MOCK_USER_PROFILE,
} from "@/features/mock-data/phase1-fixtures";

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas Detalladas y Gamificación"
        description={`Se requiere un mínimo de ${APP_CONFIG.masteryMinAttempts} intentos y alta precisión para considerar un tema como Dominado.`}
        badge={<StatusBadge variant="neutral" label={`${MOCK_USER_PROFILE.totalXp} XP Totales`} />}
        primaryAction={{
          label: "Practicar temas débiles",
          href: "/app/review",
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Precisión Global"
          value="76%"
          helperText="En 21 intentos registrados"
          status={{ variant: "success", label: "Sólido" }}
        />
        <StatCard
          label="Temas Dominados"
          value="1 / 3"
          helperText={`Regla >= ${APP_CONFIG.masteryMinAttempts} intentos`}
          status={{ variant: "info", label: "Verificado" }}
        />
        <StatCard
          label="Racha Actual"
          value={`${MOCK_USER_PROFILE.streakDays} días`}
          helperText="Actividad diaria constante"
          status={{ variant: "success", label: "En racha" }}
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
          {MOCK_TOPICS.map((topic) => {
            const hasMinAttempts =
              topic.attemptsCount >= APP_CONFIG.masteryMinAttempts;
            const isMastered = hasMinAttempts && topic.accuracy >= 80;

            return (
              <Card key={topic.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {topic.attemptsCount} intentos registrados (mínimo requerido:{" "}
                      {APP_CONFIG.masteryMinAttempts})
                    </p>
                  </div>

                  {isMastered ? (
                    <StatusBadge
                      variant="success"
                      label={`Dominado (${topic.accuracy}%)`}
                    />
                  ) : !hasMinAttempts ? (
                    <StatusBadge
                      variant="warning"
                      label={`Insuficientes intentos (${topic.attemptsCount}/${APP_CONFIG.masteryMinAttempts})`}
                    />
                  ) : (
                    <StatusBadge
                      variant="error"
                      label={`Por reforzar (${topic.accuracy}%)`}
                    />
                  )}
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      isMastered
                        ? "bg-emerald-500"
                        : hasMinAttempts
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${topic.accuracy}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-label="Resumen por materia" className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">
          Precisión por Materia Privada
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {MOCK_PRIVATE_SUBJECTS.map((subj) => (
            <Card key={subj.id} className="p-4 space-y-1.5">
              <p className="text-sm font-semibold text-slate-100">{subj.title}</p>
              <p className="text-2xl font-bold text-blue-400">
                {subj.masteryAccuracy}%
              </p>
              <p className="text-xs text-slate-400">
                {subj.attemptsCount} intentos acumulados
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
