import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md py-8 space-y-6">
      <Card elevated className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-slate-50">
            Recuperar contraseña
          </h1>
          <p className="text-sm text-slate-400">
            Te enviaremos un enlace temporal seguro para restablecer tu clave.
          </p>
        </div>

        <form className="space-y-4" action="/login">
          <div className="space-y-1.5">
            <label htmlFor="recovery-email" className="block text-xs font-semibold text-slate-200">
              Correo electrónico registrado
            </label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              required
              placeholder="estudiante@universidad.edu"
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Enviar enlace de recuperación
          </Button>
        </form>

        <SemanticAlert
          variant="info"
          title="Integración Supabase Auth en Fase 2"
          description="En la Fase 2 este formulario disparará el flujo real de recuperación con token firmado."
        />

        <div className="text-center">
          <Link href="/login" className="text-xs font-semibold text-blue-400 hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      </Card>
    </div>
  );
}
