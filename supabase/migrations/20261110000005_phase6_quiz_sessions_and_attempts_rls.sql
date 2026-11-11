-- ============================================================================
-- StudyPlay — Migración 0005 (Fase 6: Tablas quiz_sessions y attempts + RLS)
-- Fecha: 2026-11-11
-- Referencias: docs/04-MODELO-DATOS.md, docs/05-SEGURIDAD-RLS.md, docs/06-PLAN-DE-PRUEBAS.md
-- ============================================================================

-- 1. Tabla public.quiz_sessions
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'challenge', 'mistakes')),
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0),
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 100)
);

COMMENT ON TABLE public.quiz_sessions IS 'Sesiones de cuestionario por estudiante en modos practice, challenge y mistakes.';

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_started
  ON public.quiz_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_subject_status
  ON public.quiz_sessions (subject_id, status);

-- 2. Trigger de integridad y cierre de sesión en public.quiz_sessions
CREATE OR REPLACE FUNCTION public.enforce_quiz_session_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 2.1 En INSERT, verificar que el estudiante tenga permiso de lectura sobre la materia
  IF TG_OP = 'INSERT' THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
       AND NOT public.can_read_subject(NEW.subject_id) THEN
      RAISE EXCEPTION 'FORBIDDEN_SUBJECT_ACCESS: No tienes permiso para iniciar un cuestionario sobre esta materia.';
    END IF;
  END IF;

  -- 2.2 En UPDATE, prohibir reabrir o alterar una sesión ya cerrada (completed o abandoned)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.user_id <> NEW.user_id OR OLD.subject_id <> NEW.subject_id THEN
      RAISE EXCEPTION 'IMMUTABLE_SESSION_OWNER: No se puede cambiar el propietario ni la materia de una sesión.';
    END IF;

    IF OLD.status IN ('completed', 'abandoned') AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'SESSION_CLOSED: La sesión ya se encuentra cerrada y no puede reabrirse.';
    END IF;
  END IF;

  -- 2.3 Sellar completed_at automáticamente cuando pasa a completed
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quiz_session_integrity ON public.quiz_sessions;
CREATE TRIGGER trg_enforce_quiz_session_integrity
  BEFORE INSERT OR UPDATE ON public.quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quiz_session_integrity();

-- 3. Tabla public.attempts
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  response_json JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  elapsed_ms INT NOT NULL DEFAULT 0 CHECK (elapsed_ms >= 0),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  question_version INT NOT NULL DEFAULT 1 CHECK (question_version >= 1),
  CONSTRAINT uq_attempts_session_question UNIQUE (session_id, question_id)
);

COMMENT ON TABLE public.attempts IS 'Intentos individuales por pregunta dentro de una sesión con unicidad (session_id, question_id) y captura de question_version.';

CREATE INDEX IF NOT EXISTS idx_attempts_session_answered
  ON public.attempts (session_id, answered_at ASC);

CREATE INDEX IF NOT EXISTS idx_attempts_user_mistakes
  ON public.attempts (user_id, is_correct, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_attempts_question
  ON public.attempts (question_id);

-- 4. Trigger de integridad en public.attempts (Caso Imprescindible #9: bloqueo de sesión ajena o SESSION_CLOSED)
CREATE OR REPLACE FUNCTION public.enforce_attempt_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_user UUID;
  v_session_subject UUID;
  v_session_status TEXT;
  v_question_subject UUID;
  v_question_status TEXT;
  v_question_version INT;
BEGIN
  -- 4.1 Verificar existencia, propiedad y estado abierto de la sesión
  SELECT user_id, subject_id, status
    INTO v_session_user, v_session_subject, v_session_status
  FROM public.quiz_sessions
  WHERE id = NEW.session_id;

  IF v_session_user IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND: La sesión de cuestionario no existe.';
  END IF;

  IF v_session_user <> NEW.user_id THEN
    RAISE EXCEPTION 'FORBIDDEN_SESSION_OWNER: No puedes enviar respuestas a una sesión de otro usuario.';
  END IF;

  IF v_session_status <> 'in_progress' THEN
    RAISE EXCEPTION 'SESSION_CLOSED: No se pueden enviar respuestas a una sesión cerrada o completada.';
  END IF;

  -- 4.2 Verificar que la pregunta pertenezca a la materia de la sesión, esté publicada y capturar su version actual
  SELECT t.subject_id, q.status, q.version
    INTO v_question_subject, v_question_status, v_question_version
  FROM public.questions q
  INNER JOIN public.topics t ON t.id = q.topic_id
  WHERE q.id = NEW.question_id;

  IF v_question_subject IS NULL OR v_question_subject <> v_session_subject THEN
    RAISE EXCEPTION 'QUESTION_NOT_IN_SESSION: La pregunta no pertenece a la materia de la sesión activa.';
  END IF;

  IF v_question_status <> 'published' THEN
    RAISE EXCEPTION 'UNPUBLISHED_QUESTION: Solo se pueden responder preguntas en estado published.';
  END IF;

  NEW.question_version := COALESCE(NULLIF(NEW.question_version, 0), v_question_version);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_attempt_integrity ON public.attempts;
CREATE TRIGGER trg_enforce_attempt_integrity
  BEFORE INSERT OR UPDATE ON public.attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_attempt_integrity();

-- 5. Políticas RLS separadas para public.quiz_sessions (estrictamente privadas por user_id = auth.uid())
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_sessions_select_own_policy ON public.quiz_sessions;
CREATE POLICY quiz_sessions_select_own_policy
  ON public.quiz_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS quiz_sessions_insert_own_policy ON public.quiz_sessions;
CREATE POLICY quiz_sessions_insert_own_policy
  ON public.quiz_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_read_subject(subject_id)
  );

DROP POLICY IF EXISTS quiz_sessions_update_own_policy ON public.quiz_sessions;
CREATE POLICY quiz_sessions_update_own_policy
  ON public.quiz_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS quiz_sessions_delete_own_policy ON public.quiz_sessions;
CREATE POLICY quiz_sessions_delete_own_policy
  ON public.quiz_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 6. Políticas RLS separadas para public.attempts (estrictamente privadas por user_id = auth.uid())
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attempts_select_own_policy ON public.attempts;
CREATE POLICY attempts_select_own_policy
  ON public.attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS attempts_insert_own_policy ON public.attempts;
CREATE POLICY attempts_insert_own_policy
  ON public.attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS attempts_update_own_policy ON public.attempts;
CREATE POLICY attempts_update_own_policy
  ON public.attempts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS attempts_delete_own_policy ON public.attempts;
CREATE POLICY attempts_delete_own_policy
  ON public.attempts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
