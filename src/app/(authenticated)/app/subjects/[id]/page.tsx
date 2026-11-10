import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import {
  MOCK_DOCUMENTS,
  MOCK_PRIVATE_SUBJECTS,
  MOCK_TOPICS,
} from "@/features/mock-data/phase1-fixtures";

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subject =
    MOCK_PRIVATE_SUBJECTS.find((item) => item.id === id) ??
    MOCK_PRIVATE_SUBJECTS[0];

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
            variant={subject.status === "published" ? "success" : "warning"}
            label={
              subject.status === "published"
                ? "Publicada (Activa para cuestionarios)"
                : "Borrador (En edición)"
            }
          />
        }
        primaryAction={{
          label: "Practicar esta materia",
          href: `/app/quizzes/new?subject=${subject.id}`,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-label="Árbol jerárquico de temas" className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">
              Estructura Jerárquica de Temas (sort_order)
            </h2>
            <span className="text-xs text-slate-400">
              {MOCK_TOPICS.length} temas registrados
            </span>
          </div>

          <div className="space-y-3">
            {MOCK_TOPICS.map((topic) => {
              const isSubtopic = topic.parentTopicId !== null;
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
                      {topic.accuracy >= 80 && topic.attemptsCount >= 5 ? (
                        <StatusBadge
                          variant="success"
                          label={`Dominado (${topic.accuracy}%)`}
                        />
                      ) : (
                        <StatusBadge
                          variant="warning"
                          label={`Por reforzar (${topic.accuracy}%)`}
                        />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{topic.description}</p>
                    <p className="text-xs text-slate-300">
                      Orden #{topic.sortOrder} • {topic.questionsCount} preguntas •{" "}
                      {topic.documentsCount} apuntes PDF
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
            {subjectDocuments.map((doc) => (
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
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
