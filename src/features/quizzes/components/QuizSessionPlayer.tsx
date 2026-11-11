"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AttemptEntity } from "@/domain/attempts/attempts.types";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import { evaluateQuestionAnswer } from "@/domain/quizzes/quizzes.rules";
import type {
  AnswerEvaluationResult,
  QuizSessionEntity,
} from "@/domain/quizzes/quizzes.types";
import { completeQuizAction, submitAnswerAction } from "../quizzes.actions";

export interface QuizSessionPlayerProps {
  session: QuizSessionEntity;
  questions: QuestionEntity[];
  initialAttempts: AttemptEntity[];
}

export function QuizSessionPlayer({
  session,
  questions,
  initialAttempts,
}: QuizSessionPlayerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mapa de respuestas ya enviadas en esta sesión
  const [attemptsByQuestionId, setAttemptsByQuestionId] = useState<
    Record<string, AttemptEntity>
  >(() => {
    const map: Record<string, AttemptEntity> = {};
    for (const att of initialAttempts) {
      map[att.questionId] = att;
    }
    return map;
  });

  // Posicionarse inicialmente en la primera pregunta no respondida (o en la 0)
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const firstUnansweredIdx = questions.findIndex(
      (q) => !initialAttempts.some((a) => a.questionId === q.id)
    );
    return firstUnansweredIdx >= 0 ? firstUnansweredIdx : 0;
  });

  const currentQuestion = questions[currentIndex] ?? questions[0];
  const existingAttempt = currentQuestion
    ? attemptsByQuestionId[currentQuestion.id]
    : undefined;

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() =>
    existingAttempt ? existingAttempt.responseJson.selectedOptionIds : []
  );
  const [evaluation, setEvaluation] = useState<AnswerEvaluationResult | null>(
    () => {
      if (existingAttempt && currentQuestion) {
        const res = evaluateQuestionAnswer(
          currentQuestion,
          existingAttempt.responseJson.selectedOptionIds
        );
        return res.ok ? res.data : null;
      }
      return null;
    }
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(() =>
    Date.now()
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!currentQuestion) {
    return (
      <Card className="p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-100">
          Esta sesión no contiene preguntas activas.
        </p>
        <Button href="/app/quizzes/new" variant="primary" size="sm">
          Configurar nuevo cuestionario
        </Button>
      </Card>
    );
  }

  const isMultiple = currentQuestion.type === "multiple_select";
  const isSubmitted = Boolean(evaluation);
  const isLastQuestion = currentIndex >= questions.length - 1;

  function handleSelectQuestionIndex(nextIdx: number) {
    const nextQ = questions[nextIdx];
    if (!nextQ) return;
    setCurrentIndex(nextIdx);
    setErrorMessage(null);
    setQuestionStartTime(Date.now());

    const prevAtt = attemptsByQuestionId[nextQ.id];
    if (prevAtt) {
      setSelectedOptionIds(prevAtt.responseJson.selectedOptionIds);
      const evalRes = evaluateQuestionAnswer(
        nextQ,
        prevAtt.responseJson.selectedOptionIds
      );
      setEvaluation(evalRes.ok ? evalRes.data : null);
    } else {
      setSelectedOptionIds([]);
      setEvaluation(null);
    }
  }

  function handleToggleOption(optionId: string) {
    if (isSubmitted || session.status !== "in_progress") return;
    setErrorMessage(null);

    if (isMultiple) {
      setSelectedOptionIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptionIds([optionId]);
    }
  }

  function handleSubmitAnswer() {
    if (selectedOptionIds.length === 0) {
      setErrorMessage("Selecciona al menos una opción antes de confirmar.");
      return;
    }

    setErrorMessage(null);
    const elapsedMs = Math.max(200, Date.now() - questionStartTime);

    startTransition(async () => {
      const res = await submitAnswerAction({
        sessionId: session.id,
        questionId: currentQuestion.id,
        selectedOptionIds,
        elapsedMs,
      });

      if (!res.ok) {
        setErrorMessage(res.error.message);
        return;
      }

      setAttemptsByQuestionId((prev) => ({
        ...prev,
        [currentQuestion.id]: res.data.attempt,
      }));
      setEvaluation(res.data.evaluation);
    });
  }

  function handleFinishQuiz() {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await completeQuizAction(session.id);
      if (!res.ok) {
        setErrorMessage(res.error.message);
        return;
      }
      router.push(`/app/sessions/${session.id}/result`);
    });
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: "Practicar Quiz", href: "/app/quizzes/new" },
          { label: `Sesión #${session.id}` },
        ]}
        title={`Partida en Curso — ${session.subjectTitle ?? "Materia"}`}
        description={`Pregunta ${currentIndex + 1} de ${
          questions.length
        } • Modo: ${session.mode} • Semilla: ${session.settingsJson.seed}`}
        badge={
          <StatusBadge
            variant="info"
            label={`Versión pregunta v${currentQuestion.version}`}
          />
        }
        primaryAction={{
          label: "Finalizar y ver resultados",
          href: `/app/sessions/${session.id}/result`,
        }}
      />

      {errorMessage && (
        <SemanticAlert
          variant="error"
          title="No se pudo procesar la respuesta"
          description={errorMessage}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {questions.map((q, idx) => {
          const att = attemptsByQuestionId[q.id];
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => handleSelectQuestionIndex(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                isCurrent
                  ? "border-blue-400 bg-blue-600 text-white"
                  : att
                  ? att.isCorrect
                    ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                    : "border-rose-500/40 bg-rose-950/40 text-rose-300"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              }`}
            >
              #{idx + 1} {att ? (att.isCorrect ? "✓" : "✗") : ""}
            </button>
          );
        })}
      </div>

      <Card elevated className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              variant="neutral"
              label={`Tema: ${currentQuestion.topicTitle ?? "General"}`}
            />
            <StatusBadge
              variant="info"
              label={
                currentQuestion.type === "multiple_select"
                  ? "Selección múltiple (marca TODAS las correctas)"
                  : currentQuestion.type === "true_false"
                  ? "Verdadero / Falso"
                  : "Opción única"
              }
            />
          </div>

          {currentQuestion.sourceDocumentName && (
            <StatusBadge
              variant={
                currentQuestion.sourceDocumentAvailable ? "info" : "warning"
              }
              label={
                currentQuestion.sourceDocumentAvailable
                  ? `Ref PDF: ${currentQuestion.sourceDocumentName}${
                      currentQuestion.sourcePage
                        ? ` (pág. ${currentQuestion.sourcePage})`
                        : ""
                    }`
                  : `Fuente no disponible (${currentQuestion.sourceDocumentName})`
              }
            />
          )}
        </div>

        <h2 className="text-lg font-bold text-slate-50 leading-snug">
          {currentQuestion.prompt}
        </h2>

        <div
          role={isMultiple ? "group" : "radiogroup"}
          aria-label="Opciones de respuesta"
          className="space-y-3"
        >
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptionIds.includes(option.id);
            const optFeedback = evaluation?.optionFeedbacks.find(
              (f) => f.optionId === option.id
            );

            return (
              <div
                key={option.id}
                onClick={() => handleToggleOption(option.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggleOption(option.id);
                  }
                }}
                role={isMultiple ? "checkbox" : "radio"}
                aria-checked={isSelected}
                tabIndex={0}
                className={`rounded-xl border p-4 transition-colors cursor-pointer space-y-2 ${
                  isSubmitted
                    ? isSelected
                      ? option.isCorrect
                        ? "border-emerald-500/60 bg-emerald-950/40"
                        : "border-rose-500/60 bg-rose-950/40"
                      : option.isCorrect
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-slate-800 bg-[#0B0F19]"
                    : isSelected
                    ? "border-blue-500 bg-blue-950/30"
                    : "border-slate-700 bg-[#0B0F19] hover:border-blue-500/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">
                    {option.text}
                  </span>

                  {!isSubmitted && isSelected && (
                    <StatusBadge variant="info" label="Seleccionada" />
                  )}

                  {isSubmitted && isSelected && (
                    <StatusBadge
                      variant={option.isCorrect ? "success" : "error"}
                      label={
                        option.isCorrect
                          ? "Seleccionada: Correcta"
                          : "Seleccionada: Incorrecta"
                      }
                    />
                  )}

                  {isSubmitted && !isSelected && option.isCorrect && (
                    <StatusBadge
                      variant="success"
                      label="Respuesta correcta"
                    />
                  )}
                </div>

                {isSubmitted && (optFeedback?.feedback || option.feedback) && (
                  <p className="text-xs text-slate-300 border-t border-slate-800/80 pt-2">
                    {optFeedback?.feedback || option.feedback}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {isSubmitted && evaluation && (
          <SemanticAlert
            variant={evaluation.isCorrect ? "success" : "error"}
            title={
              evaluation.isCorrect
                ? `¡Respuesta correcta! (+10 pts • registrada en v${evaluation.questionVersion})`
                : `Respuesta incorrecta — Guardada en Modo Repaso de Errores (v${evaluation.questionVersion})`
            }
            description={evaluation.generalExplanation}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          {!isSubmitted ? (
            <Button
              type="button"
              variant="primary"
              disabled={isPending || selectedOptionIds.length === 0}
              onClick={handleSubmitAnswer}
            >
              {isPending ? "Corrigiendo..." : "Confirmar respuesta"}
            </Button>
          ) : !isLastQuestion ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSelectQuestionIndex(currentIndex + 1)}
            >
              Siguiente pregunta →
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              disabled={isPending}
              onClick={handleFinishQuiz}
            >
              {isPending
                ? "Cerrando sesión..."
                : "Finalizar partida y ver resultado"}
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={handleFinishQuiz}
          >
            Cerrar sesión ahora
          </Button>
        </div>
      </Card>
    </div>
  );
}
