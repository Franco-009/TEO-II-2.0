/**
 * Configuración centralizada y validación de límites de dominio (ADR-0002 y ADR-0004).
 * En v1, la IA está desactivada por diseño (100% determinista).
 */

export const APP_CONFIG = {
  appName: "StudyPlay",
  version: "0.2.0",
  enableAiFeatures: process.env.ENABLE_AI_FEATURES === "true" ? true : false,
  maxPdfSizeBytes: Number(process.env.MAX_PDF_SIZE_BYTES ?? 15_728_640), // 15 MB
  masteryMinAttempts: 5,
} as const;

export function isAiEnabled(): boolean {
  return APP_CONFIG.enableAiFeatures === true;
}
