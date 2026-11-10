import React from "react";
import { cn } from "@/shared/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({
  elevated = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        elevated
          ? "bg-[#1E293B]/90 border-slate-700/80 shadow-md shadow-black/20"
          : "bg-[#111827] border-slate-800/90 shadow-sm shadow-black/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
