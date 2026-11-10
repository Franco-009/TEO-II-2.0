import type { AuthRepository } from "@/domain/auth/auth.ports";
import type {
  AuthResult,
  LoginInput,
  PasswordResetInput,
  RegisterInput,
  UserProfile,
} from "@/domain/auth/auth.types";
import type { UserRole } from "@/domain/models/studyplay";
import { createServerSupabaseClient } from "./server-client";

interface ProfileRow {
  id: string;
  display_name: string;
  avatar_path: string | null;
  role: string;
  created_at: string;
}

function mapProfileRow(row: ProfileRow, email: string): UserProfile {
  const role: UserRole = row.role === "admin" ? "admin" : "user";
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    avatarPath: row.avatar_path,
    role,
    createdAt: row.created_at,
  };
}

export class SupabaseAuthRepository implements AuthRepository {
  async signInWithPassword(
    input: LoginInput
  ): Promise<AuthResult<UserProfile>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error: {
          code: "SUPABASE_NOT_CONFIGURED",
          message:
            "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local para autenticar contra Supabase.",
        },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user) {
      return {
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Correo electrónico o contraseña incorrectos.",
        },
      };
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_path, role, created_at")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profileRow) {
      return {
        ok: true,
        data: {
          id: data.user.id,
          email: data.user.email ?? input.email,
          displayName: input.email.split("@")[0] ?? "Estudiante",
          avatarPath: null,
          role: "user",
          createdAt: new Date().toISOString(),
        },
      };
    }

    return {
      ok: true,
      data: mapProfileRow(
        profileRow as ProfileRow,
        data.user.email ?? input.email
      ),
    };
  }

  async signUp(input: RegisterInput): Promise<AuthResult<UserProfile>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error: {
          code: "SUPABASE_NOT_CONFIGURED",
          message:
            "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local para registrar usuarios en Supabase.",
        },
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
        },
      },
    });

    if (error || !data.user) {
      const lowerMsg = error?.message.toLowerCase() ?? "";
      if (lowerMsg.includes("already") || lowerMsg.includes("registered")) {
        return {
          ok: false,
          error: {
            code: "EMAIL_ALREADY_IN_USE",
            message: "Este correo electrónico ya está registrado.",
          },
        };
      }

      return {
        ok: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: error?.message ?? "No se pudo completar el registro.",
        },
      };
    }

    return {
      ok: true,
      data: {
        id: data.user.id,
        email: data.user.email ?? input.email,
        displayName: input.displayName,
        avatarPath: null,
        role: "user",
        createdAt: new Date().toISOString(),
      },
    };
  }

  async signOut(): Promise<AuthResult<{ signedOut: true }>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return { ok: true, data: { signedOut: true } };
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "No se pudo cerrar la sesión.",
        },
      };
    }

    return { ok: true, data: { signedOut: true } };
  }

  async resetPasswordForEmail(
    input: PasswordResetInput
  ): Promise<AuthResult<{ emailSent: true }>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error: {
          code: "SUPABASE_NOT_CONFIGURED",
          message:
            "Configura tus credenciales de Supabase en .env.local para enviar correos de recuperación.",
        },
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(input.email);
    if (error) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "No se pudo enviar el enlace de recuperación.",
        },
      };
    }

    return { ok: true, data: { emailSent: true } };
  }

  async getCurrentSessionProfile(): Promise<AuthResult<UserProfile | null>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error: {
          code: "SUPABASE_NOT_CONFIGURED",
          message: "Supabase no está configurado en este entorno.",
        },
      };
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: true, data: null };
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_path, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileRow) {
      return {
        ok: true,
        data: {
          id: user.id,
          email: user.email ?? "",
          displayName: user.email?.split("@")[0] ?? "Estudiante",
          avatarPath: null,
          role: "user",
          createdAt: new Date().toISOString(),
        },
      };
    }

    return {
      ok: true,
      data: mapProfileRow(profileRow as ProfileRow, user.email ?? ""),
    };
  }

  async updateOwnProfile(params: {
    userId: string;
    displayName: string;
    avatarPath: string | null;
  }): Promise<AuthResult<UserProfile>> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error: {
          code: "SUPABASE_NOT_CONFIGURED",
          message:
            "Configura Supabase en .env.local para persistir cambios de perfil en PostgreSQL.",
        },
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== params.userId) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Sesión inválida o sin permiso para actualizar este perfil.",
        },
      };
    }

    const { data: updatedRow, error } = await supabase
      .from("profiles")
      .update({
        display_name: params.displayName,
        avatar_path: params.avatarPath,
      })
      .eq("id", user.id)
      .select("id, display_name, avatar_path, role, created_at")
      .single();

    if (error || !updatedRow) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "No se pudo actualizar el perfil en la base de datos.",
        },
      };
    }

    return {
      ok: true,
      data: mapProfileRow(updatedRow as ProfileRow, user.email ?? ""),
    };
  }
}
