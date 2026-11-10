import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-800/90 bg-[#0B0F19] py-8 text-xs text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden={true} />
          <span>
            StudyPlay v1.0 — Motor de estudio 100% determinista • Privacidad por diseño (RLS)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/library" className="hover:text-slate-200 transition-colors">
            Catálogo Público
          </Link>
          <Link href="/login" className="hover:text-slate-200 transition-colors">
            Acceso
          </Link>
          <Link href="/app" className="hover:text-slate-200 transition-colors">
            Panel de Estudio
          </Link>
        </div>
      </div>
    </footer>
  );
}
