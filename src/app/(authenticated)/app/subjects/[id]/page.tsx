import React from "react";
import Link from "next/link";
import { listSubjectDocumentsUseCase } from "@/application/documents/documents.use-cases";
import { listSubjectQuestionsUseCase } from "@/application/questions/questions.use-cases";
import { getSubjectByIdUseCase } from "@/application/subjects/subjects.use-cases";
import { listSubjectTopicsTreeUseCase } from "@/application/topics/topics.use-cases";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocumentListCard } from "@/features/documents/components/DocumentListCard";
import { UploadDocumentForm } from "@/features/documents/components/UploadDocumentForm";
import { MOCK_PRIVATE_SUBJECTS } from "@/features/mock-data/phase1-fixtures";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SubjectStatusControl } from "@/features/subjects/components/SubjectStatusControl";
import { CreateTopicForm } from "@/features/topics/components/CreateTopicForm";
import { SupabaseDocumentsRepository } from "@/infrastructure/supabase/supabase-documents.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
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
  const docsRepo = new SupabaseDocumentsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();

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

  const [topicsTreeRes, subjectDocsRes, subjectQuestionsRes] =
    await Promise.all([
      listSubjectTopicsTreeUseCase(
        subjectsRepo,
        topicsRepo,
        actor,
        subject.id
      ),
      listSubjectDocumentsUseCase(subjectsRepo, docsRepo, actor, subject.id),
      listSubjectQuestionsUseCase({
        subjectsRepo,
        questionsRepo,
        actor,
        subjectId: subject.id,
      }),
    ]);

  const topicsTree = topicsTreeRes.ok ? topicsTreeRes.data : [];
  const subjectDocuments = subjectDocsRes.ok ? subjectDocsRes.data : [];
  const subjectQuestions = subjectQuestionsRes.ok
    ? subjectQuestionsRes.data
    : [];

  const publishedQuestionsCount = subjectQuestions.filter(
    (q) => q.status === "published"
  ).length;
  const draftQuestionsCount = subjectQuestions.filter(
    (q) => q.status === "draft"
  ).length;

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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">
            Temas jerárquicos
          </p>
          <p className="text-2xl font-bold text-slate-50 mt-1">
            {topicsTree.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">
            Preguntas publicadas / borrador
          </p>
          <p className="text-2xl font-bold text-slate-50 mt-1">
            {publishedQuestionsCount}{" "}
            <span className="text-xs font-normal text-slate-400">
              publicadas ({draftQuestionsCount} en draft)
            </span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">
            Documentos PDF privados
          </p>
          <p className="text-2xl font-bold text-slate-50 mt-1">
            {subjectDocuments.length}
          </p>
        </Card>
      </div>

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
                      Editar preguntas y PDFs
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
              Documentos PDF Asociados ({subjectDocuments.length})
            </h2>
            <Link
              href="/app/documents"
              className="text-xs font-medium text-blue-400 hover:underline"
            >
              Biblioteca completa
            </Link>
          </div>

          <UploadDocumentForm
            subjects={[subject]}
            topics={topicsTree}
            defaultSubjectId={subject.id}
          />

          <DocumentListCard documents={subjectDocuments} />
        </section>
      </div>
    </div>
  );
}
