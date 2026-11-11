"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ContentStatus } from "@/domain/models/studyplay";
import type { QuestionEntity } from "@/domain/questions/questions.types";
import {
  changeQuestionStatusAction,
  deleteQuestionAction,
  updateQuestionAction,
} from "../questions.actions";

export interface QuestionBankListProps {
  questions: QuestionEntity[];
  subjectId: string;
  topicId: string;
  canEdit?: boolean;
}

export function QuestionBankList({
  questions,
  subjectId,
  topicId,
  canEdit = true,
}: QuestionBankListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewStudentQuestionId, setPreviewStudentQuestionId] = useState<
    string | null
  >(null);
  const [selectedPreviewOptions, setSelectedPreviewOptions] = useState<
    Record<string, boolean>
  >({});
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [editPrompt, setEditPrompt] = useState("");
  const [editExplanation, setEditExplanation] = useState("");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  function handleStartEdit(q: QuestionEntity) {
    setFeedback(null);
    setEditingQuestionId(q.id);
    setEditPrompt(q.prompt);
    setEditExplanation(q.explanation);
  }

  function handleSaveEdit(q: QuestionEntity) {
    setFeedback(null);
    setActiveId(q.id);

    startTransition(async () => {
      const res = await updateQuestionAction({
        questionId: q.id,
        topicId: q.topicId || topicId,
        subjectId: q.subjectId || subjectId,
        input: {
          prompt: editPrompt,
          explanation: editExplanation,
        },
      });
      setActiveId(null);

      if (!res.ok) {
        setFeedback({
          type: "error",
          title: "No se pudo actualizar la pregunta",
          message: res.error.message,
        });
        return;
      }

      setEditingQuestionId(null);
      setFeedback({
        type: "success",
        title: `Pregunta actualizada (Versión v${res.data.version})`,
        message:
          res.data.version > q.version
            ? `Se incrementó automáticamente la versión de v${q.version} a v${res.data.version} para preservar la trazabilidad histórica.`
            : "Cambios guardados correctamente.",
      });
      router.refresh();
    });
  }

  function handleStatusChange(q: QuestionEntity, nextStatus: ContentStatus) {
    setFeedback(null);
    setActiveId(q.id);

    startTransition(async () => {
      const res = await changeQuestionStatusAction({
        questionId: q.id,
        topicId: q.topicId || topicId,
        subjectId: q.subjectId || subjectId,
        status: nextStatus,
      });
      setActiveId(null);

      if (!res.ok) {
        setFeedback({
          type: "error",
          title: "Transición de estado bloqueada",
          message: res.error.message,
        });
        return;
      }

      setFeedback({
        type: "success",
        title: "Estado actualizado",
        message: `La pregunta pasó a estado "${res.data.status}".`,
      });
      router.refresh();
    });
  }

  function handleDelete(q: QuestionEntity) {
    setFeedback(null);
    setActiveId(q.id);

    startTransition(async () => {
      const res = await deleteQuestionAction({
        questionId: q.id,
        topicId: q.topicId || topicId,
        subjectId: q.subjectId || subjectId,
      });
      setActiveId(null);

      if (!res.ok) {
        setFeedback({
          type: "error",
          title: "Error al eliminar pregunta",
          message: res.error.message,
        });
        return;
      }

      setFeedback({
        type: "success",
        title: "Pregunta eliminada",
        message: "La pregunta fue retirada del banco del tema.",
      });
      router.refresh();
    });
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        title="Aún no hay preguntas registradas en este tema"
        description="Utiliza el editor determinista superior para crear preguntas single_choice, true_false o multiple_select."
      />
    );
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <SemanticAlert
          variant={feedback.type}
          title={feedback.title}
          description={feedback.message}
        />
      )}

      <div className="space-y-4">
        {questions.map((q) => {
          const isThisPending = isPending && activeId === q.id;
          const isStudentPreview = previewStudentQuestionId === q.id;
          const isEditing = editingQuestionId === q.id;

          return (
            <Card key={q.id} className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge variant="info" label={`Tipo: ${q.type}`} />
                  {q.status === "published" && (
                    <StatusBadge
                      variant="success"
                      label="Publicada (published)"
                    />
                  )}
                  {q.status === "draft" && (
                    <StatusBadge variant="warning" label="Borrador (draft)" />
                  )}
                  {q.status === "archived" && (
                    <StatusBadge
                      variant="neutral"
                      label="Archivada (archived)"
                    />
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
                        label={`Fuente PDF: ${q.sourceDocumentName}${
                          q.sourcePage ? ` (pág. ${q.sourcePage})` : ""
                        }`}
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

              {isEditing ? (
                <div className="rounded-xl border border-blue-500/40 bg-[#0B0F19] p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-300">
                    Editando pregunta (al guardar cambios sustantivos se
                    incrementará a v{q.version + 1})
                  </p>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-200">
                      Enunciado (prompt)
                    </label>
                    <textarea
                      rows={2}
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-200">
                      Explicación general
                    </label>
                    <textarea
                      rows={2}
                      value={editExplanation}
                      onChange={(e) => setEditExplanation(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingQuestionId(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isThisPending}
                      onClick={() => handleSaveEdit(q)}
                    >
                      {isThisPending
                        ? "Guardando..."
                        : `Guardar nueva versión (v${q.version + 1})`}
                    </Button>
                  </div>
                </div>
              ) : (
                <h3 className="text-base font-semibold text-slate-50">
                  {q.prompt}
                </h3>
              )}

              {isStudentPreview ? (
                <div className="rounded-xl border border-violet-500/40 bg-violet-950/15 p-4 space-y-3">
                  <p className="text-xs font-semibold text-violet-300">
                    Modo Vista Previa como Estudiante: seleccioná una opción
                    para probar la devolución inmediata
                  </p>
                  <ul className="space-y-2">
                    {q.options.map((opt) => {
                      const isSelected = Boolean(
                        selectedPreviewOptions[opt.id]
                      );
                      return (
                        <li key={opt.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPreviewOptions((prev) => ({
                                ...prev,
                                [opt.id]: !prev[opt.id],
                              }))
                            }
                            className={`w-full text-left rounded-lg border p-3 text-xs space-y-1 transition-colors ${
                              isSelected
                                ? opt.isCorrect
                                  ? "border-emerald-500 bg-emerald-950/40 text-emerald-100"
                                  : "border-rose-500 bg-rose-950/40 text-rose-100"
                                : "border-slate-800 bg-[#0B0F19] text-slate-200 hover:border-slate-600"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 font-medium">
                              <span>{opt.text}</span>
                              {isSelected &&
                                (opt.isCorrect ? (
                                  <StatusBadge
                                    variant="success"
                                    label="¡Acierto!"
                                  />
                                ) : (
                                  <StatusBadge
                                    variant="error"
                                    label="Incorrecta"
                                  />
                                ))}
                            </div>
                            {isSelected && opt.feedback && (
                              <p className="text-slate-300 pt-1">
                                {opt.feedback}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
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
                          <StatusBadge
                            variant="success"
                            label="Opción correcta"
                          />
                        ) : (
                          <StatusBadge variant="error" label="Distractor" />
                        )}
                      </div>
                      {opt.feedback && (
                        <p className="text-slate-400">{opt.feedback}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                <strong className="text-slate-100">
                  Explicación general guardada:{" "}
                </strong>
                {q.explanation || "(Sin explicación general aún)"}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedPreviewOptions({});
                    setPreviewStudentQuestionId(
                      isStudentPreview ? null : q.id
                    );
                  }}
                >
                  {isStudentPreview
                    ? "Salir de vista previa"
                    : "Probar como estudiante"}
                </Button>

                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isThisPending}
                      onClick={() => handleStartEdit(q)}
                    >
                      Editar (v{q.version})
                    </Button>

                    {q.status !== "published" && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={isThisPending}
                        onClick={() => handleStatusChange(q, "published")}
                      >
                        Publicar
                      </Button>
                    )}

                    {q.status !== "draft" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isThisPending}
                        onClick={() => handleStatusChange(q, "draft")}
                      >
                        Pasar a Borrador
                      </Button>
                    )}

                    {q.status !== "archived" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isThisPending}
                        onClick={() => handleStatusChange(q, "archived")}
                      >
                        Archivar
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isThisPending}
                      onClick={() => handleDelete(q)}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
