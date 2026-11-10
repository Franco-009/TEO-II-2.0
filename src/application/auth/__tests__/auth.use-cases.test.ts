import { describe, expect, it } from "vitest";
import type { AuthRepository } from "@/domain/auth/auth.ports";
import type {
  AuthResult,
  LoginInput,
  PasswordResetInput,
  RegisterInput,
  UserProfile,
} from "@/domain/auth/auth.types";
import {
  loginWithPasswordUseCase,
  logoutUserUseCase,
  registerUserUseCase,
  requestPasswordResetUseCase,
  updateOwnProfileUseCase,
} from "../auth.use-cases";

class InMemoryAuthRepository implements AuthRepository {
  private users = new Map<
    string,
    { password: string; profile: UserProfile }
  >();
  private activeUserId: string | null = null;

  async signUp(input: RegisterInput): Promise<AuthResult<UserProfile>> {
    if (this.users.has(input.email)) {
      return {
        ok: false,
        error: {
          code: "EMAIL_ALREADY_IN_USE",
          message: "Este correo electrónico ya está registrado.",
        },
      };
    }

    const profile: UserProfile = {
      id: `usr-${this.users.size + 1}`,
      email: input.email,
      displayName: input.displayName,
      avatarPath: null,
      role: "user", // Siempre nace como 'user' (igual que el trigger on_auth_user_created)
      createdAt: new Date().toISOString(),
    };

    this.users.set(input.email, { password: input.password, profile });
    this.activeUserId = profile.id;

    return { ok: true, data: profile };
  }

  async signInWithPassword(
    input: LoginInput
  ): Promise<AuthResult<UserProfile>> {
    const entry = this.users.get(input.email);
    if (!entry || entry.password !== input.password) {
      return {
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Correo electrónico o contraseña incorrectos.",
        },
      };
    }

    this.activeUserId = entry.profile.id;
    return { ok: true, data: entry.profile };
  }

  async signOut(): Promise<AuthResult<{ signedOut: true }>> {
    this.activeUserId = null;
    return { ok: true, data: { signedOut: true } };
  }

  async resetPasswordForEmail(
    input: PasswordResetInput
  ): Promise<AuthResult<{ emailSent: true }>> {
    if (!input.email) {
      return {
        ok: false,
        error: { code: "INVALID_INPUT", message: "Email vacío" },
      };
    }
    return { ok: true, data: { emailSent: true } };
  }

  async getCurrentSessionProfile(): Promise<AuthResult<UserProfile | null>> {
    for (const { profile } of this.users.values()) {
      if (profile.id === this.activeUserId) {
        return { ok: true, data: profile };
      }
    }
    return { ok: true, data: null };
  }

  async updateOwnProfile(params: {
    userId: string;
    displayName: string;
    avatarPath: string | null;
  }): Promise<AuthResult<UserProfile>> {
    for (const [email, entry] of this.users.entries()) {
      if (entry.profile.id === params.userId) {
        const updated: UserProfile = {
          ...entry.profile,
          displayName: params.displayName,
          avatarPath: params.avatarPath,
        };
        this.users.set(email, { ...entry, profile: updated });
        return { ok: true, data: updated };
      }
    }

    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Perfil no encontrado" },
    };
  }
}

describe("Casos de Uso de Autenticación e Integración con Repositorio (Fase 2)", () => {
  it("registra un usuario nuevo asignándole siempre role = 'user' y rechaza email duplicado", async () => {
    const repo = new InMemoryAuthRepository();

    const first = await registerUserUseCase(repo, {
      displayName: "Usuario A",
      email: "usuario.a@estudio.com",
      password: "claveSegura123",
    });

    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.data.role).toBe("user");
      expect(first.data.displayName).toBe("Usuario A");
    }

    const duplicate = await registerUserUseCase(repo, {
      displayName: "Otro Nombre",
      email: "USUARIO.A@estudio.com",
      password: "otraClaveSegura123",
    });

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error.code).toBe("EMAIL_ALREADY_IN_USE");
    }
  });

  it("permite login con credenciales válidas, rechaza clave errónea y cierra sesión", async () => {
    const repo = new InMemoryAuthRepository();
    await registerUserUseCase(repo, {
      displayName: "Valentina",
      email: "valen@estudio.com",
      password: "miPassword123",
    });

    const badLogin = await loginWithPasswordUseCase(repo, {
      email: "valen@estudio.com",
      password: "claveIncorrecta",
    });
    expect(badLogin.ok).toBe(false);
    if (!badLogin.ok) {
      expect(badLogin.error.code).toBe("INVALID_CREDENTIALS");
    }

    const goodLogin = await loginWithPasswordUseCase(repo, {
      email: "valen@estudio.com",
      password: "miPassword123",
    });
    expect(goodLogin.ok).toBe(true);

    const out = await logoutUserUseCase(repo);
    expect(out.ok).toBe(true);
  });

  it("procesa recuperación de contraseña y protege actualización de perfil propio contra edición cruzada o cambio de rol", async () => {
    const repo = new InMemoryAuthRepository();
    const userA = await registerUserUseCase(repo, {
      displayName: "Usuario A",
      email: "a@estudio.com",
      password: "password123",
    });
    const userB = await registerUserUseCase(repo, {
      displayName: "Usuario B",
      email: "b@estudio.com",
      password: "password123",
    });

    expect(userA.ok && userB.ok).toBe(true);
    if (!userA.ok || !userB.ok) return;

    // Usuario A intenta editar el perfil de Usuario B -> Denegado
    const crossUpdate = await updateOwnProfileUseCase(
      repo,
      { id: userA.data.id, role: "user" },
      userB.data.id,
      { displayName: "Hackeado por A" }
    );
    expect(crossUpdate.ok).toBe(false);
    if (!crossUpdate.ok) {
      expect(crossUpdate.error.code).toBe("UNAUTHORIZED");
    }

    // Usuario A intenta inyectar role: 'admin' -> Denegado
    const roleEscalation = await updateOwnProfileUseCase(
      repo,
      { id: userA.data.id, role: "user" },
      userA.data.id,
      { displayName: "Usuario A", role: "admin" }
    );
    expect(roleEscalation.ok).toBe(false);
    if (!roleEscalation.ok) {
      expect(roleEscalation.error.code).toBe("FORBIDDEN_ROLE");
    }

    // Usuario A actualiza legítimamente su display_name -> Permitido y mantiene role = 'user'
    const validUpdate = await updateOwnProfileUseCase(
      repo,
      { id: userA.data.id, role: "user" },
      userA.data.id,
      { displayName: "Usuario A Actualizado" }
    );
    expect(validUpdate.ok).toBe(true);
    if (validUpdate.ok) {
      expect(validUpdate.data.displayName).toBe("Usuario A Actualizado");
      expect(validUpdate.data.role).toBe("user");
    }

    const reset = await requestPasswordResetUseCase(repo, {
      email: "a@estudio.com",
    });
    expect(reset.ok).toBe(true);
  });
});
