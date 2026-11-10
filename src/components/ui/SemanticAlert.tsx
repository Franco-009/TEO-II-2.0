import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import type { SemanticVariant } from "@/shared/types/ui";
import { cn } from "@/shared/utils/cn";

export interface SemanticAlertProps {
  variant: Exclude<SemanticVariant, "neutral">;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

const alertConfig: Record<
  Exclude<SemanticVariant, "neutral">,
  {
    container: string;
    badgeLabel: string;
    Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  }
> = {
  success: {
    container: "bg-emerald-950/60 border-emerald-500/40 text-emerald-100",
    badgeLabel: "Estado: Acierto / Éxito",
    Icon: CheckCircle2,
  },
  error: {
    container: "bg-rose-950/60 border-rose-500/40 text-rose-100",
    badgeLabel: "Estado: Error / Incorrecta",
    Icon: XCircle,
  },
  warning: {
    container: "bg-amber-950/60 border-amber-500/40 text-amber-100",
    badgeLabel: "Estado: Advertencia",
    Icon: AlertTriangle,
  },
  info: {
    container: "bg-blue-950/60 border-blue-500/40 text-blue-100",
    badgeLabel: "Estado: Información",
    Icon: Info,
  },
};

export function SemanticAlert({
  variant,
  title,
  description,
  className,
  children,
}: SemanticAlertProps) {
  const { container, badgeLabel, Icon } = alertConfig[variant];

  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={cn(
        "rounded-xl border p-4 flex items-start gap-3.5",
        container,
        className
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden={true} />
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {badgeLabel}
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">{description}</p>
        {children && <div className="pt-2">{children}</div>}
      </div>
    </div>
  );
}
