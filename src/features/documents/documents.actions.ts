"use server";

import { revalidatePath } from "next/cache";
import {
  deleteDocumentUseCase,
  getSignedDocumentUrlUseCase,
  uploadDocumentUseCase,
} from "@/application/documents/documents.use-cases";
import type {
  DocumentEntity,
  DocumentResult,
  SignedDocumentUrl,
  UploadDocumentInput,
} from "@/domain/documents/documents.types";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabasePrivateStorageAdapter } from "@/infrastructure/storage/supabase-private-storage.adapter";
import { SupabaseDocumentsRepository } from "@/infrastructure/supabase/supabase-documents.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export async function uploadDocumentAction(
  input: UploadDocumentInput
): Promise<DocumentResult<DocumentEntity>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const docsRepo = new SupabaseDocumentsRepository();
  const storagePort = new SupabasePrivateStorageAdapter();

  const result = await uploadDocumentUseCase({
    subjectsRepo,
    topicsRepo,
    docsRepo,
    storagePort,
    actor,
    input,
  });

  revalidatePath("/app/documents");
  if (input.subjectId) {
    revalidatePath(`/app/subjects/${input.subjectId}`);
  }
  if (input.topicId) {
    revalidatePath(`/app/topics/${input.topicId}`);
  }

  return result;
}

export async function retryDocumentUploadAction(params: {
  documentId: string;
  subjectId: string;
}): Promise<DocumentResult<DocumentEntity>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const docsRepo = new SupabaseDocumentsRepository();
  const storagePort = new SupabasePrivateStorageAdapter();

  const result = await uploadDocumentUseCase({
    subjectsRepo,
    topicsRepo,
    docsRepo,
    storagePort,
    actor,
    input: {
      subjectId: params.subjectId,
      filename: "retry.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      headerSignature: "%PDF-1.7",
      retryDocumentId: params.documentId,
      simulateStorageFailure: false,
    },
  });

  revalidatePath("/app/documents");
  revalidatePath(`/app/subjects/${params.subjectId}`);

  return result;
}

export async function getSignedDocumentUrlAction(
  documentId: string
): Promise<DocumentResult<SignedDocumentUrl>> {
  const actor = await resolveServerActorContext();
  const docsRepo = new SupabaseDocumentsRepository();
  const storagePort = new SupabasePrivateStorageAdapter();

  return getSignedDocumentUrlUseCase({
    docsRepo,
    storagePort,
    actor,
    documentId,
  });
}

export async function deleteDocumentAction(params: {
  documentId: string;
  subjectId: string;
  topicId?: string | null;
}): Promise<
  DocumentResult<{
    deleted: true;
    preservedLinkedQuestions: number;
  }>
> {
  const actor = await resolveServerActorContext();
  const docsRepo = new SupabaseDocumentsRepository();
  const storagePort = new SupabasePrivateStorageAdapter();

  const result = await deleteDocumentUseCase({
    docsRepo,
    storagePort,
    actor,
    documentId: params.documentId,
  });

  if (result.ok) {
    revalidatePath("/app/documents");
    revalidatePath(`/app/subjects/${params.subjectId}`);
    if (params.topicId) {
      revalidatePath(`/app/topics/${params.topicId}`);
    }
  }

  return result;
}
