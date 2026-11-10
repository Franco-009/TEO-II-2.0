"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  BookOpenCheck,
  FileText,
  Globe,
  LayoutDashboard,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  UserCircle2,
} from "lucide-react";
import { APP_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/config/navigation";

const iconMap: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  "/app": LayoutDashboard,
  "/app/subjects": BookMarked,
  "/app/documents": FileText,
  "/app/quizzes/new": PlayCircle,
  "/app/review": RotateCcw,
  "/app/progress": BarChart3,
  "/library": Globe,
  "/profile": UserCircle2,
  "/admin": ShieldAlert,
};

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Menú lateral de estudio"
      className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-800/90 lg:bg-[#111827]"
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-800/90 px-5">
        <Link
          href="/app"
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <BookOpenCheck className="h-4 w-4" aria-hidden={true} />
          </span>
          <span>StudyPlay</span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between overflow-y-auto p-3.5">
        <nav aria-label="Secciones principales" className="space-y-1">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Estudio y Práctica
          </p>
          {APP_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.href] ?? LayoutDashboard;
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600/15 text-blue-300 border border-blue-500/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span className="rounded-full bg-amber-950/90 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <nav aria-label="Cuenta y administración" className="space-y-1 pt-4 border-t border-slate-800/90">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Cuenta y Gestión
          </p>
          {SECONDARY_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.href] ?? UserCircle2;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-violet-600/15 text-violet-300 border border-violet-500/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span className="rounded-full bg-violet-950/90 border border-violet-500/40 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
