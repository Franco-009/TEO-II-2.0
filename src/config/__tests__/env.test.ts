import { describe, expect, it } from "vitest";
import { APP_CONFIG, isAiEnabled } from "../env";

describe("Configuración base y fronteras del dominio (Fase 1)", () => {
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
});
