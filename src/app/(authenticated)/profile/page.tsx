import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { SemanticAlert } from "@/components/ui/SemanticAlert";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";

export default function ProfilePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Mi Perfil y Preferencias"
        description="Gestiona tus datos personales, objetivo diario de estudio y seguridad de sesión."
        badge={
          <StatusBadge
            variant="neutral"
            label={`Rol verificado en servidor: ${MOCK_USER_PROFILE.role}`}
          />
        }
      />

      <Card elevated className="p-6 space-y-5">
        <form className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="block text-xs font-semibold text-slate-200">
              Nombre para mostrar (display_name)
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              defaultValue={MOCK_USER_PROFILE.displayName}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-200">
              Correo de cuenta
            </label>
            <input
              id="email"
              type="email"
              disabled
              defaultValue={MOCK_USER_PROFILE.email}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dailyGoal" className="block text-xs font-semibold text-slate-200">
              Meta diaria de preguntas respondidas
            </label>
            <select
              id="dailyGoal"
              defaultValue={String(MOCK_USER_PROFILE.dailyGoalQuestions)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-sm text-slate-100"
            >
              <option value="10">10 preguntas por día</option>
              <option value="20">20 preguntas por día (Recomendado)</option>
              <option value="40">40 preguntas por día (Intensivo)</option>
            </select>
          </div>

          <SemanticAlert
            variant="info"
            title="Seguridad de Roles (docs/05-SEGURIDAD-RLS.md)"
            description="El campo role ('user' | 'admin') nunca se confía al frontend; se asigna y verifica exclusivamente en servidor y base de datos."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button href="/login" variant="danger" size="sm">
              Cerrar sesión (Demo)
            </Button>
            <Button type="button" variant="primary">
              Guardar preferencias
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
