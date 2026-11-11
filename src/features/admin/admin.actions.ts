"use server";

import { revalidatePath } from "next/cache";
import {
  createPublicSubjectDraftUseCase,
  moderatePublicSubjectUseCase,
} from "@/application/admin/admin.use-cases";
import type {
  AdminAuditLogEntity,
  AdminResult,
  CreatePublicSubjectDraftInput,
  ModeratePublicSubjectInput,
} from "@/domain/admin/admin.types";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseAdminRepository } from "@/infrastructure/supabase/supabase-admin.repository";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export async function moderatePublicSubjectAction(
  input: ModeratePublicSubjectInput
): Promise<
  AdminResult<{
    subject: SubjectEntity;
    auditLog: AdminAuditLogEntity;
  }>
> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();
  const adminRepo = new SupabaseAdminRepository();

  const result = await moderatePublicSubjectUseCase({
    subjectsRepo,
    topicsRepo,
    questionsRepo,
    adminRepo,
    actor,
    input,
  });

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/content");
    revalidatePath("/library");
    revalidatePath(`/library/${input.subjectId}`);
  }

  return result;
}

export async function createPublicSubjectDraftAction(
  input: CreatePublicSubjectDraftInput
): Promise<
  AdminResult<{
    subject: SubjectEntity;
    auditLog: AdminAuditLogEntity;
  }>
> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const adminRepo = new SupabaseAdminRepository();

  const result = await createPublicSubjectDraftUseCase({
    subjectsRepo,
    adminRepo,
    actor,
    input,
  });

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/content");
    revalidatePath("/library");
  }

  return result;
}
