# StudyPlay (v1.0.0)

Plataforma web multiusuario para organizar materiales de estudio (materias, temas jerárquicos y apuntes PDF privados), practicar con cuestionarios autocorregibles, recibir correcciones explicadas al instante y medir el progreso académico con gamificación idempotente.

---

## 1. Decisiones Base de Arquitectura y Seguridad
- **100% Determinista (Sin dependencia de IA en v1.0):** Todo el circuito de estudio, creación de preguntas, motor de juego, corrección inmediata, repaso de errores y cálculo de progreso funciona sin modelos de lenguaje ni claves de proveedores externos (`ENABLE_AI_FEATURES=false`). La arquitectura incluye puertos desacoplados en `src/domain/ai/` para futuras extensiones opcionales.
- **Biblioteca Mixta con Aislamiento Estricto:**
  - **Espacio Privado (`/app/*`):** Cada estudiante gestiona sus propias materias, árbol de temas, documentos PDF privados, banco de preguntas, sesiones de juego, intentos y estadísticas. Ningún otro usuario puede leer ni modificar sus recursos privados.
  - **Catálogo Público Compartido (`/library` y `/admin/*`):** Los administradores preparan, revisan y publican materias públicas (`visibility = 'public' AND status = 'published'`). Cuando un estudiante practica sobre una materia pública, sus intentos y puntos XP se registran exclusivamente en su historial privado.
- **Defensa en Profundidad (RLS + Dominio):** Las 11 tablas de PostgreSQL (`profiles`, `subjects`, `topics`, `documents`, `questions`, `question_options`, `quiz_sessions`, `attempts`, `xp_events`, `user_daily_activity`, `admin_audit_logs`) y el bucket privado `study-documents` en Supabase Storage cuentan con Row Level Security (RLS) activo y políticas separadas para `SELECT`, `INSERT`, `UPDATE` y `DELETE`.

---

## 2. Stack Tecnológico
- **Frontend y BFF:** Next.js 15 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4.
- **Backend y Persistencia:** Supabase (Auth, PostgreSQL con RLS y Triggers, Storage privado con URLs firmadas temporales).
- **Modo Local / Fallback en Memoria:** Repositorio determinista en memoria (`InMemoryStudyCatalogStore`) que se activa automáticamente cuando no se configuran credenciales de Supabase, permitiendo desarrollo local inmediato y ejecución de pruebas sin red.
- **Calidad y Testing:** ESLint 9, TypeScript (`tsc --noEmit`) y Vitest 3 (19 suites automatizadas: unitarias de dominio, integración de casos de uso, flujo E2E multi-actor y auditoría estática de seguridad/RLS).
- **Despliegue:** Vercel.

---

## 3. Estructura del Proyecto

```text
├── docs/                        # Documentación maestra de producto, arquitectura, SQL/RLS, pruebas y operación
│   ├── 00-PLAN-MAESTRO.md
│   ├── 01-REQUISITOS.md
│   ├── 02-UX-Y-PANTALLAS.md
│   ├── 03-ARQUITECTURA.md
│   ├── 04-MODELO-DATOS.md
│   ├── 05-SEGURIDAD-RLS.md
│   ├── 06-PLAN-DE-PRUEBAS.md
│   ├── 07-ROADMAP.md
│   ├── 08-DECISIONES.md
│   ├── 09-OPERACION-Y-RECUPERACION.md
│   └── 10-IA-FUTURA.md
├── supabase/
│   └── migrations/              # 7 migraciones SQL incrementales e idempotentes (0001 a 0007)
└── src/
    ├── config/                  # Configuración centralizada y validación segura de variables de entorno
    ├── domain/                  # Entidades, puertos y reglas puras (auth, subjects, topics, documents, questions, quizzes, attempts, gamification, progress, admin, ai)
    ├── application/             # Casos de uso orquestados e independientes del framework
    ├── infrastructure/          # Adaptadores de Supabase, Storage privado y almacén en memoria
    ├── features/                # Server Actions y componentes interactivos por módulo funcional
    ├── components/              # Componentes visuales compartidos y layouts
    ├── app/                     # Rutas de Next.js App Router ((public), (authenticated)/app, (authenticated)/admin)
    └── __tests__/               # Suites de flujo E2E (mvp-phase9-e2e.test.ts) y auditoría de seguridad/RLS
```

---

## 4. Requisitos e Instalación Local

### Prerrequisitos
- **Node.js** `>= 20.x` y **npm** `>= 10.x`.
- (Opcional para persistencia en la nube) Un proyecto en [Supabase](https://supabase.com/).

### Pasos de Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Copiar el archivo de ejemplo `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Variables incluidas en `.env.example`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-solo-servidor
   ENABLE_AI_FEATURES=false
   MAX_PDF_SIZE_BYTES=15728640
   ```
   - **Opción A (Ejecución inmediata en modo Demo/Local sin Supabase):** Podés dejar los valores de ejemplo tal como están. La aplicación detectará automáticamente que no hay credenciales externas y ejecutará todas las pantallas y flujos sobre el almacén determinista en memoria.
   - **Opción B (Conectado a Supabase real):** Reemplazá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con las credenciales de tu proyecto Supabase y ejecutá las 7 migraciones de `supabase/migrations/` en orden (`0001` a `0007`) desde el SQL Editor o mediante `supabase db push`.

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 5. Scripts de Verificación y Pruebas

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo de Next.js en `http://localhost:3000`. |
| `npm run lint` | Ejecuta el análisis estático con ESLint sobre `src/`. |
| `npm run typecheck` | Verifica el tipado estricto de TypeScript (`tsc --noEmit`). |
| `npm test` | Ejecuta todas las suites de pruebas automatizadas en Vitest (unitarias, integración, E2E y auditoría de seguridad/RLS). |
| `npm run build` | Genera la compilación optimizada de producción con Next.js. |
| `npm start` | Inicia el servidor de producción tras ejecutar `npm run build`. |

---

## 6. Despliegue y Operación

Para instrucciones detalladas sobre:
- Orden de aplicación de las 7 migraciones SQL (`0001`..`0007`),
- Promoción del primer usuario administrador (`role = 'admin'`),
- Checklist de publicación en **Vercel** y configuración de URLs en **Supabase Auth**,
- Diagnóstico de errores comunes y recuperación segura en Git,

consultá [`docs/09-OPERACION-Y-RECUPERACION.md`](docs/09-OPERACION-Y-RECUPERACION.md) y [`docs/06-PLAN-DE-PRUEBAS.md`](docs/06-PLAN-DE-PRUEBAS.md).
