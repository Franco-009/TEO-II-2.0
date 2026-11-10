"use server";

import { revalidatePath } from "next/cache";
import {
  createSubjectUseCase,
  updateSubjectUseCase,
} from "@/application/subjects/subjects.use-cases";
import type { ContentStatus } from "@/domain/models/studyplay";
import type {
  SubjectEntity,
  SubjectResult,
} from "@/domain/subjects/subjects.types";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { resolveServerActorContext } from "./actor-context";

export async function createSubjectAction(input: {
  title: string;
  description: string;
  status: ContentStatus;
}): Promise<SubjectResult<SubjectEntity>> {
  const actor = await resolveServerActorContext();
  const repo = new SupabaseSubjectsRepository();

  const result = await createSubjectUseCase(repo, actor, {
    title: input.title,
    description: input.description,
    visibility: "private",
    status: input.status,
  });

  if (result.ok) {
    revalidatePath("/app/subjects");
    revalidatePath("/app");
  }

  return result;
}

export async function updateSubjectStatusAction(params: {
  subjectId: string;
  status: ContentStatus;
}): Promise<SubjectResult<SubjectEntity>> {
  const actor = await resolveServerActorContext();
  const repo = new SupabaseSubjectsRepository();

  const result = await updateSubjectUseCase(repo, actor, params.subjectId, {
    status: params.status,
  });

  if (result.ok) {
    revalidatePath(`/app/subjects/${params.subjectId}`);
    revalidatePath("/app/subjects");
    revalidatePath("/library");
  }

  return result;
}
