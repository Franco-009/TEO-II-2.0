"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, Menu, X } from "lucide-react";
import { PUBLIC_NAV_ITEMS } from "@/config/navigation";
import { Button } from "@/components/ui/Button";

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#0B0F19]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <BookOpenCheck className="h-4 w-4" aria-hidden={true} />
            </span>
            <span>StudyPlay</span>
            <span className="rounded-md bg-violet-950/80 border border-violet-500/40 px-2 py-0.5 text-[11px] font-medium text-violet-300">
              v1.0
            </span>
          </Link>

          <nav aria-label="Navegación pública" className="hidden md:flex items-center gap-1">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-slate-800 text-blue-400"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/app"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white"
            >
              Demo App Autenticada
            </Link>
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-2.5">
          <Button href="/login" variant="ghost" size="sm">
            Iniciar sesión
          </Button>
          <Button href="/register" variant="primary" size="sm">
            Crear cuenta gratis
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          className="inline-flex md:hidden items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-200"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden={true} />
          ) : (
            <Menu className="h-5 w-5" aria-hidden={true} />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-800 bg-[#111827] px-4 py-4 md:hidden space-y-3">
          <nav aria-label="Navegación móvil pública" className="flex flex-col gap-1">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/app"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-blue-400 hover:bg-slate-800"
            >
              Ir al Dashboard (Demo Fase 1)
            </Link>
          </nav>
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <Button href="/login" variant="secondary" size="sm">
              Iniciar sesión
            </Button>
            <Button href="/register" variant="primary" size="sm">
              Crear cuenta gratis
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
