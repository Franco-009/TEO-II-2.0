import type { UserRole } from "@/domain/models/studyplay";
import type { AuthRepository } from "@/domain/auth/auth.ports";
import {
  validateLoginInput,
  validatePasswordResetInput,
  validateProfileUpdate,
  validateRegistrationInput,
} from "@/domain/auth/auth.rules";
import type {
  AuthResult,
  LoginInput,
  PasswordResetInput,
  RegisterInput,
  UpdateProfileInput,
  UserProfile,
} from "@/domain/auth/auth.types";

export async function registerUserUseCase(
  repo: AuthRepository,
  input: RegisterInput
): Promise<AuthResult<UserProfile>> {
  const validated = validateRegistrationInput(input);
  if (!validated.ok) {
    return validated;
  }

  return repo.signUp(validated.data);
}

export async function loginWithPasswordUseCase(
  repo: AuthRepository,
  input: LoginInput
): Promise<AuthResult<UserProfile>> {
  const validated = validateLoginInput(input);
  if (!validated.ok) {
    return validated;
  }

  return repo.signInWithPassword(validated.data);
}

export async function logoutUserUseCase(
  repo: AuthRepository
): Promise<AuthResult<{ signedOut: true }>> {
  return repo.signOut();
}

export async function requestPasswordResetUseCase(
  repo: AuthRepository,
  input: PasswordResetInput
): Promise<AuthResult<{ emailSent: true }>> {
  const validated = validatePasswordResetInput(input);
  if (!validated.ok) {
    return validated;
  }

  return repo.resetPasswordForEmail(validated.data);
}

export async function getCurrentProfileUseCase(
  repo: AuthRepository
): Promise<AuthResult<UserProfile | null>> {
  return repo.getCurrentSessionProfile();
}

export async function updateOwnProfileUseCase(
  repo: AuthRepository,
  actor: { id: string; role: UserRole },
  targetUserId: string,
  input: UpdateProfileInput
): Promise<AuthResult<UserProfile>> {
  const validated = validateProfileUpdate(actor, targetUserId, input);
  if (!validated.ok) {
    return validated;
  }

  return repo.updateOwnProfile({
    userId: targetUserId,
    displayName: validated.data.displayName,
    avatarPath: validated.data.avatarPath,
  });
}
