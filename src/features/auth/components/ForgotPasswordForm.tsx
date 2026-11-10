"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { validatePasswordResetInput } from "@/domain/auth/auth.rules";
import { forgotPasswordAction } from "@/features/auth/auth.actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [sentMessage, setSentMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSentMessage(null);

    const validated = validatePasswordResetInput({ email });
    if (!validated.ok) {
      setErrorMessage(validated.error.message);
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPasswordAction({ email });
      if (!result.ok && result.error.code !== "SUPABASE_NOT_CONFIGURED") {
        setErrorMessage(result.error.message);
        return;
      }

      setSentMessage(
        `Si el correo ${validated.data.email} se encuentra registrado, recibirás un enlace temporal para restablecer tu contraseña.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage && (
        <SemanticAlert
          variant="error"
          title="Correo inválido"
          description={errorMessage}
        />
      )}

      {sentMessage && (
        <SemanticAlert
          variant="success"
          title="Solicitud procesada"
          description={sentMessage}
        />
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="recovery-email"
          className="block text-xs font-semibold text-slate-200"
        >
          Correo electrónico registrado
        </label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="estudiante@universidad.edu"
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
      </Button>
    </form>
  );
}
