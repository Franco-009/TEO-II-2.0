import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { MOCK_PUBLIC_SUBJECTS, MOCK_TOPICS } from "@/features/mock-data/phase1-fixtures";

export default async function PublicLibraryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subject =
    MOCK_PUBLIC_SUBJECTS.find((item) => item.id === id) ?? MOCK_PUBLIC_SUBJECTS[0];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Catálogo Público", href: "/library" },
          { label: subject.title },
        ]}
        title={subject.title}
        description={subject.description}
        badge={<StatusBadge variant="success" label="Catálogo Público Verificado" />}
        primaryAction={{
          label: "Iniciar cuestionario de esta materia",
          href: `/app/quizzes/new?subject=${subject.id}`,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">Temas publicados</p>
          <p className="text-2xl font-bold text-slate-50 mt-1">{subject.topicsCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">Preguntas activas</p>
          <p className="text-2xl font-bold text-slate-50 mt-1">{subject.questionsCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">Curaduría</p>
          <p className="text-sm font-semibold text-slate-200 mt-2">{subject.authorName}</p>
        </Card>
      </div>

      <section aria-label="Temario de la materia pública" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Estructura de Temas Publicados
        </h2>
        <div className="space-y-3">
          {MOCK_TOPICS.map((topic) => (
            <Card key={topic.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100">{topic.title}</h3>
                <p className="text-xs text-slate-400">{topic.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-300">
                  {topic.questionsCount} preguntas
                </span>
                <Button href={`/app/topics/${topic.id}`} variant="ghost" size="sm">
                  Ver detalle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
