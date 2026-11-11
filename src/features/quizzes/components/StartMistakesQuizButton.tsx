"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { startQuizAction } from "../quizzes.actions";

export interface StartMistakesQuizButtonProps {
  subjectId: string;
  label?: string;
}

export function StartMistakesQuizButton({
  subjectId,
  label = "Iniciar sesión de repaso de errores",
}: StartMistakesQuizButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleStart() {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await startQuizAction({
        subjectId,
        mode: "mistakes",
        questionCount: 10,
      });

      if (!res.ok) {
        setErrorMessage(res.error.message);
        return;
      }

      router.push(`/app/quizzes/${res.data.session.id}`);
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={isPending}
        onClick={handleStart}
      >
        {isPending ? "Preparando repaso..." : label}
      </Button>
      {errorMessage && (
        <SemanticAlert
          variant="warning"
          title="Modo Repaso de Errores"
          description={errorMessage}
        />
      )}
    </div>
  );
}
