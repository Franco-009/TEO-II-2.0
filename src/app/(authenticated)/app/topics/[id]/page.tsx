import React from "react";
import {
  listSubjectDocumentsUseCase,
  listTopicDocumentsUseCase,
} from "@/application/documents/documents.use-cases";
import { listTopicQuestionsUseCase } from "@/application/questions/questions.use-cases";
import { getSubjectByIdUseCase } from "@/application/subjects/subjects.use-cases";
import { getTopicByIdUseCase } from "@/application/topics/topics.use-cases";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocumentListCard } from "@/features/documents/components/DocumentListCard";
import { UploadDocumentForm } from "@/features/documents/components/UploadDocumentForm";
import {
  MOCK_PRIVATE_SUBJECTS,
  MOCK_TOPICS,
} from "@/features/mock-data/phase1-fixtures";
import { QuestionBankList } from "@/features/questions/components/QuestionBankList";
import { QuestionEditorForm } from "@/features/questions/components/QuestionEditorForm";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseDocumentsRepository } from "@/infrastructure/supabase/supabase-documents.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function TopicDetailPage({
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

  const topicDetailRes = await getTopicByIdUseCase(
    subjectsRepo,
    topicsRepo,
    actor,
    id
  );

  const fallbackTopic = MOCK_TOPICS[0];
  const topic = topicDetailRes.ok
    ? topicDetailRes.data.topic
    : {
        id: fallbackTopic.id,
        subjectId: fallbackTopic.subjectId,
        parentTopicId: fallbackTopic.parentTopicId,
        title: fallbackTopic.title,
        description: fallbackTopic.description,
        sortOrder: fallbackTopic.sortOrder,
        createdAt: "",
        updatedAt: "",
        accuracy: fallbackTopic.accuracy,
        attemptsCount: fallbackTopic.attemptsCount,
      };
  const parentTitle = topicDetailRes.ok
    ? topicDetailRes.data.parentTitle
    : null;

  const [subjectRes, topicDocsRes, subjectDocsRes, questionsRes] =
    await Promise.all([
      getSubjectByIdUseCase(subjectsRepo, actor, topic.subjectId),
      listTopicDocumentsUseCase(
        subjectsRepo,
        docsRepo,
        actor,
        topic.subjectId,
        topic.id
      ),
      listSubjectDocumentsUseCase(
        subjectsRepo,
        docsRepo,
        actor,
        topic.subjectId
      ),
      listTopicQuestionsUseCase({
        subjectsRepo,
        topicsRepo,
        questionsRepo,
        actor,
        topicId: topic.id,
      }),
    ]);

  const fallbackSubject = MOCK_PRIVATE_SUBJECTS[0];
  const subject = subjectRes.ok
    ? subjectRes.data
    : {
        id: fallbackSubject.id,
        ownerId: actor.userId,
        title: fallbackSubject.title,
        description: fallbackSubject.description,
        visibility: fallbackSubject.visibility,
        status: fallbackSubject.status,
        publishedAt: null,
        createdAt: fallbackSubject.updatedAt,
        updatedAt: fallbackSubject.updatedAt,
      };

  const topicDocuments = topicDocsRes.ok ? topicDocsRes.data : [];
  const availableSubjectDocs = subjectDocsRes.ok ? subjectDocsRes.data : [];
  const questions = questionsRes.ok ? questionsRes.data : [];

  const accuracy = topic.accuracy ?? 0;
  const attempts = topic.attemptsCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Mis Materias", href: "/app/subjects" },
          { label: subject.title, href: `/app/subjects/${topic.subjectId}` },
          ...(parentTitle ? [{ label: parentTitle }] : []),
          { label: topic.title },
        ]}
        title={topic.title}
        description={topic.description}
        badge={
          <StatusBadge
            variant={accuracy >= 80 ? "success" : "warning"}
            label={`Orden #${topic.sortOrder} • Precisión: ${accuracy}% (${attempts} intentos)`}
          />
        }
        primaryAction={{
          label: "Practicar este tema",
          href: `/app/quizzes/new?topic=${topic.id}`,
        }}
      />

      <section aria-label="Documentos PDF del tema" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-100">
            Documentos PDF del Tema ({topicDocuments.length})
          </h2>
          <span className="text-xs text-slate-400">
            Almacenados en bucket privado study-documents con URLs firmadas
          </span>
        </div>

        <UploadDocumentForm
          subjects={[subject]}
          topics={[topic]}
          defaultSubjectId={subject.id}
          defaultTopicId={topic.id}
        />

        <DocumentListCard documents={topicDocuments} />
      </section>

      <section aria-label="Banco de preguntas del tema" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-100">
            Banco de Preguntas Deterministas ({questions.length} registradas)
          </h2>
          <span className="text-xs text-slate-400">
            Las preguntas en borrador (draft) no entran en partidas normales
          </span>
        </div>

        <QuestionEditorForm
          subjectId={subject.id}
          topicId={topic.id}
          availableDocuments={availableSubjectDocs}
        />

        <QuestionBankList
          questions={questions}
          subjectId={subject.id}
          topicId={topic.id}
          canEdit={true}
        />
      </section>
    </div>
  );
}
