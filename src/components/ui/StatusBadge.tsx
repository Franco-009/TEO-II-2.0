import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { SemanticVariant } from "@/shared/types/ui";
import { cn } from "@/shared/utils/cn";

export interface StatusBadgeProps {
  variant: SemanticVariant;
  /** Etiqueta de texto accesible obligatoria: nunca depender solo del color */
  label: string;
  className?: string;
}

const badgeStyles: Record<SemanticVariant, string> = {
  success:
    "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
  error:
    "bg-rose-950/80 text-rose-300 border-rose-500/40",
  warning:
    "bg-amber-950/80 text-amber-300 border-amber-500/40",
  info:
    "bg-blue-950/80 text-blue-300 border-blue-500/40",
  neutral:
    "bg-violet-950/70 text-violet-300 border-violet-500/40",
};

const badgeIcons: Record<SemanticVariant, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  neutral: Sparkles,
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const Icon = badgeIcons[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeStyles[variant],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden={true} />
      <span>{label}</span>
    </span>
  );
}
