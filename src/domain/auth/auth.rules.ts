import type { UserRole } from "@/domain/models/studyplay";
import type {
  AuthResult,
  LoginInput,
  PasswordResetInput,
  RegisterInput,
  RouteAccessDecision,
  UpdateProfileInput,
} from "./auth.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function validateRegistrationInput(
  input: RegisterInput
): AuthResult<{ email: string; password: string; displayName: string }> {
  const email = input.email?.trim().toLowerCase() ?? "";
  const displayName = input.displayName?.trim() ?? "";
  const password = input.password ?? "";

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Ingresa un correo electrónico con formato válido.",
      },
    };
  }

  if (displayName.length < 1 || displayName.length > 100) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "El nombre para mostrar debe tener entre 1 y 100 caracteres.",
      },
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: {
        code: "WEAK_PASSWORD",
        message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      },
    };
  }

  return {
    ok: true,
    data: { email, password, displayName },
  };
}

export function validateLoginInput(
  input: LoginInput
): AuthResult<{ email: string; password: string }> {
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";

  if (!isValidEmail(email) || password.length === 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Ingresa tu correo electrónico y contraseña.",
      },
    };
  }

  return {
    ok: true,
    data: { email, password },
  };
}

export function validatePasswordResetInput(
  input: PasswordResetInput
): AuthResult<{ email: string }> {
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Ingresa un correo electrónico válido para recuperar tu clave.",
      },
    };
  }

  return {
    ok: true,
    data: { email },
  };
}

/**
 * Valida la actualización del propio perfil y bloquea:
 * 1) Edición cruzada entre dos usuarios distintos (actorUserId !== targetUserId)
 * 2) Cualquier intento de enviar o mutar el campo `role` desde el cliente
 */
export function validateProfileUpdate(
  actor: { id: string; role: UserRole },
  targetUserId: string,
  input: UpdateProfileInput
): AuthResult<{ displayName: string; avatarPath: string | null }> {
  if (!actor.id || actor.id !== targetUserId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "No tienes permiso para modificar el perfil de otro usuario.",
      },
    };
  }

  if (input.role !== undefined) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_ROLE",
        message:
          "Operación rechazada: el rol de usuario se asigna exclusivamente en servidor.",
      },
    };
  }

  const displayName = input.displayName?.trim() ?? "";
  if (displayName.length < 1 || displayName.length > 100) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "El nombre para mostrar debe tener entre 1 y 100 caracteres.",
      },
    };
  }

  return {
    ok: true,
    data: {
      displayName,
      avatarPath: input.avatarPath ?? null,
    },
  };
}

/**
 * Regla determinista de protección de rutas para el Middleware:
 * - /app, /app/* y /profile -> requieren sesión autenticada
 * - /admin y /admin/* -> requieren sesión autenticada Y role === 'admin'
 * - /login, /register, /forgot-password -> redirigen a /app si ya está autenticado
 */
export function evaluateRouteAccess(params: {
  pathname: string;
  isAuthenticated: boolean;
  role: UserRole | null;
}): RouteAccessDecision {
  const { pathname, isAuthenticated, role } = params;

  const isProtectedUserRoute =
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/");

  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

  const isAuthGuestRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  if (isAdminRoute) {
    if (!isAuthenticated) {
      return {
        allowed: false,
        reason: "UNAUTHENTICATED",
        redirectTo: `/login?redirectTo=${encodeURIComponent(pathname)}`,
      };
    }

    if (role !== "admin") {
      return {
        allowed: false,
        reason: "FORBIDDEN_ADMIN",
        redirectTo: "/app?error=forbidden_admin",
      };
    }

    return { allowed: true };
  }

  if (isProtectedUserRoute) {
    if (!isAuthenticated) {
      return {
        allowed: false,
        reason: "UNAUTHENTICATED",
        redirectTo: `/login?redirectTo=${encodeURIComponent(pathname)}`,
      };
    }

    return { allowed: true };
  }

  if (isAuthGuestRoute && isAuthenticated) {
    return {
      allowed: false,
      reason: "ALREADY_AUTHENTICATED",
      redirectTo: "/app",
    };
  }

  return { allowed: true };
}
