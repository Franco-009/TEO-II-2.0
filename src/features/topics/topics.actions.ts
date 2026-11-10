"use server";

import { revalidatePath } from "next/cache";
import {
  createTopicUseCase,
  updateTopicUseCase,
} from "@/application/topics/topics.use-cases";
import type { TopicEntity, TopicResult } from "@/domain/topics/topics.types";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export async function createTopicAction(input: {
  subjectId: string;
  parentTopicId: string | null;
  title: string;
  description: string;
  sortOrder: number;
}): Promise<TopicResult<TopicEntity>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();

  const result = await createTopicUseCase(
    subjectsRepo,
    topicsRepo,
    actor,
    input
  );

  if (result.ok) {
    revalidatePath(`/app/subjects/${input.subjectId}`);
  }

  return result;
}

export async function updateTopicOrderAction(params: {
  subjectId: string;
  topicId: string;
  sortOrder: number;
}): Promise<TopicResult<TopicEntity>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();

  const result = await updateTopicUseCase(
    subjectsRepo,
    topicsRepo,
    actor,
    params.topicId,
    { sortOrder: params.sortOrder }
  );

  if (result.ok) {
    revalidatePath(`/app/subjects/${params.subjectId}`);
  }

  return result;
}
