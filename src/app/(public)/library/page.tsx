import React from "react";
import Link from "next/link";
import { listPublicLibraryCatalogUseCase } from "@/application/admin/admin.use-cases";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function PublicLibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const query = resolvedSearch?.q?.trim() ?? "";

  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();

  const publicRes = await listPublicLibraryCatalogUseCase({
    subjectsRepo,
    topicsRepo,
    questionsRepo,
    filter: { query },
  });

  const publicSubjects = publicRes.ok ? publicRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo Público Compartido"
        description="Materias verificadas y publicadas por administración (visibility = 'public' AND status = 'published'). Tus intentos y puntos XP al practicar sobre ellas se guardan de forma privada en tu cuenta."
        primaryAction={{
          label: "Practicar con mi cuenta",
          href: "/app/quizzes/new",
        }}
        badge={
          <StatusBadge
            variant="success"
            label={`${publicSubjects.length} materias publicadas`}
          />
        }
      />

      <Card className="p-4">
        <form
          action="/library"
          method="GET"
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <label htmlFor="library-search" className="sr-only">
            Buscar en el catálogo público
          </label>
          <input
            id="library-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar materia por título, área o palabra clave..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary" size="sm">
              Filtrar catálogo
            </Button>
            {query && (
              <Button href="/library" variant="ghost" size="sm">
                Limpiar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <ViewStateSimulator
        title="el catálogo público"
        emptyTitle="Aún no hay materias publicadas en el catálogo público"
        emptyDescription="Solo los recursos con estado 'published' y visibilidad 'public' aparecen en esta sección (los borradores draft y archivados quedan excluidos)."
        emptyActionLabel="Ir a mi biblioteca privada"
        emptyActionHref="/app/subjects"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {publicSubjects.map((subj) => (
            <Card
              key={subj.id}
              className="p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge variant="success" label="Pública • Publicada" />
                  <span className="text-xs text-slate-400">
                    {subj.authorName ?? "Equipo Académico StudyPlay"}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-50">
                  <Link
                    href={`/library/${subj.id}`}
                    className="hover:text-blue-400 transition-colors"
                  >
                    {subj.title}
                  </Link>
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {subj.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span>{subj.topicsCount ?? 0} temas</span>
                  <span>•</span>
                  <span>
                    {subj.questionsCount ?? 0} preguntas verificadas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    href={`/app/quizzes/new?subject=${subj.id}`}
                    variant="primary"
                    size="sm"
                  >
                    Practicar
                  </Button>
                  <Button
                    href={`/library/${subj.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Ver programa
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ViewStateSimulator>
    </div>
  );
}
