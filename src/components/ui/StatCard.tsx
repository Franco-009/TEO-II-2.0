import React from "react";
import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";
import type { SemanticVariant } from "@/shared/types/ui";

export interface StatCardProps {
  label: string;
  value: string;
  helperText: string;
  status?: {
    variant: SemanticVariant;
    label: string;
  };
}

export function StatCard({ label, value, helperText, status }: StatCardProps) {
  return (
    <Card className="p-4 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {status && (
          <StatusBadge variant={status.variant} label={status.label} />
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-50">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      </div>
    </Card>
  );
}
