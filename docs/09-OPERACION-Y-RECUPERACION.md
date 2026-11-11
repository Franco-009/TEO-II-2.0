# 09. Operación, Despliegue, Diagnóstico y Recuperación (v1.0.0)

## 1. Variables de Entorno y Frontera de Seguridad

| Variable | Ámbito | Obligatoria en Prod | Propósito y Regla de Seguridad |
| :--- | :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y Servidor | Sí | URL pública del proyecto Supabase (`https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y Servidor | Sí | Clave anónima pública sujeta siempre a las políticas Row Level Security (RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo Servidor** | Opcional (tareas admin/seed) | **Secreto crítico.** Nunca exponer con prefijo `NEXT_PUBLIC_` ni importar en componentes `"use client"`. `getServerServiceRoleKey()` lanza `SECURITY_VIOLATION` si se invoca en navegador. |
| `ENABLE_AI_FEATURES` | Servidor / Dominio | No (`false` por defecto) | Mantener en `false` en v1.0.0. Todo el motor de estudio y corrección funciona de manera 100% determinista sin claves de IA. |
| `MAX_PDF_SIZE_BYTES` | Servidor / Dominio | No (`15728640` por defecto) | Tamaño máximo permitido por archivo PDF subido al bucket privado `study-documents` (15 MB). |

> **Modo Demo / Desarrollo Local sin credenciales externas:** Si `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` no están configuradas (o conservan los valores de `.env.example`), `isSupabaseConfigured()` devuelve `false` y el sistema utiliza automáticamente `InMemoryStudyCatalogStore`, permitiendo ejecutar toda la aplicación, las 19 rutas y la suite de pruebas sin conexión a red.

---

## 2. Orden de Aplicación de Migraciones SQL en Supabase

Las migraciones en `supabase/migrations/` son incrementales e idempotentes. Deben aplicarse exactamente en este orden:

1. `20261110000001_phase2_profiles_and_rls.sql` — Tabla `public.profiles`, función `public.is_admin()`, trigger `on_auth_user_created` (`role = 'user'`) y prevención de escalación de privilegios.
2. `20261110000002_phase3_subjects_topics_and_rls.sql` — Tablas `public.subjects` y `public.topics`, jerarquía de temas sin ciclos y reglas de visibilidad.
3. `20261110000003_phase4_documents_and_storage_rls.sql` — Tabla `public.documents`, bucket privado `study-documents` (límite 15 MB, MIME `application/pdf`) y políticas RLS sobre `storage.objects`.
4. `20261110000004_phase5_questions_and_options_rls.sql` — Tablas `public.questions` y `public.question_options`, versionado automático y preservación `ON DELETE SET NULL` de fuente PDF.
5. `20261110000005_phase6_quiz_sessions_and_attempts_rls.sql` — Tablas `public.quiz_sessions` y `public.attempts`, restricción `UNIQUE (session_id, question_id)` y bloqueo `SESSION_CLOSED`.
6. `20261110000006_phase7_progress_and_gamification_rls.sql` — Tablas `public.xp_events` (`event_key UNIQUE`) y `public.user_daily_activity` (`UNIQUE (user_id, activity_date)`).
7. `20261110000007_phase8_admin_moderation_and_public_library_rls.sql` — Tabla inmutable `public.admin_audit_logs` y validación estricta de elegibilidad para publicar en el catálogo público (`>= 1` tema y `>= 1` pregunta publicada).

### Promoción Inicial de un Administrador
Por diseño de seguridad, todo usuario registrado nace con `role = 'user'`. Para promover la cuenta administradora inicial desde el SQL Editor de Supabase (ejecutado como `postgres` / `service_role`):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-admin@dominio.com';
```

---

## 3. Checklist de Despliegue en Vercel

1. **Conectar repositorio Git:** Importar el proyecto en Vercel y configurar el **Root Directory** apuntando a la carpeta del proyecto Next.js (`TEO-II-2.0` si se despliega desde el contenedor padre, o `./` si el repositorio raíz es el proyecto).
2. **Configurar Variables de Entorno en Vercel:**
   - Definir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ENABLE_AI_FEATURES=false` y `MAX_PDF_SIZE_BYTES=15728640`.
   - Si se configura `SUPABASE_SERVICE_ROLE_KEY`, marcarla exclusivamente para el entorno de servidor y nunca con `NEXT_PUBLIC_`.
3. **Configurar URLs de Redirección en Supabase Auth:**
   - En *Supabase Dashboard -> Authentication -> URL Configuration*, establecer `Site URL` con el dominio de producción en Vercel y añadir `https://<tu-dominio>.vercel.app/**` en *Redirect URLs*.
4. **Verificación Post-Despliegue (Smoke Check):**
   - Comprobar acceso público a `/`, `/library`, `/login` y `/register`.
   - Comprobar que `/app` y `/admin` redirigen a `/login` para visitantes no autenticados.
   - Registrar un usuario de prueba, crear una materia, un tema, una pregunta publicada y completar una partida verificando que se otorguen los puntos XP sin duplicación.

---

## 4. Comandos de Verificación y Diagnóstico

Ejecutar siempre antes de cada commit o despliegue:

```bash
npm run lint        # Verifica reglas de ESLint sin advertencias ni errores
npm run typecheck   # Verifica tipos estrictos con tsc --noEmit
npm test            # Ejecuta las 19 suites de pruebas (unitarias, integración, E2E y auditoría RLS/seguridad)
npm run build       # Compila el build de producción de Next.js
```

### Guía Rápida de Diagnóstico de Problemas Comunes
- **Error `FORBIDDEN_ADMIN_ONLY` o redirección `/app?error=forbidden_admin`:** El usuario autenticado tiene `role = 'user'` en `public.profiles`. Verificar su rol con la consulta SQL de promoción de administrador.
- **Error `PUBLICATION_REQUIREMENTS_NOT_MET` al publicar materia pública:** Una materia con `visibility = 'public'` requiere al menos 1 tema creado y al menos 1 pregunta en estado `published` con explicación no vacía antes de pasar a `status = 'published'`.
- **Error `SESSION_CLOSED` al enviar respuesta:** La sesión de cuestionario ya fue completada o abandonada; el motor bloquea nuevos intentos para preservar la integridad del puntaje histórico.
- **Pregunta muestra `"Fuente no disponible"`:** El documento PDF original vinculado a la pregunta fue eliminado por su propietario. El comportamiento es intencional (`ON DELETE SET NULL` conservando `source_document_name`) para no perder preguntas de práctica.

---

## 5. Reglas Operativas de Recuperación en Git y Base de Datos
- **Inmutabilidad de migraciones:** Nunca borrar ni editar migraciones SQL ya aplicadas en producción; crear siempre una nueva migración incremental (`20261110000008_...sql`).
- **Inspección previa:** Nunca ejecutar comandos destructivos sin revisar antes `git status --short` y `git diff`.
- **Restauración quirúrgica de archivos:** Si un archivo se modifica o borra por accidente, recuperarlo de forma aislada con:
  ```bash
  git restore --source=<commit> -- ruta/al/archivo
  ```
- **Reversión segura de entregas:** En ramas compartidas o desplegadas, utilizar `git revert <commit>` en lugar de reescribir el historial con `git reset --hard`.
