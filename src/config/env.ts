/**
 * Configuración centralizada y validación de límites de dominio (ADR-0002 y ADR-0004).
 * En v1, la IA está desactivada por diseño (100% determinista).
 * Incluye validación segura de variables de entorno de Supabase sin romper build ni tests locales.
 */

const PLACEHOLDER_SUPABASE_URL = "https://tu-proyecto.supabase.co";
const PLACEHOLDER_SUPABASE_ANON_KEY = "tu-anon-key-publica";
const PLACEHOLDER_SERVICE_ROLE_KEY = "tu-service-role-key-solo-servidor";

export const APP_CONFIG = {
  appName: "StudyPlay",
  version: "0.5.0",
  enableAiFeatures: process.env.ENABLE_AI_FEATURES === "true" ? true : false,
  maxPdfSizeBytes: Number(process.env.MAX_PDF_SIZE_BYTES ?? 15_728_640), // 15 MB
  masteryMinAttempts: 5,
} as const;

export function isAiEnabled(): boolean {
  return APP_CONFIG.enableAiFeatures === true;
}

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export function isSupabaseConfigured(
  env: Record<string, string | undefined> = process.env
): boolean {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) {
    return false;
  }

  if (
    url === PLACEHOLDER_SUPABASE_URL ||
    anonKey === PLACEHOLDER_SUPABASE_ANON_KEY
  ) {
    return false;
  }

  return url.startsWith("https://") || url.startsWith("http://");
}

export function getSupabasePublicConfig(
  env: Record<string, string | undefined> = process.env
): SupabasePublicConfig {
  const configured = isSupabaseConfigured(env);
  return {
    url: configured
      ? (env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "")
      : PLACEHOLDER_SUPABASE_URL,
    anonKey: configured
      ? (env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "")
      : PLACEHOLDER_SUPABASE_ANON_KEY,
    isConfigured: configured,
  };
}

/**
 * Obtiene SUPABASE_SERVICE_ROLE_KEY exclusivamente del lado servidor.
 * Lanza error inmediato si se invoca en entorno de navegador.
 */
export function getServerServiceRoleKey(
  env: Record<string, string | undefined> = process.env
): string | null {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY_VIOLATION: SUPABASE_SERVICE_ROLE_KEY nunca puede leerse en el cliente."
    );
  }

  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!key || key === PLACEHOLDER_SERVICE_ROLE_KEY) {
    return null;
  }

  return key;
}
