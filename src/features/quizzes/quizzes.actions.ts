"use server";

import { revalidatePath } from "next/cache";
import {
  completeQuizUseCase,
  startQuizUseCase,
  submitAnswerUseCase,
} from "@/application/quizzes/quizzes.use-cases";
import type {
  QuizResult,
  QuizSessionDetail,
  QuizSessionEntity,
  StartQuizInput,
  SubmitAnswerInput,
  SubmitAnswerOutput,
} from "@/domain/quizzes/quizzes.types";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseQuizzesRepository } from "@/infrastructure/supabase/supabase-quizzes.repository";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";

export async function startQuizAction(
  input: StartQuizInput
): Promise<QuizResult<QuizSessionDetail>> {
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const questionsRepo = new SupabaseQuestionsRepository();
  const quizzesRepo = new SupabaseQuizzesRepository();

  const result = await startQuizUseCase({
    subjectsRepo,
    questionsRepo,
    quizzesRepo,
    actor,
    input,
  });

  if (result.ok) {
    revalidatePath(`/app/quizzes/${result.data.session.id}`);
    revalidatePath("/app");
  }

  return result;
}

export async function submitAnswerAction(
  input: SubmitAnswerInput
): Promise<QuizResult<SubmitAnswerOutput>> {
  const actor = await resolveServerActorContext();
  const questionsRepo = new SupabaseQuestionsRepository();
  const quizzesRepo = new SupabaseQuizzesRepository();

  const result = await submitAnswerUseCase({
    questionsRepo,
    quizzesRepo,
    actor,
    input,
  });

  if (result.ok) {
    revalidatePath(`/app/quizzes/${input.sessionId}`);
    revalidatePath(`/app/sessions/${input.sessionId}/result`);
    revalidatePath("/app/review");
  }

  return result;
}

export async function completeQuizAction(
  sessionId: string
): Promise<QuizResult<QuizSessionEntity>> {
  const actor = await resolveServerActorContext();
  const quizzesRepo = new SupabaseQuizzesRepository();

  const result = await completeQuizUseCase({
    quizzesRepo,
    actor,
    sessionId,
  });

  if (result.ok) {
    revalidatePath(`/app/quizzes/${sessionId}`);
    revalidatePath(`/app/sessions/${sessionId}/result`);
    revalidatePath("/app/review");
    revalidatePath("/app");
  }

  return result;
}
