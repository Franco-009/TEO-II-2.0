import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { MOCK_PRIVATE_SUBJECTS } from "@/features/mock-data/phase1-fixtures";

export default function SubjectsListPage() {
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
          {MOCK_PRIVATE_SUBJECTS.map((subject) => {
            const isMastered =
              subject.attemptsCount >= 5 && subject.masteryAccuracy >= 80;
            return (
              <Card key={subject.id} className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {subject.status === "published" ? (
                      <StatusBadge variant="success" label="Publicada (Privada)" />
                    ) : (
                      <StatusBadge variant="warning" label="Borrador (No entra en juego)" />
                    )}
                    {isMastered ? (
                      <StatusBadge
                        variant="success"
                        label={`Dominada (${subject.masteryAccuracy}%)`}
                      />
                    ) : (
                      <StatusBadge
                        variant="neutral"
                        label={`Precisión: ${subject.masteryAccuracy}% (${subject.attemptsCount} int.)`}
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
                    {subject.topicsCount} temas • {subject.questionsCount} preguntas •{" "}
                    {subject.documentsCount} PDF
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
