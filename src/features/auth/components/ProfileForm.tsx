"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import type { UserRole } from "@/domain/models/studyplay";
import {
  logoutAction,
  updateProfileAction,
} from "@/features/auth/auth.actions";

export interface ProfileFormProps {
  userId: string;
  initialDisplayName: string;
  email: string;
  role: UserRole;
  dailyGoalQuestions: number;
}

export function ProfileForm({
  userId,
  initialDisplayName,
  email,
  role,
  dailyGoalQuestions,
}: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState(initialDisplayName);
  const [saving, setSaving] = React.useState(false);
  const [statusAlert, setStatusAlert] = React.useState<{
    variant: "success" | "error" | "info";
    title: string;
    description: string;
  } | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusAlert(null);
    setSaving(true);

    try {
      const result = await updateProfileAction({
        actorId: userId,
        actorRole: role,
        targetUserId: userId,
        displayName,
      });

      if (!result.ok) {
        if (result.error.code === "SUPABASE_NOT_CONFIGURED") {
          setStatusAlert({
            variant: "success",
            title: "Perfil validado en modo local",
            description: `Nombre '${displayName.trim()}' validado por las reglas de dominio (rol '${role}' protegido en servidor).`,
          });
          return;
        }

        setStatusAlert({
          variant: "error",
          title: "No se pudo guardar el perfil",
          description: result.error.message,
        });
        return;
      }

      setStatusAlert({
        variant: "success",
        title: "Perfil actualizado",
        description: `Se guardó el nombre '${result.data.displayName}'.`,
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-4" noValidate>
      {statusAlert && (
        <SemanticAlert
          variant={statusAlert.variant}
          title={statusAlert.title}
          description={statusAlert.description}
        />
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="displayName"
          className="block text-xs font-semibold text-slate-200"
        >
          Nombre para mostrar (display_name)
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-200"
          >
            Correo de cuenta
          </label>
          <input
            id="email"
            type="email"
            disabled
            value={email}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="serverRole"
            className="block text-xs font-semibold text-slate-200"
          >
            Rol en servidor (inmutable por cliente)
          </label>
          <input
            id="serverRole"
            type="text"
            disabled
            value={role}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-violet-300 font-semibold"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="dailyGoal"
          className="block text-xs font-semibold text-slate-200"
        >
          Meta diaria de preguntas respondidas
        </label>
        <select
          id="dailyGoal"
          defaultValue={String(dailyGoalQuestions)}
          className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
        >
          <option value="10">10 preguntas por día</option>
          <option value="20">20 preguntas por día (Recomendado)</option>
          <option value="40">40 preguntas por día (Intensivo)</option>
        </select>
      </div>

      <SemanticAlert
        variant="info"
        title="Seguridad de Roles y RLS (docs/05-SEGURIDAD-RLS.md)"
        description="El campo role ('user' | 'admin') está protegido por política RLS WITH CHECK y trigger BEFORE UPDATE en PostgreSQL. Ningún usuario puede auto-asignarse rol admin."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando..." : "Guardar preferencias"}
        </Button>
      </div>
    </form>
  );
}
