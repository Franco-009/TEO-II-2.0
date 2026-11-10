import { describe, expect, it } from "vitest";
import {
  evaluateRouteAccess,
  validateLoginInput,
  validatePasswordResetInput,
  validateProfileUpdate,
  validateRegistrationInput,
} from "../auth.rules";

describe("Reglas puras de Autenticación, Autorización y Protección de Rutas (Fase 2)", () => {
  describe("Caso Imprescindible #1: Validación de registro y login", () => {
    it("acepta un registro válido y normaliza el email", () => {
      const res = validateRegistrationInput({
        email: "  Estudiante@Universidad.edu.ar ",
        password: "passwordSegura123",
        displayName: "  Valentina Gómez ",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.email).toBe("estudiante@universidad.edu.ar");
        expect(res.data.displayName).toBe("Valentina Gómez");
      }
    });

    it("rechaza contraseña menor a 8 caracteres con código WEAK_PASSWORD", () => {
      const res = validateRegistrationInput({
        email: "alumno@test.com",
        password: "1234567",
        displayName: "Alumno",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("WEAK_PASSWORD");
      }
    });

    it("rechaza correo inválido en registro, login y recuperación", () => {
      expect(
        validateRegistrationInput({
          email: "correo-invalido",
          password: "passwordSegura123",
          displayName: "Alumno",
        }).ok
      ).toBe(false);

      expect(
        validateLoginInput({
          email: "sin-arroba.com",
          password: "passwordSegura123",
        }).ok
      ).toBe(false);

      expect(validatePasswordResetInput({ email: "" }).ok).toBe(false);
    });
  });

  describe("Caso Imprescindible #2: Protección de rutas (/app/*, /profile, /admin/*)", () => {
    it("redirige al visitante no autenticado a /login al intentar entrar a /app/* o /profile", () => {
      const appDecision = evaluateRouteAccess({
        pathname: "/app/subjects",
        isAuthenticated: false,
        role: null,
      });

      expect(appDecision).toEqual({
        allowed: false,
        reason: "UNAUTHENTICATED",
        redirectTo: "/login?redirectTo=%2Fapp%2Fsubjects",
      });

      const profileDecision = evaluateRouteAccess({
        pathname: "/profile",
        isAuthenticated: false,
        role: null,
      });

      expect(profileDecision).toEqual({
        allowed: false,
        reason: "UNAUTHENTICATED",
        redirectTo: "/login?redirectTo=%2Fprofile",
      });
    });

    it("permite acceso a /app y /profile a un usuario autenticado con rol 'user'", () => {
      expect(
        evaluateRouteAccess({
          pathname: "/app",
          isAuthenticated: true,
          role: "user",
        })
      ).toEqual({ allowed: true });

      expect(
        evaluateRouteAccess({
          pathname: "/profile",
          isAuthenticated: true,
          role: "user",
        })
      ).toEqual({ allowed: true });
    });

    it("bloquea el acceso a /admin y /admin/content para rol 'user' y lo permite solo a 'admin'", () => {
      const userAttempt = evaluateRouteAccess({
        pathname: "/admin/content",
        isAuthenticated: true,
        role: "user",
      });

      expect(userAttempt).toEqual({
        allowed: false,
        reason: "FORBIDDEN_ADMIN",
        redirectTo: "/app?error=forbidden_admin",
      });

      const adminAttempt = evaluateRouteAccess({
        pathname: "/admin/content",
        isAuthenticated: true,
        role: "admin",
      });

      expect(adminAttempt).toEqual({ allowed: true });
    });

    it("redirige a /app si un usuario ya autenticado visita /login o /register", () => {
      expect(
        evaluateRouteAccess({
          pathname: "/login",
          isAuthenticated: true,
          role: "user",
        })
      ).toEqual({
        allowed: false,
        reason: "ALREADY_AUTHENTICATED",
        redirectTo: "/app",
      });
    });
  });

  describe("Seguridad de Roles y Aislamiento entre Usuarios (Usuario A vs Usuario B)", () => {
    it("impide que Usuario A modifique el perfil de Usuario B", () => {
      const result = validateProfileUpdate(
        { id: "user-a-uuid", role: "user" },
        "user-b-uuid",
        { displayName: "Intento de intrusión" }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNAUTHORIZED");
      }
    });

    it("rechaza con FORBIDDEN_ROLE cualquier intento del cliente de cambiar su propio role a admin", () => {
      const result = validateProfileUpdate(
        { id: "user-a-uuid", role: "user" },
        "user-a-uuid",
        { displayName: "Usuario A", role: "admin" }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN_ROLE");
      }
    });
  });
});
