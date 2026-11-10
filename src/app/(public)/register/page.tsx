import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md py-8">
      <Card elevated className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <StatusBadge
            variant="info"
            label="Registro seguro (Rol inicial en servidor: user)"
          />
          <h1 className="text-2xl font-bold text-slate-50 pt-1">
            Crear cuenta en StudyPlay
          </h1>
          <p className="text-sm text-slate-400">
            Tu espacio privado estará protegido con aislamiento por usuario (RLS).
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-xs text-slate-400">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-400 hover:underline"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </Card>
    </div>
  );
}
