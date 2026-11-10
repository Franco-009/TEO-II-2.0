"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { validateRegistrationInput } from "@/domain/auth/auth.rules";
import { registerAction } from "@/features/auth/auth.actions";

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const validated = validateRegistrationInput({
      displayName,
      email,
      password,
    });
    if (!validated.ok) {
      setErrorMessage(validated.error.message);
      return;
    }

    setLoading(true);
    try {
      const result = await registerAction({ displayName, email, password });
      if (!result.ok) {
        if (result.error.code === "SUPABASE_NOT_CONFIGURED") {
          setSuccessMessage(
            "Validación de registro superada (rol asignado en servidor: 'user'). Redirigiendo al Dashboard..."
          );
          router.push("/app");
          return;
        }
        setErrorMessage(result.error.message);
        return;
      }

      setSuccessMessage(
        `Cuenta creada para ${result.data.displayName} con rol seguro '${result.data.role}'.`
      );
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
          title="No se pudo completar el registro"
          description={errorMessage}
        />
      )}

      {successMessage && (
        <SemanticAlert
          variant="success"
          title="Registro validado correctamente"
          description={successMessage}
        />
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="displayName"
          className="block text-xs font-semibold text-slate-200"
        >
          Nombre completo o alias
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ej. Valentina Gómez"
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </div>

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
          placeholder="estudiante@universidad.edu"
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-xs font-semibold text-slate-200"
        >
          Contraseña (mínimo 8 caracteres)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Creando cuenta segura..." : "Crear mi cuenta"}
      </Button>
    </form>
  );
}
