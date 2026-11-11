# Changelog

## [0.8.0] - Fase 7: Progreso y Gamificación
- Creación de la migración SQL (`supabase/migrations/20261110000006_phase7_progress_and_gamification_rls.sql`) para `public.xp_events` (`event_key TEXT NOT NULL UNIQUE`, `points > 0`) y `public.user_daily_activity` (`UNIQUE(user_id, activity_date)`), triggers `enforce_xp_event_integrity` y `enforce_daily_activity_integrity`, y políticas RLS separadas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) por `user_id = auth.uid()`.
- Implementación de reglas puras y contratos en `src/domain/gamification/` y `src/domain/progress/` (parámetros centralizados `+10`, `+20`, `+30`, `+50`, constructores deterministas de `event_key`, cálculo de nivel, racha consecutiva `calculateConsecutiveStreak`, agregación de estadísticas por materia/tema y clasificación de dominio exigiendo muestra mínima `>= 5` intentos y precisión `>= 80%`).
- Implementación de casos de uso en `src/application/progress/progress.use-cases.ts` (`awardIdempotentXpUseCase`, `recordAttemptGamificationUseCase`, `recordQuizCompletionGamificationUseCase`, `getSessionXpBreakdownUseCase`, `getUserProgressUseCase`), integración automática en `submitAnswerUseCase` y `completeQuizUseCase`, `SupabaseProgressRepository` y soporte completo en `InMemoryStudyCatalogStore`.
- Conexión de datos reales en `/app` (Dashboard), `/app/progress` (Estadísticas detalladas y registro auditable de `xp_events`) y `/app/sessions/[id]/result` (desglose de XP ganado en la partida).
- Adición de suites de pruebas en Vitest (`gamification-progress.rules.test.ts` y `progress.use-cases.test.ts`) cubriendo el Caso Imprescindible #8 (idempotencia de `xp_events` ante reintentos de red), regla de muestra mínima de 5 intentos para `mastered` (`+50 XP`), objetivo diario (`+30 XP`), racha consecutiva y aislamiento de estadísticas entre usuarios.

## [0.7.0] - Fase 6: Motor de Juego y Corrección Determinista
- Creación de la migración SQL (`supabase/migrations/20261110000005_phase6_quiz_sessions_and_attempts_rls.sql`) para `public.quiz_sessions` y `public.attempts` con `UNIQUE (session_id, question_id)`, captura automática de `question_version`, triggers `enforce_quiz_session_integrity` y `enforce_attempt_integrity` (bloqueo de sesiones ajenas o cerradas `SESSION_CLOSED`) y políticas RLS separadas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) por `user_id = auth.uid()`.
- Implementación del motor de corrección determinista en `src/domain/quizzes/` y `src/domain/attempts/` (`evaluateQuestionAnswer` para `single_choice`, `true_false` y `multiple_select`, `shuffleWithSeed` reproducible por semilla, `selectEligibleQuizQuestions` y `buildMistakeQuestionQueue` sin borrar el historial).
- Implementación de casos de uso en `src/application/quizzes/quizzes.use-cases.ts` (`startQuizUseCase`, `submitAnswerUseCase`, `completeQuizUseCase`, `getQuizSessionDetailsUseCase`, `getMistakeQuestionsUseCase`), `SupabaseQuizzesRepository` y soporte completo en `InMemoryStudyCatalogStore`.
- Conexión de componentes interactivos y Server Actions (`StartQuizForm`, `QuizSessionPlayer`, `StartMistakesQuizButton`, `quizzes.actions.ts`) en `/app/quizzes/new`, `/app/quizzes/[id]`, `/app/sessions/[id]/result` y `/app/review`.
- Adición de suites de pruebas en Vitest (`quizzes.rules.test.ts` y `quizzes.use-cases.test.ts`) cubriendo los Casos Imprescindibles #6, #7 y #9, idempotencia de intentos con captura de `question_version`, orden reproducible con `seed` y Modo Repaso de Errores.

