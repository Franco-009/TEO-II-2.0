"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type {
  AdminAuditLogEntity,
  PublicSubjectModerationItem,
} from "@/domain/admin/admin.types";
import type { ContentStatus } from "@/domain/models/studyplay";
import {
  createPublicSubjectDraftAction,
  moderatePublicSubjectAction,
} from "@/features/admin/admin.actions";

interface AdminModerationQueueClientProps {
  initialQueue: PublicSubjectModerationItem[];
  initialAuditLogs: AdminAuditLogEntity[];
}

export function AdminModerationQueueClient({
  initialQueue,
  initialAuditLogs,
}: AdminModerationQueueClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filterStatus, setFilterStatus] = useState<"all" | ContentStatus>(
    "all"
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const [showNewDraftForm, setShowNewDraftForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filteredQueue = initialQueue.filter((item) => {
    if (filterStatus === "all") return true;
    return item.subject.status === filterStatus;
  });

  function handleModerate(
    subjectId: string,
    targetStatus: ContentStatus,
    notes?: string
  ) {
    setFeedback(null);
    startTransition(async () => {
      const res = await moderatePublicSubjectAction({
        subjectId,
        targetStatus,
        notes,
      });

      if (!res.ok) {
        setFeedback({
          type: "error",
          title: `Operación rechazada (${res.error.code})`,
          message: res.error.message,
        });
        return;
      }

      setFeedback({
        type: "success",
        title: `Estado actualizado a '${res.data.subject.status}'`,
        message: `${res.data.subject.title}: ${res.data.auditLog.notes}`,
      });
      router.refresh();
    });
  }

  function handleCreatePublicDraft(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await createPublicSubjectDraftAction({
        title: newTitle,
        description: newDescription,
        notes: newNotes,
      });

      if (!res.ok) {
        setFeedback({
          type: "error",
          title: `Error al crear materia pública (${res.error.code})`,
          message: res.error.message,
        });
        return;
      }

      setNewTitle("");
      setNewDescription("");
      setNewNotes("");
      setShowNewDraftForm(false);
      setFeedback({
        type: "success",
        title: "Materia pública creada en estado borrador (draft)",
        message: `Se creó '${res.data.subject.title}'. Agrega al menos 1 tema y 1 pregunta publicada antes de aprobar su publicación en /library.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <SemanticAlert
          variant={feedback.type}
          title={feedback.title}
          description={feedback.message}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filtrar cola por estado"
          className="flex flex-wrap items-center gap-2"
        >
          {(
            [
              { key: "all", label: `Todas (${initialQueue.length})` },
              {
                key: "draft",
                label: `Pendientes draft (${
                  initialQueue.filter((i) => i.subject.status === "draft")
                    .length
                })`,
              },
              {
                key: "published",
                label: `Publicadas (${
                  initialQueue.filter((i) => i.subject.status === "published")
                    .length
                })`,
              },
              {
                key: "archived",
                label: `Archivadas (${
                  initialQueue.filter((i) => i.subject.status === "archived")
                    .length
                })`,
              },
            ] as const
          ).map((tab) => {
            const active = filterStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowNewDraftForm((prev) => !prev)}
        >
          {showNewDraftForm
            ? "Cancelar nueva materia pública"
            : "+ Nueva Materia Pública (draft)"}
        </Button>
      </div>

      {showNewDraftForm && (
        <Card elevated className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Registrar Nueva Materia Pública en Cola de Moderación (`draft`)
          </h2>
          <form onSubmit={handleCreatePublicDraft} className="space-y-3">
            <div>
              <label
                htmlFor="admin-pub-title"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Título de la materia pública
              </label>
              <input
                id="admin-pub-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej. Álgebra Lineal y Geometría Analítica"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="admin-pub-desc"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Descripción curricular
              </label>
              <textarea
                id="admin-pub-desc"
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Espacios vectoriales, transformaciones lineales, autovalores y diagonalización."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="admin-pub-notes"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Nota de auditoría inicial (opcional)
              </label>
              <input
                id="admin-pub-notes"
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Ej. Creada por Cátedra Base para revisión de preguntas."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" variant="primary" size="sm">
                {isPending
                  ? "Guardando..."
                  : "Crear en estado borrador (draft)"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {filteredQueue.map((item) => {
          const { subject, topicsCount, publishedQuestionsCount, draftQuestionsCount, isEligibleForPublication, validationNotes } =
            item;

          return (
            <Card key={subject.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Materia pública ({subject.visibility})
                  </span>
                  {subject.status === "published" && (
                    <StatusBadge
                      variant="success"
                      label="Publicada en /library (published)"
                    />
                  )}
                  {subject.status === "draft" && (
                    <StatusBadge
                      variant="warning"
                      label="En borrador (draft)"
                    />
                  )}
                  {subject.status === "archived" && (
                    <StatusBadge
                      variant="info"
                      label="Archivada (archived)"
                    />
                  )}
                  {isEligibleForPublication ? (
                    <StatusBadge
                      variant="success"
                      label="Requisitos completos"
                    />
                  ) : (
                    <StatusBadge
                      variant="error"
                      label="Incompleta para publicar"
                    />
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  Actualizado: {subject.updatedAt}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-50">
                  {subject.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Curaduría:{" "}
                  {subject.authorName ?? "Equipo Académico StudyPlay"} •{" "}
                  {topicsCount} tema(s) • {publishedQuestionsCount} pregunta(s)
                  publicada(s) • {draftQuestionsCount} en borrador
                </p>
                {subject.description && (
                  <p className="text-xs text-slate-300 mt-1">
                    {subject.description}
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-300 bg-[#0B0F19] border border-slate-800 rounded-lg p-3">
                <strong className="text-slate-100">
                  Estado de validación:{" "}
                </strong>
                {validationNotes}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/subjects/${subject.id}`}
                    className="text-xs font-medium text-blue-400 hover:underline"
                  >
                    Gestionar temas y preguntas →
                  </Link>
                  {subject.status === "published" && (
                    <Link
                      href={`/library/${subject.id}`}
                      className="text-xs font-medium text-emerald-400 hover:underline"
                    >
                      Ver en /library →
                    </Link>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {subject.status !== "published" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleModerate(subject.id, "published")}
                    >
                      Aprobar y Publicar en Catálogo
                    </Button>
                  )}
                  {subject.status === "published" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleModerate(subject.id, "draft")}
                    >
                      Pasar a Borrador (draft)
                    </Button>
                  )}
                  {subject.status !== "archived" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleModerate(subject.id, "archived")}
                    >
                      Archivar recurso (conservar historial)
                    </Button>
                  )}
                  {subject.status === "archived" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleModerate(subject.id, "draft")}
                    >
                      Restaurar a Borrador (draft)
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <section
        aria-label="Bitácora de auditoría administrativa"
        className="space-y-3 pt-2"
      >
        <h2 className="text-base font-semibold text-slate-100">
          Bitácora Inmutable de Auditoría (`public.admin_audit_logs`)
        </h2>
        <Card className="p-4 space-y-2.5">
          {initialAuditLogs.length > 0 ? (
            initialAuditLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-2.5 last:border-none last:pb-0 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-100">
                    {log.targetTitle} •{" "}
                    <span className="font-mono text-blue-400">
                      {log.action}
                    </span>
                  </p>
                  <p className="text-slate-400">{log.notes}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge
                    variant={
                      log.newStatus === "published"
                        ? "success"
                        : log.newStatus === "draft"
                        ? "warning"
                        : "info"
                    }
                    label={`${log.previousStatus ?? "nuevo"} → ${
                      log.newStatus
                    }`}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">
              Aún no hay eventos registrados en la bitácora administrativa.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
