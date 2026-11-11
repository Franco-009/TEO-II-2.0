import React from "react";
import { listSubjectQuestionsUseCase } from "@/application/questions/questions.use-cases";
import { getSubjectByIdUseCase } from "@/application/subjects/subjects.use-cases";
import { listSubjectTopicsTreeUseCase } from "@/application/topics/topics.use-cases";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  MOCK_PUBLIC_SUBJECTS,
  MOCK_TOPICS,
} from "@/features/mock-data/phase1-fixtures";
import { QuestionBankList } from "@/features/questions/components/QuestionBankList";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function PublicLibraryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();

  const subjectRes = await getSubjectByIdUseCase(subjectsRepo, null, id);

  const fallback = MOCK_PUBLIC_SUBJECTS[0];
  const subject = subjectRes.ok
    ? subjectRes.data
    : {
        id: fallback.id,
        ownerId: "usr-admin-catalog",
        title: fallback.title,
        description: fallback.description,
        visibility: fallback.visibility,
        status: fallback.status,
        publishedAt: null,
        createdAt: fallback.updatedAt,
        updatedAt: fallback.updatedAt,
        authorName: fallback.authorName,
        topicsCount: fallback.topicsCount,
        questionsCount: fallback.questionsCount,
      };

  const [topicsTreeRes, publishedQuestionsRes] = await Promise.all([
    listSubjectTopicsTreeUseCase(subjectsRepo, topicsRepo, null, subject.id),
    listSubjectQuestionsUseCase({
      subjectsRepo,
      questionsRepo,
      actor: null,
      subjectId: subject.id,
    }),
  ]);

  const topics =
    topicsTreeRes.ok && topicsTreeRes.data.length > 0
      ? topicsTreeRes.data
      : MOCK_TOPICS;
  const publishedQuestions = publishedQuestionsRes.ok
    ? publishedQuestionsRes.data
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Catálogo Público", href: "/library" },
          { label: subject.title },
        ]}
        title={subject.title}
        description={subject.description}
        badge={
          <StatusBadge variant="success" label="Catálogo Público Verificado" />
        }
        primaryAction={{
          label: "Iniciar cuestionario de esta materia",
          href: `/app/quizzes/new?subject=${subject.id}`,
        }}
      />

      <SemanticAlert
        variant="info"
        title="Práctica pública con progreso privado"
        description="Puedes practicar libremente sobre esta materia pública. Tus sesiones, intentos, precisión y puntos XP se registran de forma estrictamente privada en tu perfil personal."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">
            Temas publicados
          </p>
          <p className="text-2xl font-bold text-slate-50 mt-1">
            {topics.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">
            Preguntas activas (published)
          </p>
          <p className="text-2xl font-bold text-slate-50 mt-1">
            {publishedQuestions.length || (subject.questionsCount ?? 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">
            Curaduría
          </p>
          <p className="text-sm font-semibold text-slate-200 mt-2">
            {subject.authorName ?? "Equipo Académico StudyPlay"}
          </p>
        </Card>
      </div>

      <section aria-label="Temario de la materia pública" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Estructura de Temas Publicados
        </h2>
        <div className="space-y-3">
          {topics.map((topic) => (
            <Card
              key={topic.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100">
                  {topic.title}
                </h3>
                <p className="text-xs text-slate-400">{topic.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-300">
                  {topic.questionsCount ?? 0} preguntas
                </span>
                <Button
                  href={`/app/quizzes/new?subject=${subject.id}&topic=${topic.id}`}
                  variant="secondary"
                  size="sm"
                >
                  Practicar tema
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-label="Banco de preguntas publicadas del catálogo público"
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-100">
            Muestra de Preguntas Publicadas (Solo Lectura)
          </h2>
          <span className="text-xs text-slate-400">
            Los borradores (draft) y archivadas (archived) están ocultos por RLS
          </span>
        </div>

        <QuestionBankList
          questions={publishedQuestions}
          subjectId={subject.id}
          topicId={topics[0]?.id ?? ""}
          canEdit={false}
        />
      </section>
    </div>
  );
}
