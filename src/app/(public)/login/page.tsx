import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-8">
      <Card elevated className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <StatusBadge variant="info" label="Fase 1: Vista previa de Autenticación" />
          <h1 className="text-2xl font-bold text-slate-50 pt-1">
            Iniciar sesión en StudyPlay
          </h1>
          <p className="text-sm text-slate-400">
            Ingresa tus credenciales para acceder a tu biblioteca privada y progreso.
          </p>
        </div>

        <form className="space-y-4" action="/app">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-200">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue="valentina.gomez@estudio.edu.ar"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-200">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              defaultValue="••••••••••••"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Entrar al espacio de estudio
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-blue-400 hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </Card>
    </div>
  );
}
