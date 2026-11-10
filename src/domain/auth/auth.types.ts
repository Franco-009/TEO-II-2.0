import type { UserRole } from "@/domain/models/studyplay";

export type AuthErrorCode =
  | "INVALID_INPUT"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_IN_USE"
  | "WEAK_PASSWORD"
  | "UNAUTHORIZED"
  | "FORBIDDEN_ROLE"
  | "SUPABASE_NOT_CONFIGURED"
  | "UNKNOWN_ERROR";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthError };

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarPath: string | null;
  role: UserRole;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PasswordResetInput {
  email: string;
}

export interface UpdateProfileInput {
  displayName: string;
  avatarPath?: string | null;
  /** Cualquier intento de pasar role desde cliente debe ser rechazado por las reglas de dominio */
  role?: unknown;
}

export type RouteAccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "UNAUTHENTICATED" | "FORBIDDEN_ADMIN" | "ALREADY_AUTHENTICATED";
      redirectTo: string;
    };
