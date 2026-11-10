import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/config/env";
import type { UserRole } from "@/domain/models/studyplay";

export interface MiddlewareSessionInfo {
  response: NextResponse;
  isAuthenticated: boolean;
  role: UserRole | null;
}

export async function resolveMiddlewareSession(
  request: NextRequest
): Promise<MiddlewareSessionInfo> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const config = getSupabasePublicConfig();

  // Si Supabase aún no está configurado en entorno local, permitimos simular estados de sesión
  // mediante query param (?__auth=guest | user | admin) para pruebas locales y de lo contrario
  // asumimos modo demo autenticado para no bloquear la navegación visual de Fase 1/2.
  if (!config.isConfigured) {
    const simulatedAuth = request.nextUrl.searchParams.get("__auth");
    if (simulatedAuth === "guest") {
      return {
        response: supabaseResponse,
        isAuthenticated: false,
        role: null,
      };
    }
    if (simulatedAuth === "user") {
      return {
        response: supabaseResponse,
        isAuthenticated: true,
        role: "user",
      };
    }
    return {
      response: supabaseResponse,
      isAuthenticated: true,
      role: "admin",
    };
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: supabaseResponse,
      isAuthenticated: false,
      role: null,
    };
  }

  // Consultar el rol real en servidor desde public.profiles (nunca confiar en metadata del cliente)
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const verifiedRole: UserRole =
    profileRow?.role === "admin" ? "admin" : "user";

  return {
    response: supabaseResponse,
    isAuthenticated: true,
    role: verifiedRole,
  };
}
