"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import type { QuizMode } from "@/domain/models/studyplay";
import type { SubjectEntity } from "@/domain/subjects/subjects.types";
import type { TopicEntity } from "@/domain/topics/topics.types";
import { startQuizAction } from "../quizzes.actions";

export interface StartQuizFormProps {
  subjects: SubjectEntity[];
  topics: TopicEntity[];
  defaultSubjectId?: string;
  defaultTopicId?: string;
  defaultMode?: QuizMode;
}

export function StartQuizForm({
  subjects,
  topics,
  defaultSubjectId,
  defaultTopicId,
  defaultMode = "practice",
}: StartQuizFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const publishedSubjects = subjects.filter((s) => s.status === "published");
  const initialSubjectId =
    defaultSubjectId ||
    publishedSubjects[0]?.id ||
    subjects[0]?.id ||
    "subj-anatomia";

  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [topicId, setTopicId] = useState(defaultTopicId ?? "");
  const [mode, setMode] = useState<QuizMode>(defaultMode);
  const [questionCount, setQuestionCount] = useState(10);
  const [seed, setSeed] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableTopics = topics.filter((t) => t.subjectId === subjectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await startQuizAction({
        subjectId,
        topicId: topicId || null,
        mode,
        questionCount,
        seed: seed.trim() || undefined,
      });

      if (!res.ok) {
        setErrorMessage(res.error.message);
        return;
      }

      router.push(`/app/quizzes/${res.data.session.id}`);
    });
  }

  return (
    <Card elevated className="p-6 space-y-5">
      {errorMessage && (
        <SemanticAlert
          variant="error"
          title="No se pudo iniciar la partida"
          description={errorMessage}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="subjectId"
              className="block text-xs font-semibold text-slate-200"
            >
              Materia (solo estado published)
            </label>
            <select
              id="subjectId"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId("");
              }}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            >
              {publishedSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}{" "}
                  {s.visibility === "public"
                    ? "(Catálogo Público)"
                    : "(Privada)"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="topicId"
              className="block text-xs font-semibold text-slate-200"
            >
              Tema específico (opcional)
            </label>
            <select
              id="topicId"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            >
              <option value="">Todos los temas publicados de la materia</option>
              {availableTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="space-y-2.5">
          <legend className="text-xs font-semibold text-slate-200">
            Modo de Cuestionario (mode)
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label
              onClick={() => setMode("practice")}
              className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                mode === "practice"
                  ? "border-blue-500/60 bg-blue-950/30"
                  : "border-slate-700 bg-[#0B0F19]"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="quizMode"
                  checked={mode === "practice"}
                  onChange={() => setMode("practice")}
                />
                <span className="text-xs font-bold text-blue-300">
                  Práctica (practice)
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                Devolución inmediata opción por opción tras cada respuesta.
              </span>
            </label>

            <label
              onClick={() => setMode("challenge")}
              className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                mode === "challenge"
                  ? "border-violet-500/60 bg-violet-950/30"
                  : "border-slate-700 bg-[#0B0F19]"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="quizMode"
                  checked={mode === "challenge"}
                  onChange={() => setMode("challenge")}
                />
                <span className="text-xs font-bold text-violet-300">
                  Desafío (challenge)
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                Tiempo medido y puntaje global al cerrar la sesión (+XP extra).
              </span>
            </label>

            <label
              onClick={() => setMode("mistakes")}
              className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                mode === "mistakes"
                  ? "border-amber-500/60 bg-amber-950/30"
                  : "border-slate-700 bg-[#0B0F19]"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="quizMode"
                  checked={mode === "mistakes"}
                  onChange={() => setMode("mistakes")}
                />
                <span className="text-xs font-bold text-amber-300">
                  Errores (mistakes)
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                Filtra exclusivamente preguntas falladas en intentos previos sin
                borrar historial.
              </span>
            </label>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="questionCount"
              className="block text-xs font-semibold text-slate-200"
            >
              Cantidad máxima de preguntas
            </label>
            <select
              id="questionCount"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            >
              <option value={5}>5 preguntas (Repaso rápido)</option>
              <option value={10}>10 preguntas (Sesión estándar)</option>
              <option value={20}>20 preguntas (Simulacro completo)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="quizSeed"
              className="block text-xs font-semibold text-slate-200"
            >
              Semilla determinista opcional (seed)
            </label>
            <input
              id="quizSeed"
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Automática (o ingresa ej. parcial-1 para orden reproducible)"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button href="/app" variant="ghost">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Creando sesión..." : "Comenzar partida ahora"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
