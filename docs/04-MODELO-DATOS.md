# 04. Modelo de Datos y Reglas de Negocio

## 1. Entidades Principales (PostgreSQL)
- **`profiles`**: `id` (UUID, PK = `auth.users.id` ON DELETE CASCADE), `display_name` (1..100 chars), `avatar_path`, `role` (`user` | `admin`, default `'user'`), `created_at`[cite: 2, 14, 25]. Implementada en `supabase/migrations/20261110000001_phase2_profiles_and_rls.sql` con trigger `on_auth_user_created` (`public.handle_new_user()`) y bloqueo de escalación de rol (`public.prevent_profile_role_escalation()`).
- **`subjects`**: `id` (UUID), `owner_id` (FK `profiles`), `title`, `description`, `visibility` (`private` | `public`), `status` (`draft` | `published` | `archived`), `published_at`, `created_at`, `updated_at`[cite: 4, 14, 15].
- **`topics`**: `id` (UUID), `subject_id` (FK `subjects`), `parent_topic_id` (FK opcional a `topics`), `title`, `description`, `sort_order`[cite: 14].
- **`documents`**: `id` (UUID), `owner_id` (FK `profiles`), `subject_id` (FK `subjects`), `topic_id` (opcional), `storage_path`, `filename`, `mime_type`, `size_bytes`, `status`, `created_at`[cite: 14].
- **`questions`**: `id` (UUID), `topic_id` (FK `topics`), `author_id` (FK `profiles`), `type` (`single_choice` | `true_false` | `multiple_select`), `prompt`, `explanation`, `difficulty`, `status` (`draft` | `published` | `archived`), `source_document_id` (opcional, ON DELETE SET NULL), `source_page` (opcional), `version` (int)[cite: 4, 5, 14, 17].
- **`question_options`**: `id` (UUID), `question_id` (FK `questions`), `text`, `is_correct` (boolean), `feedback`, `sort_order`[cite: 14].
- **`quiz_sessions`**: `id` (UUID), `user_id` (FK `profiles`), `subject_id` (FK `subjects`), `mode` (`practice` | `challenge` | `mistakes`), `settings_json`, `status`, `started_at`, `completed_at`, `score`, `accuracy`[cite: 6, 14].
- **`attempts`**: `id` (UUID), `session_id` (FK `quiz_sessions`), `user_id` (FK `profiles`), `question_id` (FK `questions`), `response_json`, `is_correct` (boolean), `elapsed_ms`, `answered_at`, `question_version` (int)[cite: 14].
- **`xp_events`**: `id` (UUID), `user_id` (FK `profiles`), `event_key` (UNIQUE para idempotencia), `event_type`, `points`, `reference_id`, `created_at`[cite: 6, 14].
- **`user_daily_activity`**: `id` (UUID), `user_id` (FK `profiles`), `activity_date`, `questions_answered`, `minutes_studied`, `UNIQUE(user_id, activity_date)`[cite: 14].

## 2. Reglas de Corrección y Validación
- **`single_choice`**: Mínimo 2 opciones y exactamente 1 correcta[cite: 17]. El ID enviado debe pertenecer a la pregunta y coincidir con la opción correcta[cite: 17].
- **`true_false`**: Respuesta booleana/opción fija definida; comparación exacta[cite: 5, 17].
- **`multiple_select`**: Al menos 1 opción correcta y 1 incorrecta[cite: 17]. El conjunto de IDs seleccionados debe coincidir exactamente con el conjunto correcto[cite: 5, 14, 17].
- **Visibilidad pública:** Solo se listan en el catálogo público los registros con `visibility = 'public' AND status = 'published'`[cite: 4, 15].