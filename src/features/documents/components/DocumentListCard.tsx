"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type {
  DocumentEntity,
  SignedDocumentUrl,
} from "@/domain/documents/documents.types";
import {
  deleteDocumentAction,
  getSignedDocumentUrlAction,
  retryDocumentUploadAction,
} from "../documents.actions";

export interface DocumentListCardProps {
  documents: DocumentEntity[];
}

export function DocumentListCard({ documents }: DocumentListCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [signedUrlData, setSignedUrlData] = useState<SignedDocumentUrl | null>(
    null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  function handleOpenSignedUrl(doc: DocumentEntity) {
    setFeedback(null);
    setActiveDocId(doc.id);

    startTransition(async () => {
      const res = await getSignedDocumentUrlAction(doc.id);
      setActiveDocId(null);

      if (!res.ok) {
        setFeedback({
          type: "error",
          title: "No se pudo generar la URL firmada",
          message: res.error.message,
        });
        return;
      }

      setSignedUrlData(res.data);
      setFeedback({
        type: "success",
        title: "URL firmada temporal generada",
        message: `El enlace para "${doc.filename}" está activo durante 5 minutos.`,
      });
    });
  }

  function handleRetryUpload(doc: DocumentEntity) {
    setFeedback(null);
    setActiveDocId(doc.id);

    startTransition(async () => {
      const res = await retryDocumentUploadAction({
        documentId: doc.id,
        subjectId: doc.subjectId,
      });
      setActiveDocId(null);

      if (!res.ok) {
        setFeedback({
          type: "error",
          title: "Error en el reintento",
          message: res.error.message,
        });
        return;
      }

      setFeedback({
        type: "success",
        title: "Reintento idempotente exitoso",
        message: `"${res.data.filename}" ahora está disponible sin haber creado registros duplicados.`,
      });
      router.refresh();
    });
  }

  function handleConfirmDelete(doc: DocumentEntity) {
    setFeedback(null);
    setActiveDocId(doc.id);

    startTransition(async () => {
      const res = await deleteDocumentAction({
        documentId: doc.id,
        subjectId: doc.subjectId,
        topicId: doc.topicId,
      });
      setActiveDocId(null);
      setConfirmDeleteId(null);

      if (!res.ok) {
        setFeedback({
          type: "error",
          title: "Error al eliminar documento",
          message: res.error.message,
        });
        return;
      }

      if (signedUrlData?.documentId === doc.id) {
        setSignedUrlData(null);
      }

      setFeedback({
        type: "success",
        title: "Documento PDF privado eliminado",
        message: `El archivo "${doc.filename}" se borró del bucket privado. Las preguntas asociadas (${res.data.preservedLinkedQuestions}) se conservan indicando "Fuente no disponible".`,
      });
      router.refresh();
    });
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        title="Aún no hay documentos PDF privados en esta vista"
        description="Sube tu primer apunte PDF (hasta 15 MB) usando el formulario superior."
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

      {signedUrlData && (
        <Card elevated className="p-4 space-y-2 border-blue-500/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-100">
              Visor de URL firmada temporal ({signedUrlData.filename})
            </span>
            <button
              type="button"
              onClick={() => setSignedUrlData(null)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-100"
            >
              Cerrar visor ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 break-all font-mono bg-[#0B0F19] p-2.5 rounded-lg border border-slate-800">
            {signedUrlData.signedUrl}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Ruta en Storage privado: <code>{signedUrlData.storagePath}</code>
            </span>
            <span>
              Expira:{" "}
              {new Date(signedUrlData.expiresAt).toLocaleTimeString("es-AR")}
            </span>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {documents.map((doc) => {
          const isThisPending = isPending && activeDocId === doc.id;
          const isConfirmingDelete = confirmDeleteId === doc.id;

          return (
            <Card key={doc.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">
                      {doc.filename}
                    </span>
                    {doc.status === "available" && (
                      <StatusBadge
                        variant="success"
                        label="Disponible (URL firmada)"
                      />
                    )}
                    {doc.status === "uploading" && (
                      <StatusBadge
                        variant="warning"
                        label="Subiendo a Storage..."
                      />
                    )}
                    {doc.status === "failed" && (
                      <StatusBadge
                        variant="error"
                        label="Subida fallida (Reintentable)"
                      />
                    )}
                    {doc.status === "unavailable" && (
                      <StatusBadge
                        variant="warning"
                        label="Fuente no disponible (Archivo eliminado)"
                      />
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Materia:{" "}
                    <Link
                      href={`/app/subjects/${doc.subjectId}`}
                      className="text-blue-400 hover:underline"
                    >
                      {doc.subjectTitle}
                    </Link>
                    {doc.topicId && doc.topicTitle ? (
                      <>
                        {" • Tema: "}
                        <Link
                          href={`/app/topics/${doc.topicId}`}
                          className="text-blue-400 hover:underline"
                        >
                          {doc.topicTitle}
                        </Link>
                      </>
                    ) : (
                      " • General de la materia"
                    )}
                  </p>

                  <p className="text-xs text-slate-300">
                    Tamaño: {(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB •
                    MIME: {doc.mimeType} • {doc.linkedQuestionsCount} preguntas
                    vinculadas
                  </p>

                  <p className="text-[11px] text-slate-500 font-mono">
                    Bucket path: {doc.storagePath}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {doc.status === "available" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isThisPending}
                      onClick={() => handleOpenSignedUrl(doc)}
                    >
                      {isThisPending ? "Firmando..." : "Abrir (URL firmada)"}
                    </Button>
                  )}

                  {doc.status === "failed" && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isThisPending}
                      onClick={() => handleRetryUpload(doc)}
                    >
                      {isThisPending ? "Reintentando..." : "Reintentar subida"}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isThisPending}
                    onClick={() =>
                      setConfirmDeleteId(isConfirmingDelete ? null : doc.id)
                    }
                  >
                    Eliminar PDF
                  </Button>
                </div>
              </div>

              {isConfirmingDelete && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-amber-200 max-w-2xl">
                    <strong>¿Confirmar eliminación del PDF privado?</strong> El
                    archivo se borrará de <code>study-documents</code>, pero{" "}
                    <strong>
                      las preguntas generadas desde este documento NO se
                      eliminarán
                    </strong>{" "}
                    (quedarán con <code>document_id = NULL</code> y leyenda{" "}
                    <em>&quot;Fuente no disponible&quot;</em>).
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isThisPending}
                      onClick={() => handleConfirmDelete(doc)}
                    >
                      {isThisPending
                        ? "Eliminando..."
                        : "Confirmar eliminación"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
