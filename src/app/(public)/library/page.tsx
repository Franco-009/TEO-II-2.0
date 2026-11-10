import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { MOCK_PUBLIC_SUBJECTS } from "@/features/mock-data/phase1-fixtures";

export default function PublicLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo Público Compartido"
        description="Materias verificadas y publicadas por administración (visibility = 'public' AND status = 'published')."
        primaryAction={{
          label: "Practicar con mi cuenta",
          href: "/app/quizzes/new",
        }}
        badge={<StatusBadge variant="success" label="2 materias publicadas" />}
      />

      <ViewStateSimulator
        title="el catálogo público"
        emptyTitle="Aún no hay materias publicadas en el catálogo público"
        emptyDescription="Solo los recursos con estado 'published' y visibilidad 'public' aparecen en esta sección."
        emptyActionLabel="Ir a mi biblioteca privada"
        emptyActionHref="/app/subjects"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {MOCK_PUBLIC_SUBJECTS.map((subj) => (
            <Card key={subj.id} className="p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge variant="success" label="Pública • Publicada" />
                  <span className="text-xs text-slate-400">{subj.authorName}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-50">
                  <Link href={`/library/${subj.id}`} className="hover:text-blue-400 transition-colors">
                    {subj.title}
                  </Link>
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {subj.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span>{subj.topicsCount} temas</span>
                  <span>•</span>
                  <span>{subj.questionsCount} preguntas verificadas</span>
                </div>
                <Button href={`/library/${subj.id}`} variant="secondary" size="sm">
                  Ver programa y practicar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ViewStateSimulator>
    </div>
  );
}
