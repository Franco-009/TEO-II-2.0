"use server";

import { revalidatePath } from "next/cache";
import {
  changeQuestionStatusUseCase,
  createQuestionUseCase,
  deleteQuestionUseCase,
  updateQuestionUseCase,
} from "@/application/questions/questions.use-cases";
import type { ContentStatus } from "@/domain/models/studyplay";
import type {
  CreateQuestionInput,
  QuestionEntity,
  QuestionResult,
  UpdateQuestionInput,
} from "@/domain/questions/questions.types";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseDocumentsRepository } from "@/infrastructure/supabase/supabase-documents.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export async function createQuestionAction(params: {
  subjectId: string;
  input: CreateQuestionInput;
}): Promise<QuestionResult<QuestionEntity>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const docsRepo = new SupabaseDocumentsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();

  const result = await createQuestionUseCase({
    subjectsRepo,
    topicsRepo,
    docsRepo,
    questionsRepo,
    actor,
    input: params.input,
  });

  if (result.ok) {
    revalidatePath(`/app/topics/${params.input.topicId}`);
    revalidatePath(`/app/subjects/${params.subjectId}`);
    revalidatePath(`/library/${params.subjectId}`);
    revalidatePath("/app/documents");
  }

  return result;
}

export async function updateQuestionAction(params: {
  questionId: string;
  topicId: string;
  subjectId: string;
  input: UpdateQuestionInput;
}): Promise<QuestionResult<QuestionEntity>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const docsRepo = new SupabaseDocumentsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();

  const result = await updateQuestionUseCase({
    subjectsRepo,
    topicsRepo,
    docsRepo,
    questionsRepo,
    actor,
    questionId: params.questionId,
    input: params.input,
  });

  if (result.ok) {
    revalidatePath(`/app/topics/${params.topicId}`);
    revalidatePath(`/app/subjects/${params.subjectId}`);
    revalidatePath(`/library/${params.subjectId}`);
    revalidatePath("/app/documents");
  }

  return result;
}

export async function changeQuestionStatusAction(params: {
  questionId: string;
  topicId: string;
  subjectId: string;
  status: ContentStatus;
}): Promise<QuestionResult<QuestionEntity>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();

  const result = await changeQuestionStatusUseCase({
    subjectsRepo,
    topicsRepo,
    questionsRepo,
    actor,
    questionId: params.questionId,
    status: params.status,
  });

  if (result.ok) {
    revalidatePath(`/app/topics/${params.topicId}`);
    revalidatePath(`/app/subjects/${params.subjectId}`);
    revalidatePath(`/library/${params.subjectId}`);
  }

  return result;
}

export async function deleteQuestionAction(params: {
  questionId: string;
  topicId: string;
  subjectId: string;
}): Promise<QuestionResult<{ deleted: true }>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();

  const result = await deleteQuestionUseCase({
    subjectsRepo,
    topicsRepo,
    questionsRepo,
    actor,
    questionId: params.questionId,
  });

  if (result.ok) {
    revalidatePath(`/app/topics/${params.topicId}`);
    revalidatePath(`/app/subjects/${params.subjectId}`);
    revalidatePath(`/library/${params.subjectId}`);
    revalidatePath("/app/documents");
  }

  return result;
}
