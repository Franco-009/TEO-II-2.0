import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  /** Regla UX: Una única acción primaria clara por pantalla */
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  badge?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  badge,
}: PageHeaderProps) {
  return (
    <header className="border-b border-slate-800/90 pb-5 mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Migas de pan" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            {breadcrumbs.map((crumb, idx) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600" aria-hidden={true} />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-blue-400 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-200 font-medium" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">
              {title}
            </h1>
            {badge}
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">{description}</p>
        </div>

        {primaryAction && (
          <div className="shrink-0">
            {primaryAction.href ? (
              <Button href={primaryAction.href} variant="primary">
                {primaryAction.label}
              </Button>
            ) : (
              <Button onClick={primaryAction.onClick} variant="primary">
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
