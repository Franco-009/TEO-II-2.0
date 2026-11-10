import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-8">
      <Card elevated className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <StatusBadge
            variant="info"
            label="Autenticación Supabase Auth + Sesión SSR"
          />
          <h1 className="text-2xl font-bold text-slate-50 pt-1">
            Iniciar sesión en StudyPlay
          </h1>
          <p className="text-sm text-slate-400">
            Ingresa tus credenciales para acceder a tu biblioteca privada y progreso.
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-xs text-slate-400">
          ¿Aún no tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-400 hover:underline"
          >
            Regístrate gratis
          </Link>
        </p>
      </Card>
    </div>
  );
}
