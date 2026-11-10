import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700/80 bg-[#111827]/70 p-8 text-center max-w-xl mx-auto my-4">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/90 text-blue-400 border border-slate-700">
        <FolderOpen className="h-6 w-6" aria-hidden={true} />
      </div>
      <span className="inline-block rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 mb-2">
        Estado vacío
      </span>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <div className="mt-5">
          <Button href={actionHref} variant="primary">
            {actionLabel}
          </Button>
        </div>
      )}
      {actionLabel && !actionHref && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
