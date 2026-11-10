import { getCurrentProfileUseCase } from "@/application/auth/auth.use-cases";
import type { ActorContext } from "@/domain/subjects/subjects.types";
import { MOCK_USER_PROFILE } from "@/features/mock-data/phase1-fixtures";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/supabase-auth.repository";

export async function resolveServerActorContext(): Promise<ActorContext> {
  const authRepo = new SupabaseAuthRepository();
  const res = await getCurrentProfileUseCase(authRepo);

  if (res.ok && res.data) {
    return {
      userId: res.data.id,
      role: res.data.role,
    };
  }

  return {
    userId: MOCK_USER_PROFILE.id,
    role: MOCK_USER_PROFILE.role,
  };
}
