"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { label: "Resumen de Administración", href: "/admin" },
  { label: "Cola de Publicación y Moderación", href: "/admin/content" },
];

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Subnavegación de administración"
      className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3"
    >
      {adminLinks.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-violet-600 text-white"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
