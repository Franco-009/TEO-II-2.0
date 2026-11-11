import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getServerServiceRoleKey } from "@/config/env";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "supabase", "migrations");
const SRC_DIR = path.join(PROJECT_ROOT, "src");

const EXPECTED_MIGRATIONS = [
  "20261110000001_phase2_profiles_and_rls.sql",
  "20261110000002_phase3_subjects_topics_and_rls.sql",
  "20261110000003_phase4_documents_and_storage_rls.sql",
  "20261110000004_phase5_questions_and_options_rls.sql",
  "20261110000005_phase6_quiz_sessions_and_attempts_rls.sql",
  "20261110000006_phase7_progress_and_gamification_rls.sql",
  "20261110000007_phase8_admin_moderation_and_public_library_rls.sql",
];

const EXPECTED_PUBLIC_TABLES = [
  "profiles",
  "subjects",
  "topics",
  "documents",
  "questions",
  "question_options",
  "quiz_sessions",
  "attempts",
  "xp_events",
  "user_daily_activity",
  "admin_audit_logs",
];

function collectFilesRecursively(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("Auditoría Estática de Seguridad, Esquema SQL/RLS y Secretos (Fase 9 — v1.0.0)", () => {
  it("verifica que existan las 7 migraciones SQL incrementales en orden y que habiliten RLS con políticas SELECT, INSERT, UPDATE y DELETE en las 11 tablas públicas y en storage.objects", () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    expect(migrationFiles).toEqual(EXPECTED_MIGRATIONS);

    const combinedSql = migrationFiles
      .map((filename) =>
        fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8")
      )
      .join("\n\n");

    for (const table of EXPECTED_PUBLIC_TABLES) {
      // 1. Verificar CREATE TABLE public.<table_name>
      const createTableRegex = new RegExp(
        `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.${table}\\b`,
        "i"
      );
      expect(
        createTableRegex.test(combinedSql),
        `Falta CREATE TABLE public.${table}`
      ).toBe(true);

      // 2. Verificar ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
      const enableRlsRegex = new RegExp(
        `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY\\s*;`,
        "i"
      );
      expect(
        enableRlsRegex.test(combinedSql),
        `Falta ENABLE ROW LEVEL SECURITY en public.${table}`
      ).toBe(true);

      // 3. Verificar políticas separadas para SELECT, INSERT, UPDATE y DELETE
      for (const operation of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        const policyRegex = new RegExp(
          `CREATE\\s+POLICY\\s+\\w+\\s+ON\\s+public\\.${table}\\s+FOR\\s+${operation}\\b`,
          "i"
        );
        expect(
          policyRegex.test(combinedSql),
          `Falta política FOR ${operation} en public.${table}`
        ).toBe(true);
      }
    }

    // 4. Verificar bucket privado study-documents y las 4 políticas sobre storage.objects
    expect(combinedSql).toMatch(/INSERT\s+INTO\s+storage\.buckets/i);
    expect(combinedSql).toContain("'study-documents'");
    expect(combinedSql).toContain("15728640");
    expect(combinedSql).toContain("application/pdf");

    for (const operation of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      const storagePolicyRegex = new RegExp(
        `CREATE\\s+POLICY\\s+\\w+\\s+ON\\s+storage\\.objects\\s+FOR\\s+${operation}\\b`,
        "i"
      );
      expect(
        storagePolicyRegex.test(combinedSql),
        `Falta política FOR ${operation} en storage.objects`
      ).toBe(true);
    }
  });

  it("verifica que ningún componente cliente ('use client') importe ni referencie SUPABASE_SERVICE_ROLE_KEY, getServerServiceRoleKey ni repositorios exclusivos de servidor", () => {
    const allSourceFiles = collectFilesRecursively(SRC_DIR, [".ts", ".tsx"]);
    const clientFiles = allSourceFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      const firstLines = content.split(/\r?\n/).slice(0, 5).join("\n");
      return (
        firstLines.includes('"use client"') ||
        firstLines.includes("'use client'")
      );
    });

    expect(clientFiles.length).toBeGreaterThanOrEqual(15);

    const forbiddenPatterns = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "getServerServiceRoleKey",
      "server-client",
      "supabase-subjects.repository",
      "supabase-topics.repository",
      "supabase-documents.repository",
      "supabase-questions.repository",
      "supabase-quizzes.repository",
      "supabase-progress.repository",
      "supabase-admin.repository",
      "supabase-private-storage.adapter",
    ];

    for (const filePath of clientFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      const relPath = path.relative(PROJECT_ROOT, filePath);

      for (const pattern of forbiddenPatterns) {
        expect(
          content.includes(pattern),
          `Violación de seguridad: el archivo cliente ${relPath} referencia '${pattern}'`
        ).toBe(false);
      }
    }
  });

  it("verifica que getServerServiceRoleKey lance SECURITY_VIOLATION si se invoca en entorno de navegador y que .env.example y package.json cumplan las reglas sin IA en v1", () => {
    // En entorno jsdom (window definido), getServerServiceRoleKey debe lanzar error de seguridad
    expect(typeof window).toBe("object");
    expect(() =>
      getServerServiceRoleKey({ SUPABASE_SERVICE_ROLE_KEY: "secret-key" })
    ).toThrow(/SECURITY_VIOLATION/);

    // Verificar .env.example
    const envExamplePath = path.join(PROJECT_ROOT, ".env.example");
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
    expect(envExampleContent).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(envExampleContent).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=");
    expect(envExampleContent).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(envExampleContent).toContain("ENABLE_AI_FEATURES=false");
    expect(envExampleContent).toContain("MAX_PDF_SIZE_BYTES=15728640");

    // Verificar package.json (versión 1.0.0 y ausencia de SDKs de IA en v1)
    const pkgJsonPath = path.join(PROJECT_ROOT, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as {
      version: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.version).toBe("1.0.0");

    const allDeps = Object.keys({
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    });
    const forbiddenAiPackages = [
      "openai",
      "@anthropic-ai/sdk",
      "@google/generative-ai",
      "langchain",
      "ai",
    ];
    for (const aiPkg of forbiddenAiPackages) {
      expect(allDeps).not.toContain(aiPkg);
    }
  });

  it("Criterios de Aceptación #15 y #16: verifica que README.md, CHANGELOG.md y la carpeta /docs estén completos y sincronizados para instalar, operar y reconstruir el proyecto", () => {
    const requiredDocs = [
      "README.md",
      "CHANGELOG.md",
      "docs/00-PLAN-MAESTRO.md",
      "docs/01-REQUISITOS.md",
      "docs/02-UX-Y-PANTALLAS.md",
      "docs/03-ARQUITECTURA.md",
      "docs/04-MODELO-DATOS.md",
      "docs/05-SEGURIDAD-RLS.md",
      "docs/06-PLAN-DE-PRUEBAS.md",
      "docs/07-ROADMAP.md",
      "docs/08-DECISIONES.md",
      "docs/09-OPERACION-Y-RECUPERACION.md",
      "docs/10-IA-FUTURA.md",
    ];

    for (const relDoc of requiredDocs) {
      const fullPath = path.join(PROJECT_ROOT, relDoc);
      expect(fs.existsSync(fullPath), `Falta el documento ${relDoc}`).toBe(true);
      const content = fs.readFileSync(fullPath, "utf8");
      expect(content.trim().length).toBeGreaterThan(100);
    }

    const roadmapContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "docs/07-ROADMAP.md"),
      "utf8"
    );
    expect(roadmapContent).toContain("- [x] **FASE 9");

    const testPlanContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "docs/06-PLAN-DE-PRUEBAS.md"),
      "utf8"
    );
    expect(testPlanContent).toContain("Sección 12.2");
    expect(testPlanContent).toContain("Sección 14");

    const changelogContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "CHANGELOG.md"),
      "utf8"
    );
    expect(changelogContent).toContain("## [1.0.0]");
  });
});
