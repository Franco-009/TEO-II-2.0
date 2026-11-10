import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md py-8">
      <Card elevated className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <StatusBadge variant="info" label="Registro seguro (Rol inicial: user)" />
          <h1 className="text-2xl font-bold text-slate-50 pt-1">
            Crear cuenta en StudyPlay
          </h1>
          <p className="text-sm text-slate-400">
            Tu espacio privado estará protegido con aislamiento por usuario (RLS).
          </p>
        </div>

        <form className="space-y-4" action="/app">
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="block text-xs font-semibold text-slate-200">
              Nombre completo o alias
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              placeholder="Ej. Valentina Gómez"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-200">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="estudiante@universidad.edu"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-200">
              Contraseña (mínimo 8 caracteres)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Crear mi cuenta
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="font-semibold text-blue-400 hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      </Card>
    </div>
  );
}
