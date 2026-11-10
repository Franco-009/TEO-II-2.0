"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { MAX_PDF_SIZE_BYTES } from "@/domain/documents/documents.types";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";
import type { TopicEntity } from "@/domain/topics/topics.types";
import { uploadDocumentAction } from "../documents.actions";

export interface UploadDocumentFormProps {
  subjects: SubjectEntity[];
  topics: TopicEntity[];
  defaultSubjectId?: string;
  defaultTopicId?: string;
}

export function UploadDocumentForm({
  subjects,
  topics,
  defaultSubjectId,
  defaultTopicId,
}: UploadDocumentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [subjectId, setSubjectId] = useState(
    defaultSubjectId || (subjects[0]?.id ?? "")
  );
  const [topicId, setTopicId] = useState(defaultTopicId ?? "");
  const [selectedFilename, setSelectedFilename] = useState("");
  const [selectedMimeType, setSelectedMimeType] = useState("application/pdf");
  const [selectedSizeBytes, setSelectedSizeBytes] = useState(0);
  const [headerSignature, setHeaderSignature] = useState("%PDF-1.7");
  const [simulateStorageFailure, setSimulateStorageFailure] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const availableTopics = topics.filter((t) => t.subjectId === subjectId);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFilename("");
      setSelectedSizeBytes(0);
      return;
    }

    setSelectedFilename(file.name);
    setSelectedMimeType(file.type || "application/pdf");
    setSelectedSizeBytes(file.size);

    try {
      const headerSlice = file.slice(0, 8);
      const text = await headerSlice.text();
      setHeaderSignature(text);
    } catch {
      setHeaderSignature("%PDF-1.7");
    }
  }

  function handleQuickDemoSelect() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedFilename(`apunte-estudio-${Date.now().toString().slice(-4)}.pdf`);
    setSelectedMimeType("application/pdf");
    setSelectedSizeBytes(1_450_000);
    setHeaderSignature("%PDF-1.7");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!subjectId) {
      setErrorMessage("Debes seleccionar una materia propia.");
      return;
    }

    if (!selectedFilename) {
      setErrorMessage(
        "Selecciona un archivo PDF o usa el botón de PDF de prueba."
      );
      return;
    }

    startTransition(async () => {
      const res = await uploadDocumentAction({
        subjectId,
        topicId: topicId || null,
        filename: selectedFilename,
        mimeType: selectedMimeType,
        sizeBytes: selectedSizeBytes,
        headerSignature,
        simulateStorageFailure,
      });

      if (!res.ok) {
        setErrorMessage(res.error.message);
        router.refresh();
        return;
      }

      setSuccessMessage(
        `PDF "${res.data.filename}" almacenado en bucket privado (${res.data.storagePath}).`
      );
      setSelectedFilename("");
      setSelectedSizeBytes(0);
      router.refresh();
    });
  }

  return (
    <Card elevated className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-100">
            Subir documento PDF al bucket privado (study-documents)
          </h2>
          <p className="text-xs text-slate-400">
            Solo formato <code>.pdf</code> (<code>application/pdf</code>, firma{" "}
            <code>%PDF-</code>), hasta{" "}
            {(MAX_PDF_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB por archivo.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleQuickDemoSelect}
        >
          Cargar PDF válido de prueba (1.4 MB)
        </Button>
      </div>

      {errorMessage && (
        <SemanticAlert
          variant="error"
          title="Error en subida de PDF"
          description={errorMessage}
        />
      )}

      {successMessage && (
        <SemanticAlert
          variant="success"
          title="Documento PDF almacenado"
          description={successMessage}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="doc-subject-select"
              className="block text-xs font-semibold text-slate-200"
            >
              Materia asociada *
            </label>
            <select
              id="doc-subject-select"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId("");
              }}
              disabled={Boolean(defaultSubjectId)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100 disabled:opacity-60"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="doc-topic-select"
              className="block text-xs font-semibold text-slate-200"
            >
              Tema específico (opcional)
            </label>
            <select
              id="doc-topic-select"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              disabled={Boolean(defaultTopicId)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100 disabled:opacity-60"
            >
              <option value="">General de la materia</option>
              {availableTopics.map((top) => (
                <option key={top.id} value={top.id}>
                  {top.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 items-center">
          <div className="space-y-1">
            <label
              htmlFor="doc-file-input"
              className="block text-xs font-semibold text-slate-200"
            >
              Seleccionar archivo PDF (máx. 15 MB)
            </label>
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600/20 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-blue-300"
            />
            {selectedFilename && (
              <p className="mt-1 text-xs text-slate-400">
                Archivo preparado:{" "}
                <strong className="text-slate-100">{selectedFilename}</strong> (
                {(selectedSizeBytes / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="pt-2 sm:pt-4">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateStorageFailure}
                onChange={(e) => setSimulateStorageFailure(e.target.checked)}
                className="rounded border-slate-700 bg-[#0B0F19]"
              />
              <span>
                Simular fallo de Storage (probar estado <code>failed</code> y
                reintento idempotente sin duplicados)
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isPending}
          >
            {isPending
              ? "Subiendo a Storage privado..."
              : "Subir PDF al bucket privado"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
