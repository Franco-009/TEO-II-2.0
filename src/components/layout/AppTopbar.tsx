"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, Sparkles, User, X } from "lucide-react";
import { APP_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/config/navigation";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";

export function AppTopbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#111827]/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
            className="inline-flex lg:hidden items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200"
          >
            {drawerOpen ? (
              <X className="h-5 w-5" aria-hidden={true} />
            ) : (
              <Menu className="h-5 w-5" aria-hidden={true} />
            )}
          </button>
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">
            Entorno autenticado de prueba (Fase 1)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-3 py-1 text-xs font-semibold text-amber-300"
            title="Racha de días estudiando"
          >
            <Flame className="h-3.5 w-3.5" aria-hidden={true} />
            <span>Racha: {MOCK_USER_PROFILE.streakDays} días</span>
          </div>

          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-950/60 px-3 py-1 text-xs font-semibold text-violet-300"
            title="Puntos de experiencia acumulados"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden={true} />
            <span>{MOCK_USER_PROFILE.totalXp} XP</span>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <User className="h-3.5 w-3.5 text-blue-400" aria-hidden={true} />
            <span className="hidden sm:inline">{MOCK_USER_PROFILE.displayName}</span>
          </Link>
        </div>
      </div>

      {drawerOpen && (
        <div className="border-t border-slate-800 bg-[#111827] px-4 py-4 lg:hidden space-y-2">
          <nav aria-label="Menú móvil autenticado" className="flex flex-col gap-1">
            {[...APP_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-blue-600/20 text-blue-300"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
