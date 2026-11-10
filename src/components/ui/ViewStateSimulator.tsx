"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import type { ViewStateMode } from "@/shared/types/ui";
import { EmptyState } from "./EmptyState";
import { SemanticAlert } from "./SemanticAlert";

export interface ViewStateSimulatorProps {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  children: React.ReactNode;
}

export function ViewStateSimulator({
  title,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  children,
}: ViewStateSimulatorProps) {
  const [mode, setMode] = React.useState<ViewStateMode>("populated");

  return (
    <div className="space-y-4">
      <div
        role="region"
        aria-label={`Selector de estado visual para ${title}`}
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#111827]/90 px-3 py-2 text-xs"
      >
        <span className="text-slate-400 font-medium">
          Vista de prueba UX (estados explícitos):
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "populated", label: "Datos ficticios" },
              { id: "empty", label: "Vacío" },
              { id: "loading", label: "Cargando" },
              { id: "error", label: "Error" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                mode === item.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-slate-800 bg-[#111827] p-10 text-center space-y-3"
        >
          <Loader2
            className="h-7 w-7 animate-spin text-blue-400 mx-auto"
            aria-hidden={true}
          />
          <p className="text-sm font-semibold text-slate-200">
            Estado: Cargando datos de {title}...
          </p>
          <p className="text-xs text-slate-400">
            Verificando permisos y preparando la vista de estudio.
          </p>
        </div>
      )}

      {mode === "empty" && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          actionHref={emptyActionHref}
        />
      )}

      {mode === "error" && (
        <SemanticAlert
          variant="error"
          title={`No se pudo cargar ${title}`}
          description="Ocurrió un error simulado de red o permisos (RLS). Puedes volver al modo con datos ficticios desde el selector superior."
        />
      )}

      {mode === "populated" && children}
    </div>
  );
}
