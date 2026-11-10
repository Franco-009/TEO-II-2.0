import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { APP_CONFIG } from "@/config/env";
import { MOCK_DOCUMENTS } from "@/features/mock-data/phase1-fixtures";

export default function DocumentsPage() {
  const maxMb = (APP_CONFIG.maxPdfSizeBytes / (1024 * 1024)).toFixed(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de Documentos PDF Privados"
        description={`Sube tus apuntes y guías en formato PDF (máximo ${maxMb} MB por archivo) almacenados en bucket privado con acceso por URL firmada temporal.`}
        primaryAction={{
          label: `Subir documento PDF (máx. ${maxMb} MB)`,
          href: "/app/subjects",
        }}
        badge={<StatusBadge variant="info" label="Storage Privado RLS" />}
      />

      <SemanticAlert
        variant="warning"
        title="Regla de integridad al eliminar un PDF"
        description="Si eliminas un documento PDF en el futuro, las preguntas vinculadas NO se borran: su referencia pasa automáticamente al estado 'Fuente no disponible' (ON DELETE SET NULL)."
      />

      <ViewStateSimulator
        title="tus documentos PDF"
        emptyTitle="No has subido apuntes PDF todavía"
        emptyDescription={`Puedes asociar archivos PDF de hasta ${maxMb} MB (application/pdf) a tus materias y temas privados.`}
        emptyActionLabel="Ir a mis materias"
        emptyActionHref="/app/subjects"
      >
        <div className="space-y-3">
          {MOCK_DOCUMENTS.map((doc) => (
            <Card
              key={doc.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">
                    {doc.filename}
                  </span>
                  {doc.status === "available" ? (
                    <StatusBadge variant="success" label="Disponible (URL firmada)" />
                  ) : (
                    <StatusBadge
                      variant="warning"
                      label="Fuente no disponible (Archivo eliminado)"
                    />
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Materia: {doc.subjectTitle}{" "}
                  {doc.topicTitle ? `• Tema: ${doc.topicTitle}` : "• General de la materia"}
                </p>
                <p className="text-xs text-slate-300">
                  Tamaño: {(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB • MIME:{" "}
                  {doc.mimeType} • {doc.linkedQuestionsCount} preguntas vinculadas
                </p>
              </div>

              <div className="text-xs text-slate-400 shrink-0">
                Subido el {doc.createdAt}
              </div>
            </Card>
          ))}
        </div>
      </ViewStateSimulator>
    </div>
  );
}