## [0.6.0] - Fase 5: Preguntas y Editor Determinista
- Creación de la migración SQL (`supabase/migrations/20261110000004_phase5_questions_and_options_rls.sql`) para `public.questions` y `public.question_options` con `source_document_id REFERENCES public.documents(id) ON DELETE SET NULL`, `source_document_name`, trigger `enforce_question_integrity` (autocompletado de fuente, incremento automático de `version` y validación de publicación), funciones `can_read_question`/`can_write_question` y políticas RLS separadas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- Implementación de reglas puras y contratos en `src/domain/questions/` (validación flexible en `draft` vs. validación estricta en `published` para `single_choice`, `true_false` y `multiple_select`, cálculo de `version` `computeNextQuestionVersion` y estado `"Fuente no disponible"`).
- Implementación de casos de uso en `src/application/questions/questions.use-cases.ts`, `SupabaseQuestionsRepository` y soporte completo en `InMemoryStudyCatalogStore` incluyendo el comportamiento `ON DELETE SET NULL` preservando `sourceDocumentName` cuando se elimina un PDF.
- Construcción del editor dinámico y banco de preguntas (`QuestionEditorForm`, `QuestionBankList`, `questions.actions.ts`) con vista previa interactiva como estudiante, conectados en `/app/topics/[id]`, `/app/subjects/[id]` y `/library/[id]`.
- Adición de suites de pruebas en Vitest (`questions.rules.test.ts` y `questions.use-cases.test.ts`) verificando bloqueo de publicación de preguntas mal configuradas por tipo, incremento de `version`, preservación de preguntas al borrar su PDF fuente y aislamiento RLS entre usuarios.

## [0.5.0] - Fase 4: Documentos PDF y Storage Privado
- Creación de la migración SQL (`supabase/migrations/20261110000003_phase4_documents_and_storage_rls.sql`) para `public.documents` con restricciones MIME `application/pdf`, límite de 15 MB (`15_728_640` bytes), trigger `enforce_document_integrity`, políticas RLS separadas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) y provisión del bucket privado `study-documents` con políticas RLS sobre `storage.objects` (`{user_id}/{document_id}/{filename}`).
- Implementación de reglas puras y contratos en `src/domain/documents/` (validación de extensión `.pdf`, MIME `application/pdf`, firma de cabecera `%PDF-`, sanitización determinista de nombre de archivo, máquina de estados `uploading -> available / failed` con reintento idempotente y aislamiento estricto por propietario).
- Implementación de casos de uso en `src/application/documents/` y adaptadores en `src/infrastructure/storage/supabase-private-storage.adapter.ts`, `src/infrastructure/supabase/supabase-documents.repository.ts` y `InMemoryStudyCatalogStore`, incluyendo generación de URLs firmadas temporales (5 min) y eliminación segura preservando las preguntas asociadas (`"Fuente no disponible"`).
- Conexión de Server Actions y componentes interactivos (`UploadDocumentForm`, `DocumentListCard`) en `/app/documents`, `/app/subjects/[id]` y `/app/topics/[id]`.
- Adición de suites de pruebas en Vitest cubriendo límites de tamaño, archivos corruptos/inválidos, reintentos idempotentes sin duplicados y el Caso Imprescindible #10 (`Usuario B` no puede acceder, firmar URL ni eliminar el PDF privado del `Usuario A`).

## [0.4.0] - Fase 3: Datos, Materias y Temas
- Creación de la migración SQL (`supabase/migrations/20261110000002_phase3_subjects_topics_and_rls.sql`) para `public.subjects` y `public.topics` con jerarquía `parent_topic_id`, `sort_order`, índices, triggers (`set_updated_at`, `enforce_subject_publication_rules`, `enforce_topic_hierarchy_integrity`) y políticas RLS separadas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- Implementación de reglas puras y contratos en `src/domain/subjects/` y `src/domain/topics/` (validación de visibilidad pública exclusiva para `admin`, aislamiento de propietarios, prevención de ciclos jerárquicos `wouldCreateTopicCycle` y árbol ordenado `buildOrderedTopicTree`).
- Implementación de casos de uso (`src/application/subjects/` y `src/application/topics/`) y adaptadores (`SupabaseSubjectsRepository`, `SupabaseTopicsRepository`, `InMemoryStudyCatalogStore`).
- Conexión de Server Actions y formularios interactivos en `/app/subjects`, `/app/subjects/new`, `/app/subjects/[id]`, `/app/topics/[id]`, `/library` y `/library/[id]`.
- Adición de pruebas unitarias y de integración en Vitest cubriendo los Casos Imprescindibles #3, #4 y #5, restricción de catálogo público por rol y jerarquía de temas sin ciclos.

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