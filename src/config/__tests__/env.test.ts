import { describe, expect, it } from "vitest";
import {
  APP_CONFIG,
  getServerServiceRoleKey,
  getSupabasePublicConfig,
  isAiEnabled,
  isSupabaseConfigured,
} from "../env";

describe("Configuración base y fronteras del dominio (Fase 1 y Fase 2)", () => {
  it("mantiene ENABLE_AI_FEATURES desactivado por defecto en v1 (ADR-0002)", () => {
    expect(APP_CONFIG.enableAiFeatures).toBe(false);
    expect(isAiEnabled()).toBe(false);
  });

  it("establece el límite de archivos PDF en 15 MB exactos (ADR-0004)", () => {
    expect(APP_CONFIG.maxPdfSizeBytes).toBe(15_728_640);
  });

  it("exige un mínimo de 5 intentos para considerar un tema dominado", () => {
    expect(APP_CONFIG.masteryMinAttempts).toBe(5);
  });

  it("detecta cuando Supabase tiene los placeholders de .env.example sin romper el build", () => {
    expect(
      isSupabaseConfigured({
        NEXT_PUBLIC_SUPABASE_URL: "https://tu-proyecto.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "tu-anon-key-publica",
      })
    ).toBe(false);

    expect(
      isSupabaseConfigured({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      })
    ).toBe(false);
  });

  it("reconoce credenciales válidas de Supabase en getSupabasePublicConfig", () => {
    const config = getSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://abcxyz.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real",
    });

    expect(config.isConfigured).toBe(true);
    expect(config.url).toBe("https://abcxyz.supabase.co");
  });

  it("impide leer SUPABASE_SERVICE_ROLE_KEY en entorno de navegador (jsdom)", () => {
    expect(() =>
      getServerServiceRoleKey({
        SUPABASE_SERVICE_ROLE_KEY: "secret-service-role",
      })
    ).toThrow(/SECURITY_VIOLATION/);
  });
});
