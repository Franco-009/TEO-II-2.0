import React from "react";
import {
  listMySubjectsUseCase,
  listPublicCatalogUseCase,
} from "@/application/subjects/subjects.use-cases";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { QuizMode } from "@/domain/models/studyplay";
import type { TopicEntity } from "@/domain/topics/topics.types";
import { StartQuizForm } from "@/features/quizzes/components/StartQuizForm";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseSubjectsRepository } from "@/infrastructure/supabase/supabase-subjects.repository";
import { SupabaseTopicsRepository } from "@/infrastructure/supabase/supabase-topics.repository";

export default async function NewQuizPage({
  searchParams,
}: {
  searchParams?: Promise<{ subject?: string; topic?: string; mode?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const actor = await resolveServerActorContext();
  const subjectsRepo = new SupabaseSubjectsRepository();
  const topicsRepo = new SupabaseTopicsRepository();

  const [mySubjectsRes, publicSubjectsRes] = await Promise.all([
    listMySubjectsUseCase(subjectsRepo, actor),
    listPublicCatalogUseCase(subjectsRepo),
  ]);

  const allSubjects = [
    ...(mySubjectsRes.ok ? mySubjectsRes.data : []),
    ...(publicSubjectsRes.ok ? publicSubjectsRes.data : []),
  ];

  const allTopics: TopicEntity[] = [];
  for (const sub of allSubjects) {
    const tRes = await topicsRepo.listBySubject(sub.id);
    if (tRes.ok) {
      allTopics.push(...tRes.data);
    }
  }

  const defaultMode: QuizMode =
    resolvedParams.mode === "challenge" || resolvedParams.mode === "mistakes"
      ? resolvedParams.mode
      : "practice";

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Configurar Cuestionario de Práctica"
        description="Elige la materia publicada, el modo de juego (practice, challenge o mistakes) y la cantidad de preguntas con semilla reproducible."
        badge={
          <StatusBadge variant="info" label="Corrección 100% Determinista" />
        }
      />

      <StartQuizForm
        subjects={allSubjects}
        topics={allTopics}
        defaultSubjectId={resolvedParams.subject}
        defaultTopicId={resolvedParams.topic}
        defaultMode={defaultMode}
      />
    </div>
  );
}
