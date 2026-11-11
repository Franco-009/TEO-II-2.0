"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DocumentEntity } from "@/domain/documents/documents.types";
import type {
  ContentStatus,
  QuestionDifficulty,
  QuestionType,
} from "@/domain/models/studyplay";
import type { QuestionOptionInput } from "@/domain/questions/questions.types";
import { createQuestionAction } from "../questions.actions";

export interface QuestionEditorFormProps {
  subjectId: string;
  topicId: string;
  availableDocuments: DocumentEntity[];
}

const DEFAULT_SINGLE_CHOICE_OPTIONS: QuestionOptionInput[] = [
  {
    text: "",
    isCorrect: true,
    feedback: "",
    sortOrder: 1,
  },
  {
    text: "",
    isCorrect: false,
    feedback: "",
    sortOrder: 2,
  },
];

const DEFAULT_TRUE_FALSE_OPTIONS: QuestionOptionInput[] = [
  {
    text: "Verdadero",
    isCorrect: true,
    feedback: "Correcto: la afirmación es verdadera.",
    sortOrder: 1,
  },
  {
    text: "Falso",
    isCorrect: false,
    feedback: "Incorrecto: revisá la explicación general.",
    sortOrder: 2,
  },
];

export function QuestionEditorForm({
  subjectId,
  topicId,
  availableDocuments,
}: QuestionEditorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<QuestionType>("single_choice");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("medium");
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [sourceDocumentId, setSourceDocumentId] = useState<string>("");
  const [sourcePage, setSourcePage] = useState<string>("");
  const [options, setOptions] = useState<QuestionOptionInput[]>(
    DEFAULT_SINGLE_CHOICE_OPTIONS
  );
  const [previewMode, setPreviewMode] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectableDocs = availableDocuments.filter(
    (d) => d.status === "available"
  );

  function handleTypeChange(nextType: QuestionType) {
    setType(nextType);
    setErrorMessage(null);
    if (nextType === "true_false") {
      setOptions(DEFAULT_TRUE_FALSE_OPTIONS.map((o) => ({ ...o })));
    } else if (type === "true_false") {
      setOptions([
        { text: "", isCorrect: true, feedback: "", sortOrder: 1 },
        { text: "", isCorrect: false, feedback: "", sortOrder: 2 },
      ]);
    } else if (nextType === "single_choice") {
      // Asegurar que solo quede 1 marcada como correcta al pasar de multiple_select a single_choice
      let foundFirstCorrect = false;
      setOptions((prev) =>
        prev.map((opt) => {
          if (opt.isCorrect && !foundFirstCorrect) {
            foundFirstCorrect = true;
            return opt;
          }
          return { ...opt, isCorrect: false };
        })
      );
    }
  }

  function handleOptionTextChange(index: number, text: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  }

  function handleOptionFeedbackChange(index: number, feedback: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, feedback } : opt))
    );
  }

  function handleToggleCorrect(index: number) {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (type === "single_choice" || type === "true_false") {
          return { ...opt, isCorrect: i === index };
        }
        return i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt;
      })
    );
  }

  function handleAddOption() {
    if (type === "true_false") return;
    setOptions((prev) => [
      ...prev,
      {
        text: "",
        isCorrect: false,
        feedback: "",
        sortOrder: prev.length + 1,
      },
    ]);
  }

  function handleRemoveOption(index: number) {
    if (type === "true_false" || options.length <= 2) return;
    setOptions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((opt, idx) => ({ ...opt, sortOrder: idx + 1 }))
    );
  }

  function handleLoadDemoQuestion() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setType("single_choice");
    setDifficulty("medium");
    setPrompt(
      "¿Qué transporte tubular renal permite reabsorber prácticamente el 100% de la glucosa filtrada en condiciones fisiológicas?"
    );
    setExplanation(
      "En el túbulo contorneado proximal, los cotransportadores sodio-glucosa (SGLT2 en S1 y SGLT1 en S3) reabsorben la glucosa acoplada al gradiente de Na+ mantenido por la bomba Na+/K+-ATPasa basolateral."
    );
    if (selectableDocs[0]) {
      setSourceDocumentId(selectableDocs[0].id);
      setSourcePage("18");
    }
    setOptions([
      {
        text: "Cotransporte activo secundario SGLT2/SGLT1 acoplado a Na+ en el túbulo proximal",
        isCorrect: true,
        feedback:
          "Correcto: aprovecha el gradiente electroquímico de Na+ en la membrana apical proximal.",
        sortOrder: 1,
      },
      {
        text: "Difusión simple pasiva en el asa ascendente gruesa de Henle",
        isCorrect: false,
        feedback:
          "Incorrecto: la glucosa es hidrofílica y su reabsorción ocurre en el túbulo proximal.",
        sortOrder: 2,
      },
      {
        text: "Secreción regulada por aldosterona en el túbulo colector cortical",
        isCorrect: false,
        feedback:
          "Incorrecto: la aldosterona regula canales ENaC y secreción de K+, no el transporte de glucosa.",
        sortOrder: 3,
      },
    ]);
  }

  function submitWithStatus(targetStatus: ContentStatus) {
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedPage =
      sourcePage.trim() !== "" ? Number(sourcePage.trim()) : null;

    startTransition(async () => {
      const res = await createQuestionAction({
        subjectId,
        input: {
          topicId,
          type,
          prompt,
          explanation,
          difficulty,
          status: targetStatus,
          sourceDocumentId: sourceDocumentId || null,
          sourcePage: parsedPage,
          options,
        },
      });

      if (!res.ok) {
        setErrorMessage(res.error.message);
        return;
      }

      setSuccessMessage(
        targetStatus === "published"
          ? `Pregunta publicada exitosamente (v${res.data.version}). Ya está activa para cuestionarios.`
          : `Pregunta guardada en borrador (draft, v${res.data.version}).`
      );
      setPrompt("");
      setExplanation("");
      setSourcePage("");
      setOptions(
        type === "true_false"
          ? DEFAULT_TRUE_FALSE_OPTIONS.map((o) => ({ ...o }))
          : DEFAULT_SINGLE_CHOICE_OPTIONS.map((o) => ({ ...o }))
      );
      setPreviewMode(false);
      router.refresh();
    });
  }

  return (
    <Card elevated className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            Editor Determinista de Preguntas (v1)
          </h3>
          <p className="text-xs text-slate-400">
            Soporta <code>single_choice</code>, <code>true_false</code> y{" "}
            <code>multiple_select</code> con explicación general, feedback por
            opción y vínculo opcional a PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLoadDemoQuestion}
          >
            Cargar ejemplo válido
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPreviewMode((prev) => !prev)}
          >
            {previewMode ? "Volver al editor" : "Vista previa estudiante"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <SemanticAlert
          variant="error"
          title="Validación del editor de preguntas"
          description={errorMessage}
        />
      )}

      {successMessage && (
        <SemanticAlert
          variant="success"
          title="Pregunta registrada"
          description={successMessage}
        />
      )}

      {previewMode ? (
        <div className="rounded-xl border border-blue-500/40 bg-[#0B0F19] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge
              variant="info"
              label={`Vista previa como estudiante • ${type} • Dificultad: ${difficulty}`}
            />
            <span className="text-xs text-slate-400">
              Así verá el alumno la pregunta y su devolución determinista
            </span>
          </div>

          <p className="text-base font-semibold text-slate-100">
            {prompt.trim() || "(Sin enunciado cargado aún)"}
          </p>

          <ul className="space-y-2">
            {options.map((opt, idx) => (
              <li
                key={idx}
                className={`rounded-lg border p-3 text-xs space-y-1 ${
                  opt.isCorrect
                    ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-100"
                    : "border-slate-800 bg-slate-900/70 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2 font-medium">
                  <span>{opt.text || `(Opción #${idx + 1} vacía)`}</span>
                  {opt.isCorrect ? (
                    <StatusBadge variant="success" label="Correcta" />
                  ) : (
                    <StatusBadge variant="error" label="Distractor" />
                  )}
                </div>
                {opt.feedback && (
                  <p className="text-slate-400">{opt.feedback}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
            <strong className="text-slate-100">Explicación general: </strong>
            {explanation.trim() || "(Falta explicación general para publicar)"}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2 space-y-1">
              <label
                htmlFor="q-type-select"
                className="block text-xs font-semibold text-slate-200"
              >
                Tipo de pregunta *
              </label>
              <select
                id="q-type-select"
                value={type}
                onChange={(e) =>
                  handleTypeChange(e.target.value as QuestionType)
                }
                className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100"
              >
                <option value="single_choice">
                  Opción única (single_choice — &gt;=2 opciones, 1 correcta)
                </option>
                <option value="true_false">
                  Verdadero / Falso (true_false — 2 opciones fijas, 1 correcta)
                </option>
                <option value="multiple_select">
                  Selección múltiple (multiple_select — &gt;=1 correcta y &gt;=1
                  incorrecta)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="q-difficulty-select"
                className="block text-xs font-semibold text-slate-200"
              >
                Dificultad
              </label>
              <select
                id="q-difficulty-select"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as QuestionDifficulty)
                }
                className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100"
              >
                <option value="easy">Fácil (easy)</option>
                <option value="medium">Media (medium)</option>
                <option value="hard">Alta (hard)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="q-source-page"
                className="block text-xs font-semibold text-slate-200"
              >
                Página PDF (opcional)
              </label>
              <input
                id="q-source-page"
                type="number"
                min={1}
                value={sourcePage}
                onChange={(e) => setSourcePage(e.target.value)}
                placeholder="Ej. 14"
                className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="q-source-doc"
              className="block text-xs font-semibold text-slate-200"
            >
              Documento PDF fuente opcional (si se elimina en el futuro, la
              pregunta se preserva como &quot;Fuente no disponible&quot;)
            </label>
            <select
              id="q-source-doc"
              value={sourceDocumentId}
              onChange={(e) => setSourceDocumentId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-sm text-slate-100"
            >
              <option value="">Sin documento PDF vinculado</option>
              {selectableDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename} ({(doc.sizeBytes / (1024 * 1024)).toFixed(1)}{" "}
                  MB)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="q-prompt-input"
              className="block text-xs font-semibold text-slate-200"
            >
              Enunciado de la pregunta (prompt) *
            </label>
            <textarea
              id="q-prompt-input"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Escribe la consigna clara y sin ambigüedad..."
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Opciones de respuesta y feedback individual ({options.length})
              </span>
              {type !== "true_false" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddOption}
                >
                  + Agregar opción
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 space-y-2 ${
                    opt.isCorrect
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-slate-800 bg-[#0B0F19]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                      <input
                        type={type === "multiple_select" ? "checkbox" : "radio"}
                        name="question-correct-option"
                        checked={opt.isCorrect}
                        onChange={() => handleToggleCorrect(idx)}
                      />
                      <span>
                        Opción #{idx + 1}{" "}
                        {opt.isCorrect ? "(Correcta ✓)" : "(Distractor)"}
                      </span>
                    </label>

                    {type !== "true_false" && options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Quitar opción
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={opt.text}
                      disabled={type === "true_false"}
                      onChange={(e) =>
                        handleOptionTextChange(idx, e.target.value)
                      }
                      placeholder={`Texto de la opción #${idx + 1}...`}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 disabled:opacity-75"
                    />
                    <input
                      type="text"
                      value={opt.feedback ?? ""}
                      onChange={(e) =>
                        handleOptionFeedbackChange(idx, e.target.value)
                      }
                      placeholder="Feedback específico al elegir esta opción (opcional)..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="q-explanation-input"
              className="block text-xs font-semibold text-slate-200"
            >
              Explicación general guardada (obligatoria para publicar en{" "}
              <code>published</code>) *
            </label>
            <textarea
              id="q-explanation-input"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explica el fundamento conceptual por el cual la respuesta es correcta..."
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => submitWithStatus("draft")}
        >
          {isPending ? "Guardando..." : "Guardar como borrador (draft)"}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isPending}
          onClick={() => submitWithStatus("published")}
        >
          {isPending ? "Publicando..." : "Validar y publicar (published)"}
        </Button>
      </div>
    </Card>
  );
}
