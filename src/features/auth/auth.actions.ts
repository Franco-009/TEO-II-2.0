"use server";

import {
  loginWithPasswordUseCase,
  logoutUserUseCase,
  registerUserUseCase,
  requestPasswordResetUseCase,
  updateOwnProfileUseCase,
} from "@/application/auth/auth.use-cases";
import type { AuthResult, UserProfile } from "@/domain/auth/auth.types";
import type { UserRole } from "@/domain/models/studyplay";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/supabase-auth.repository";

export async function loginAction(formData: {
  email: string;
  password: string;
}): Promise<AuthResult<UserProfile>> {
  const repo = new SupabaseAuthRepository();
  return loginWithPasswordUseCase(repo, formData);
}

export async function registerAction(formData: {
  displayName: string;
  email: string;
  password: string;
}): Promise<AuthResult<UserProfile>> {
  const repo = new SupabaseAuthRepository();
  return registerUserUseCase(repo, formData);
}

export async function forgotPasswordAction(formData: {
  email: string;
}): Promise<AuthResult<{ emailSent: true }>> {
  const repo = new SupabaseAuthRepository();
  return requestPasswordResetUseCase(repo, formData);
}

export async function logoutAction(): Promise<AuthResult<{ signedOut: true }>> {
  const repo = new SupabaseAuthRepository();
  return logoutUserUseCase(repo);
}

export async function updateProfileAction(params: {
  actorId: string;
  actorRole: UserRole;
  targetUserId: string;
  displayName: string;
}): Promise<AuthResult<UserProfile>> {
  const repo = new SupabaseAuthRepository();
  return updateOwnProfileUseCase(
    repo,
    { id: params.actorId, role: params.actorRole },
    params.targetUserId,
    { displayName: params.displayName }
  );
}
