"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { validateLoginInput } from "@/domain/auth/auth.rules";
import { loginAction } from "@/features/auth/auth.actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("valentina.gomez@estudio.edu.ar");
  const [password, setPassword] = React.useState("estudio1234");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const clientCheck = validateLoginInput({ email, password });
    if (!clientCheck.ok) {
      setErrorMessage(clientCheck.error.message);
      return;
    }

    setLoading(true);
    try {
      const result = await loginAction({ email, password });
      if (!result.ok) {
        if (result.error.code === "SUPABASE_NOT_CONFIGURED") {
          setInfoMessage(
            "Modo local sin credenciales en .env.local detectado: redirigiendo al entorno autenticado de demostración."
          );
          router.push("/app");
          return;
        }
        setErrorMessage(result.error.message);
        return;
      }

      router.push("/app");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage && (
        <SemanticAlert
          variant="error"
          title="Error al iniciar sesión"
          description={errorMessage}
        />
      )}

      {infoMessage && (
        <SemanticAlert
          variant="info"
          title="Acceso en modo demostración local"
          description={infoMessage}
        />
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-xs font-semibold text-slate-200"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-200"
          >
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Verificando credenciales..." : "Entrar al espacio de estudio"}
      </Button>
    </form>
  );
}
