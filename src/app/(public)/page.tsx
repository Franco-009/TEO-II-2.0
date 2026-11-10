import React from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Lock,
  Play,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function LandingPage() {
  return (
    <div className="space-y-16 py-6">
      <section className="mx-auto max-w-3xl text-center space-y-6">
        <div className="flex justify-center">
          <StatusBadge
            variant="info"
            label="Motor de estudio 100% determinista • Privacidad RLS"
          />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl leading-tight">
          Domina tus materias con cuestionarios explicados y apuntes organizados
        </h1>

        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          StudyPlay te permite estructurar materias, temas jerárquicos y documentos PDF privados, practicar con corrección inmediata verificada y convertir tus errores en dominio real.
        </p>

        {/* Regla UX: Una acción primaria clara por pantalla */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button href="/app" variant="primary" size="lg">
            <Play className="h-4 w-4" aria-hidden={true} />
            <span>Entrar al Dashboard de Prueba</span>
          </Button>
          <Button href="/library" variant="secondary" size="lg">
            Explorar Catálogo Público
          </Button>
        </div>
      </section>

      <section aria-label="Características principales" className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <BookOpen className="h-5 w-5" aria-hidden={true} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            Biblioteca Mixta (Privada y Pública)
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Crea tus propias materias, temas y preguntas privadas o estudia con el catálogo público curado por administradores.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-5 w-5" aria-hidden={true} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            Corrección Determinista Explicada
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Sin alucinaciones ni ambigüedad: cada opción incluye explicación verificada, referencia al apunte PDF y repaso específico de errores.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <Sparkles className="h-5 w-5" aria-hidden={true} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            Progreso Real y Gamificación
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Mide tu precisión por tema (mínimo 5 intentos para considerar dominado), mantén tu racha diaria y suma XP idempotente.
          </p>
        </Card>
      </section>

      <section aria-label="Demostración de semántica accesible">
        <Card elevated className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-100">
              Sistema Visual Accesible (Verde / Rojo / Ámbar + Icono + Texto)
            </h2>
            <span className="text-xs text-slate-400">
              Cumple especificaciones de docs/02-UX-Y-PANTALLAS.md
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatusBadge variant="success" label="Acierto: Respuesta correcta (+10 XP)" />
            <StatusBadge variant="error" label="Error: Requiere repaso en modo errores" />
            <StatusBadge variant="warning" label="Advertencia: Pregunta en borrador (draft)" />
            <StatusBadge variant="neutral" label="Dominio: 84% de precisión (12 intentos)" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-[#111827] p-3">
              <FileText className="h-4 w-4 text-blue-400 shrink-0" aria-hidden={true} />
              <span>Soporte de documentos PDF privados de hasta 15 MB con trazabilidad por página.</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-[#111827] p-3">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden={true} />
              <span>Aislamiento total entre usuarios mediante políticas RLS en PostgreSQL y Storage.</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
