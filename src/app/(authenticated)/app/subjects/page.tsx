import React from "react";
import Link from "next/link";
import { listMySubjectsUseCase } from "@/application/subjects/subjects.use-cases";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";

export default async function SubjectsListPage() {
  const actor = await resolveServerActorContext();
  const repo = new SupabaseSubjectsRepository();
  const subjectsRes = await listMySubjectsUseCase(repo, actor);
  const subjects = subjectsRes.ok ? subjectsRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Materias Privadas"
        description="Organiza tus asignaturas, temas jerárquicos, apuntes PDF y bancos de preguntas personales."
        primaryAction={{
          label: "Nueva materia privada",
          href: "/app/subjects/new",
        }}
        badge={<StatusBadge variant="info" label="Espacio privado (RLS)" />}
      />

      <ViewStateSimulator
        title="tus materias privadas"
        emptyTitle="Tu biblioteca privada está vacía"
        emptyDescription="Crea tu primera materia para cargar apuntes PDF, organizar temas y redactar preguntas autocorregibles."
        emptyActionLabel="Crear primera materia"
        emptyActionHref="/app/subjects/new"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map((subject) => {
            const attempts = subject.attemptsCount ?? 0;
            const accuracy = subject.masteryAccuracy ?? 0;
            const isMastered = attempts >= 5 && accuracy >= 80;

            return (
              <Card
                key={subject.id}
                className="p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {subject.status === "published" ? (
                      <StatusBadge variant="success" label="Publicada (Privada)" />
                    ) : subject.status === "draft" ? (
                      <StatusBadge
                        variant="warning"
                        label="Borrador (No entra en juego)"
                      />
                    ) : (
                      <StatusBadge variant="info" label="Archivada (Histórica)" />
                    )}
                    {isMastered ? (
                      <StatusBadge
                        variant="success"
                        label={`Dominada (${accuracy}%)`}
                      />
                    ) : (
                      <StatusBadge
                        variant="neutral"
                        label={`Precisión: ${accuracy}% (${attempts} int.)`}
                      />
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-slate-50 pt-1">
                    <Link
                      href={`/app/subjects/${subject.id}`}
                      className="hover:text-blue-400 transition-colors"
                    >
                      {subject.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {subject.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <span>
                    {subject.topicsCount ?? 0} temas •{" "}
                    {subject.questionsCount ?? 0} preguntas •{" "}
                    {subject.documentsCount ?? 0} PDF
                  </span>
                  <Button
                    href={`/app/subjects/${subject.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Gestionar temas
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
