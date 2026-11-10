import React from "react";
import { getSubjectByIdUseCase } from "@/application/subjects/subjects.use-cases";
import { getTopicByIdUseCase } from "@/application/topics/topics.use-cases";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  MOCK_QUESTIONS,
  MOCK_TOPICS,
} from "@/features/mock-data/phase1-fixtures";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
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

  const subjectRes = await getSubjectByIdUseCase(
    subjectsRepo,
    actor,
    topic.subjectId
  );
  const subjectTitle = subjectRes.ok
    ? subjectRes.data.title
    : "Fisiología y Biofísica";

  const accuracy = topic.accuracy ?? 0;
  const attempts = topic.attemptsCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Mis Materias", href: "/app/subjects" },
          { label: subjectTitle, href: `/app/subjects/${topic.subjectId}` },
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

      <section aria-label="Banco de preguntas del tema" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-100">
            Banco de Preguntas Deterministas (v1: single_choice, true_false, multiple_select)
          </h2>
          <span className="text-xs text-slate-400">
            Las preguntas en borrador (draft) no entran en partidas normales
          </span>
        </div>

        <div className="space-y-4">
          {MOCK_QUESTIONS.map((q) => (
            <Card key={q.id} className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge variant="info" label={`Tipo: ${q.type}`} />
                  {q.status === "published" ? (
                    <StatusBadge variant="success" label="Publicada (published)" />
                  ) : (
                    <StatusBadge variant="warning" label="Borrador (draft)" />
                  )}
                  <span className="text-xs text-slate-400">
                    Versión v{q.version} • Dificultad: {q.difficulty}
                  </span>
                </div>

                {q.sourceDocumentName && (
                  <div>
                    {q.sourceDocumentAvailable ? (
                      <StatusBadge
                        variant="neutral"
                        label={`Fuente PDF: ${q.sourceDocumentName} (pág. ${q.sourcePage})`}
                      />
                    ) : (
                      <StatusBadge
                        variant="warning"
                        label={`Fuente no disponible (${q.sourceDocumentName})`}
                      />
                    )}
                  </div>
                )}
              </div>

              <h3 className="text-base font-semibold text-slate-50">
                {q.prompt}
              </h3>

              <ul className="space-y-2">
                {q.options.map((opt) => (
                  <li
                    key={opt.id}
                    className={`rounded-lg border p-3 text-xs space-y-1 ${
                      opt.isCorrect
                        ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-100"
                        : "border-slate-800 bg-[#0B0F19] text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-medium">
                      <span>{opt.text}</span>
                      {opt.isCorrect ? (
                        <StatusBadge variant="success" label="Opción correcta" />
                      ) : (
                        <StatusBadge variant="error" label="Distractor" />
                      )}
                    </div>
                    <p className="text-slate-400">{opt.feedback}</p>
                  </li>
                ))}
              </ul>

              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                <strong className="text-slate-100">
                  Explicación general guardada:{" "}
                </strong>
                {q.explanation}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
