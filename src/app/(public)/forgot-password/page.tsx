import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

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

        <ForgotPasswordForm />

        <div className="text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-blue-400 hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </Card>
    </div>
  );
}
