# Changelog

## [0.3.0] - Fase 2: Supabase y Autenticación
- Integración de `@supabase/supabase-js` y `@supabase/ssr` con detección segura `isSupabaseConfigured()` y protección de `SUPABASE_SERVICE_ROLE_KEY` en `src/config/env.ts`.
- Creación de la primera migración SQL reproducible (`supabase/migrations/20261110000001_phase2_profiles_and_rls.sql`) con tabla `public.profiles`, función `public.is_admin()`, trigger `on_auth_user_created` (rol inicial `'user'`), trigger `prevent_profile_role_escalation` y políticas RLS separadas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- Implementación de arquitectura de autenticación en capas (`src/domain/auth/`, `src/application/auth/`, `src/infrastructure/supabase/`, `src/features/auth/`) conectada a `/login`, `/register`, `/forgot-password` y `/profile`.
- Implementación de `src/middleware.ts` para protección de `/app/*` y `/profile` (usuarios autenticados) y `/admin/*` (exclusivo rol `admin` verificado en servidor).
- Adición de pruebas unitarias y de integración en Vitest para validación de credenciales, protección de rutas, autorización por rol y prevención de escalación de privilegios o edición cruzada entre usuarios.

## [0.2.0] - Fase 1: Base Visual y Navegación
- Inicialización aditiva de Next.js (App Router), TypeScript estricto, Tailwind CSS y Vitest conservando `/docs` y archivos base.
- Creación de `.gitignore` y `.env.example` sin secretos expuestos (`ENABLE_AI_FEATURES=false`, `MAX_PDF_SIZE_BYTES=15728640`).
- Definición de tokens visuales en modo oscuro (azul marino/gris, superficies elevadas, acentos azul/violeta y colores semánticos verde/rojo/ámbar acompañados siempre de iconos y texto accesible).
- Construcción de arquitectura modular bajo `src/` (`config`, `shared`, `domain`, `application`, `infrastructure`, `features`, `components`, `app`) incluyendo puertos conceptuales desacoplados para IA futura (`DocumentTextExtractor`, `QuestionDraftGenerator`, `StudyAssistant`).
- Implementación de layouts público y autenticado de prueba, navegación responsive y las 19 rutas especificadas en `docs/02-UX-Y-PANTALLAS.md` con datos ficticios y simulador de estados explícitos (poblado, vacío, carga, error).

## [0.1.0] - Fase 0: Preparación y Documentación Base
- Creación de estructura base del repositorio y carpeta `/docs` según Plan Maestro v1.0[cite: 1, 20, 26].