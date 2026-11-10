import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/supabase-auth.repository";
import { getCurrentProfileUseCase } from "@/application/auth/auth.use-cases";

export default async function ProfilePage() {
  const repo = new SupabaseAuthRepository();
  const profileResult = await getCurrentProfileUseCase(repo);

  const activeProfile =
    profileResult.ok && profileResult.data
      ? {
          id: profileResult.data.id,
          displayName: profileResult.data.displayName,
          email: profileResult.data.email,
          role: profileResult.data.role,
          dailyGoalQuestions: MOCK_USER_PROFILE.dailyGoalQuestions,
        }
      : {
          id: MOCK_USER_PROFILE.id,
          displayName: MOCK_USER_PROFILE.displayName,
          email: MOCK_USER_PROFILE.email,
          role: MOCK_USER_PROFILE.role,
          dailyGoalQuestions: MOCK_USER_PROFILE.dailyGoalQuestions,
        };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Mi Perfil y Preferencias"
        description="Gestiona tus datos personales, objetivo diario de estudio y seguridad de sesión."
        badge={
          <StatusBadge
            variant="neutral"
            label={`Rol verificado en servidor: ${activeProfile.role}`}
          />
        }
      />

      <Card elevated className="p-6 space-y-5">
        <ProfileForm
          userId={activeProfile.id}
          initialDisplayName={activeProfile.displayName}
          email={activeProfile.email}
          role={activeProfile.role}
          dailyGoalQuestions={activeProfile.dailyGoalQuestions}
        />
      </Card>
    </div>
  );
}
