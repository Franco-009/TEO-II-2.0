import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  MOCK_QUESTIONS,
  MOCK_TOPICS,
} from "@/features/mock-data/phase1-fixtures";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic =
    MOCK_TOPICS.find((item) => item.id === id) ?? MOCK_TOPICS[0];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Mis Materias", href: "/app/subjects" },
          { label: "Fisiología y Biofísica", href: `/app/subjects/${topic.subjectId}` },
          { label: topic.title },
        ]}
        title={topic.title}
        description={topic.description}
        badge={
          <StatusBadge
            variant={topic.accuracy >= 80 ? "success" : "warning"}
            label={`Precisión: ${topic.accuracy}% (${topic.attemptsCount} intentos)`}
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
                  <StatusBadge
                    variant="info"
                    label={`Tipo: ${q.type}`}
                  />
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
                <strong className="text-slate-100">Explicación general guardada: </strong>
                {q.explanation}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
