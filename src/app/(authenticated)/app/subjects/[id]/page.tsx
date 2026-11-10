import React from "react";
import Link from "next/link";
import { getSubjectByIdUseCase } from "@/application/subjects/subjects.use-cases";
import { listSubjectTopicsTreeUseCase } from "@/application/topics/topics.use-cases";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MOCK_DOCUMENTS, MOCK_PRIVATE_SUBJECTS } from "@/features/mock-data/phase1-fixtures";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SubjectStatusControl } from "@/features/subjects/components/SubjectStatusControl";
import { CreateTopicForm } from "@/features/topics/components/CreateTopicForm";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();

  const subjectRes = await getSubjectByIdUseCase(subjectsRepo, actor, id);
  const fallback = MOCK_PRIVATE_SUBJECTS[0];
  const subject = subjectRes.ok
    ? subjectRes.data
    : {
        id: fallback.id,
        ownerId: actor.userId,
        title: fallback.title,
        description: fallback.description,
        visibility: fallback.visibility,
        status: fallback.status,
        publishedAt: null,
        createdAt: fallback.updatedAt,
        updatedAt: fallback.updatedAt,
      };

  const topicsTreeRes = await listSubjectTopicsTreeUseCase(
    subjectsRepo,
    topicsRepo,
    actor,
    subject.id
  );
  const topicsTree = topicsTreeRes.ok ? topicsTreeRes.data : [];

  const subjectDocuments = MOCK_DOCUMENTS.filter(
    (doc) => doc.subjectId === subject.id
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Mis Materias", href: "/app/subjects" },
          { label: subject.title },
        ]}
        title={subject.title}
        description={subject.description}
        badge={
          <StatusBadge
            variant={
              subject.status === "published"
                ? "success"
                : subject.status === "draft"
                ? "warning"
                : "info"
            }
            label={
              subject.status === "published"
                ? "Publicada (Activa para cuestionarios)"
                : subject.status === "draft"
                ? "Borrador (En edición)"
                : "Archivada (Histórica)"
            }
          />
        }
        primaryAction={{
          label: "Practicar esta materia",
          href: `/app/quizzes/new?subject=${subject.id}`,
        }}
      />

      <SubjectStatusControl
        subjectId={subject.id}
        currentStatus={subject.status}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-label="Árbol jerárquico de temas"
          className="lg:col-span-2 space-y-5"
        >
          <CreateTopicForm
            subjectId={subject.id}
            existingTopics={topicsTree}
          />

          <div className="flex items-center justify-between pt-2">
            <h2 className="text-base font-semibold text-slate-100">
              Estructura Jerárquica de Temas (sort_order)
            </h2>
            <span className="text-xs text-slate-400">
              {topicsTree.length} temas registrados
            </span>
          </div>

          {topicsTree.length === 0 ? (
            <EmptyState
              title="Esta materia aún no tiene temas"
              description="Utiliza el formulario superior para crear tu primer tema raíz o subtema."
            />
          ) : (
            <div className="space-y-3">
              {topicsTree.map((topic) => {
                const isSubtopic = topic.depth > 0;
                const accuracy = topic.accuracy ?? 0;
                const attempts = topic.attemptsCount ?? 0;

                return (
                  <Card
                    key={topic.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      isSubtopic ? "ml-6 border-l-4 border-l-blue-500/60" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/topics/${topic.id}`}
                          className="text-sm font-semibold text-slate-50 hover:text-blue-400"
                        >
                          {topic.title}
                        </Link>
                        {accuracy >= 80 && attempts >= 5 ? (
                          <StatusBadge
                            variant="success"
                            label={`Dominado (${accuracy}%)`}
                          />
                        ) : (
                          <StatusBadge
                            variant="warning"
                            label={`Por reforzar (${accuracy}%)`}
                          />
                        )}
                      </div>
                      {topic.parentTitle && (
                        <p className="text-[11px] text-blue-400 font-medium">
                          Subtema de: {topic.parentTitle}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        {topic.description}
                      </p>
                      <p className="text-xs text-slate-300">
                        Orden #{topic.sortOrder} • {topic.questionsCount ?? 0}{" "}
                        preguntas • {topic.documentsCount ?? 0} apuntes PDF
                      </p>
                    </div>

                    <Button
                      href={`/app/topics/${topic.id}`}
                      variant="secondary"
                      size="sm"
                    >
                      Ver preguntas y PDFs
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section aria-label="Apuntes PDF de la materia" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">
              Documentos PDF Asociados
            </h2>
            <Link
              href="/app/documents"
              className="text-xs font-medium text-blue-400 hover:underline"
            >
              Gestionar PDFs
            </Link>
          </div>

          <Card className="p-4 space-y-3">
            {subjectDocuments.length === 0 ? (
              <p className="text-xs text-slate-400">
                Aún no hay apuntes PDF vinculados a esta materia.
              </p>
            ) : (
              subjectDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border-b border-slate-800 pb-3 last:border-none last:pb-0 space-y-1.5"
                >
                  <p className="text-xs font-semibold text-slate-200 break-all">
                    {doc.filename}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {doc.status === "available" ? (
                      <StatusBadge variant="success" label="PDF disponible" />
                    ) : (
                      <StatusBadge
                        variant="warning"
                        label="Fuente no disponible (preguntas preservadas)"
                      />
                    )}
                    <span className="text-[11px] text-slate-400">
                      {(doc.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
