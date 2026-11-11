# 05. Seguridad, Privacidad y Matriz RLS

## 1. Principios de Seguridad
- Activar Row Level Security (RLS) en todas las tablas expuestas a la API[cite: 18, 25].
- Crear políticas separadas para `SELECT`, `INSERT`, `UPDATE` y `DELETE`[cite: 18].
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` ni secretos en el cliente o en Git[cite: 16, 18, 25].
- No confiar en el campo `role` enviado desde el frontend; validarlo siempre en servidor y base de datos[cite: 5, 14, 18, 25].
- Aplicar políticas en Supabase Storage por separado (las políticas SQL de tablas no protegen buckets automáticamente)[cite: 18, 25].
- Acceder a documentos PDF privados únicamente mediante URLs firmadas temporales[cite: 5, 18].

## 2. Matriz Mínima RLS
| Recurso | Usuario propietario | Otro usuario | Administrador (`admin`) |
| :--- | :--- | :--- | :--- |
| **Perfil (`public.profiles`)** | `SELECT` y `UPDATE` propio (`display_name`, `avatar_path`); prohibido cambiar `role` | Sin acceso | `SELECT`, `UPDATE` y `DELETE` mediante `public.is_admin()` |
| **Materia / Tema privado (`subjects`, `topics`)** | CRUD propio (`owner_id = auth.uid()` y `can_write_subject`) | Sin acceso | Sin acceso rutinario a materias privadas ajenas[cite: 18] |
| **Materia / Tema público (`visibility = 'public'`)** | Lectura si `status = 'published'` | Lectura si `status = 'published'` | CRUD y publicación (`public.is_admin()` + trigger `enforce_subject_publication_rules`)[cite: 18] |
| **Preguntas y Opciones (`questions`, `question_options`)** | CRUD sobre preguntas de sus materias privadas (`can_write_subject`); lectura pública solo si materia y pregunta tienen `status = 'published'` | Sin acceso a preguntas privadas ajenas ni a borradores (`draft`) | CRUD y publicación sobre preguntas de materias públicas (`public.is_admin()`)[cite: 17, 18] |
| **Intento / Sesión / Resultado (`quiz_sessions`, `attempts`)** | Lectura, creación y cierre propios (`user_id = auth.uid()` y `enforce_attempt_integrity`) | Sin acceso | Sin acceso rutinario al detalle personal[cite: 18] |
| **PDF privado (`public.documents` y `storage.objects` bucket `study-documents`)** | Acceso propio (`owner_id = auth.uid()` y `(storage.foldername(name))[1] = auth.uid()::text`) mediante URL firmada temporal | Sin acceso | Sin acceso por defecto[cite: 7, 18] |
| **XP y racha (`xp_events`, `user_daily_activity`)** | Lectura e inserción propias (`user_id = auth.uid()`); `xp_events` inmutable (`UPDATE` denegado) y validado por `enforce_xp_event_integrity` | Sin acceso | Sin modificación manual ordinaria[cite: 18] |
| **Auditoría administrativa (`admin_audit_logs`)** | Sin acceso | Sin acceso | `SELECT` e `INSERT` exclusivos para `public.is_admin()`; inmutable (`UPDATE` y `DELETE` denegados) |