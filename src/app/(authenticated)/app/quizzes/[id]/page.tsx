import React from "react";
import { getQuizSessionDetailsUseCase } from "@/application/quizzes/quizzes.use-cases";
import { MOCK_QUESTIONS, MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { QuizSessionPlayer } from "@/features/quizzes/components/QuizSessionPlayer";
import { resolveServerActorContext } from "@/features/subjects/actor-context";
import { SupabaseQuestionsRepository } from "@/infrastructure/supabase/supabase-questions.repository";
import { SupabaseQuizzesRepository } from "@/infrastructure/supabase/supabase-quizzes.repository";

export default async function ActiveQuizSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await resolveServerActorContext();
  const questionsRepo = new SupabaseQuestionsRepository();
  const quizzesRepo = new SupabaseQuizzesRepository();

  const detailRes = await getQuizSessionDetailsUseCase({
    questionsRepo,
    quizzesRepo,
    actor,
    sessionId: id,
  });

  if (detailRes.ok) {
    return (
      <QuizSessionPlayer
        session={detailRes.data.session}
        questions={detailRes.data.questions}
        initialAttempts={detailRes.data.attempts}
      />
    );
  }

  // Respaldo seguro para rutas estáticas o sesiones de prueba rápidas
  const fallbackQuestions = MOCK_QUESTIONS.filter(
    (q) => q.status === "published"
  ).map((q) => ({
    id: q.id,
    topicId: q.topicId,
    topicTitle: q.topicTitle,
    subjectId: "subj-anatomia",
    subjectTitle: q.subjectTitle,
    authorId: MOCK_USER_PROFILE.id,
    type: q.type,
    prompt: q.prompt,
    explanation: q.explanation,
    difficulty: q.difficulty,
    status: q.status,
    sourceDocumentId: q.sourceDocumentAvailable ? "doc-01" : null,
    sourceDocumentName: q.sourceDocumentName,
    sourceDocumentAvailable: q.sourceDocumentAvailable,
    sourcePage: q.sourcePage,
    version: q.version,
    options: q.options.map((o) => ({
      id: o.id,
      questionId: q.id,
      text: o.text,
      isCorrect: o.isCorrect,
      feedback: o.feedback,
      sortOrder: o.sortOrder,
    })),
    createdAt: "",
    updatedAt: "",
  }));

  return (
    <QuizSessionPlayer
      session={{
        id,
        userId: actor.userId,
        subjectId: "subj-anatomia",
        subjectTitle: "Fisiología y Biofísica",
        mode: "practice",
        settingsJson: {
          questionCount: fallbackQuestions.length,
          seed: "seed-demo",
          topicId: null,
          questionIds: fallbackQuestions.map((q) => q.id),
        },
        status: "in_progress",
        startedAt: new Date().toISOString(),
        completedAt: null,
        score: 0,
        accuracy: 0,
      }}
      questions={fallbackQuestions}
      initialAttempts={[]}
    />
  );
}
