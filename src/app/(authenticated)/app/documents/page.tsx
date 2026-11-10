import React from "react";
import { listMyDocumentsUseCase } from "@/application/documents/documents.use-cases";
import { listMySubjectsUseCase } from "@/application/subjects/subjects.use-cases";
import { PageHeader } from "@/components/ui/PageHeader";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViewStateSimulator } from "@/components/ui/ViewStateSimulator";
import { APP_CONFIG } from "@/config/env";
import type { TopicEntity } from "@/domain/topics/topics.types";
import { DocumentListCard } from "@/features/documents/components/DocumentListCard";
import { UploadDocumentForm } from "@/features/documents/components/UploadDocumentForm";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseDocumentsRepository } from "@/infrastructure/supabase/supabase-documents.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function DocumentsPage() {
  const maxMb = (APP_CONFIG.maxPdfSizeBytes / (1024 * 1024)).toFixed(0);
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const docsRepo = new SupabaseDocumentsRepository();

  const [subjectsRes, docsRes] = await Promise.all([
    listMySubjectsUseCase(subjectsRepo, actor),
    listMyDocumentsUseCase(docsRepo, actor),
  ]);

  const subjects = subjectsRes.ok ? subjectsRes.data : [];
  const documents = docsRes.ok ? docsRes.data : [];

  const allTopics: TopicEntity[] = [];
  for (const sub of subjects) {
    const tRes = await topicsRepo.listBySubject(sub.id);
    if (tRes.ok) {
      allTopics.push(...tRes.data);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de Documentos PDF Privados"
        description={`Sube tus apuntes y guías en formato PDF (máximo ${maxMb} MB por archivo) almacenados en el bucket privado study-documents con acceso por URL firmada temporal (5 min).`}
        badge={<StatusBadge variant="info" label="Storage Privado RLS" />}
      />

      <SemanticAlert
        variant="warning"
        title="Regla de integridad al eliminar un PDF"
        description="Si eliminas un documento PDF, el objeto se borra de study-documents pero las preguntas vinculadas NO se borran: su referencia pasa automáticamente a document_id = NULL indicando 'Fuente no disponible'."
      />

      <UploadDocumentForm subjects={subjects} topics={allTopics} />

      <ViewStateSimulator
        title="tus documentos PDF"
        emptyTitle="No has subido apuntes PDF todavía"
        emptyDescription={`Puedes asociar archivos PDF de hasta ${maxMb} MB (application/pdf) a tus materias y temas privados.`}
        emptyActionLabel="Ir a mis materias"
        emptyActionHref="/app/subjects"
      >
        <DocumentListCard documents={documents} />
      </ViewStateSimulator>
    </div>
  );
}
