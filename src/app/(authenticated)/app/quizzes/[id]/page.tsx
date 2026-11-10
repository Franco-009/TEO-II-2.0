"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { Button } from "@/components/ui/Button";
import { MOCK_QUESTIONS } from "@/features/mock-data/phase1-fixtures";

export default function ActiveQuizSessionPage() {
  const question = MOCK_QUESTIONS[0];
  const [selectedOptionId, setSelectedOptionId] = React.useState<string>("opt-1");
  const [submitted, setSubmitted] = React.useState<boolean>(true);

  const selectedOption = question.options.find((o) => o.id === selectedOptionId);
  const isCorrect = selectedOption?.isCorrect ?? false;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: "Practicar Quiz", href: "/app/quizzes/new" },
          { label: "Sesión #session-demo" },
        ]}
        title="Partida en Curso — Fisiología y Biofísica"
        description="Pregunta 1 de 3 • Modo Práctica (corrección determinista explicada)."
        badge={<StatusBadge variant="info" label={`Versión pregunta v${question.version}`} />}
        primaryAction={{
          label: "Finalizar y ver resultados",
          href: "/app/sessions/session-demo/result",
        }}
      />

      <Card elevated className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge variant="neutral" label={`Tema: ${question.topicTitle}`} />
          {question.sourceDocumentName && (
            <StatusBadge
              variant="info"
              label={`Ref: ${question.sourceDocumentName} (pág. ${question.sourcePage})`}
            />
          )}
        </div>

        <h2 className="text-lg font-bold text-slate-50 leading-snug">
          {question.prompt}
        </h2>

        <div role="radiogroup" aria-label="Opciones de respuesta" className="space-y-3">
          {question.options.map((option) => {
            const isSelected = option.id === selectedOptionId;
            return (
              <div
                key={option.id}
                onClick={() => {
                  setSelectedOptionId(option.id);
                  setSubmitted(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedOptionId(option.id);
                    setSubmitted(true);
                  }
                }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                className={`rounded-xl border p-4 transition-colors cursor-pointer space-y-2 ${
                  submitted && isSelected
                    ? option.isCorrect
                      ? "border-emerald-500/60 bg-emerald-950/40"
                      : "border-rose-500/60 bg-rose-950/40"
                    : "border-slate-700 bg-[#0B0F19] hover:border-blue-500/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">
                    {option.text}
                  </span>
                  {submitted && isSelected && (
                    <StatusBadge
                      variant={option.isCorrect ? "success" : "error"}
                      label={
                        option.isCorrect
                          ? "Seleccionada: Correcta"
                          : "Seleccionada: Incorrecta"
                      }
                    />
                  )}
                  {submitted && !isSelected && option.isCorrect && (
                    <StatusBadge variant="success" label="Respuesta correcta" />
                  )}
                </div>

                {submitted && (
                  <p className="text-xs text-slate-300 border-t border-slate-800/80 pt-2">
                    {option.feedback}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {submitted && (
          <SemanticAlert
            variant={isCorrect ? "success" : "error"}
            title={
              isCorrect
                ? "¡Respuesta correcta! (+10 XP)"
                : "Respuesta incorrecta — Guardada para repaso"
            }
            description={question.explanation}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSubmitted((prev) => !prev)}
          >
            {submitted ? "Ocultar corrección" : "Verificar respuesta"}
          </Button>
          <Button href="/app/sessions/session-demo/result" variant="primary">
            Ver resumen de la partida
          </Button>
        </div>
      </Card>
    </div>
  );
}
