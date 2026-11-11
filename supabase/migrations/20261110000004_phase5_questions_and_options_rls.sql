-- ============================================================================
-- StudyPlay — Migración 0004 (Fase 5: Tablas questions y question_options + RLS)
-- Fecha: 2026-11-11
-- Referencias: docs/04-MODELO-DATOS.md, docs/05-SEGURIDAD-RLS.md, ADR-0002
-- ============================================================================

-- 1. Tabla public.questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('single_choice', 'true_false', 'multiple_select')),
  prompt TEXT NOT NULL CHECK (char_length(trim(prompt)) BETWEEN 1 AND 2000),
  explanation TEXT NOT NULL DEFAULT '' CHECK (char_length(explanation) <= 3000),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  source_document_id UUID NULL REFERENCES public.documents(id) ON DELETE SET NULL,
  source_document_name TEXT NULL CHECK (source_document_name IS NULL OR char_length(trim(source_document_name)) BETWEEN 1 AND 200),
  source_page INT NULL CHECK (source_page IS NULL OR source_page >= 1),
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.questions IS 'Banco de preguntas deterministas (single_choice, true_false, multiple_select) con versionado y vínculo opcional a PDF (ON DELETE SET NULL).';

CREATE INDEX IF NOT EXISTS idx_questions_topic_status
  ON public.questions (topic_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_questions_author_updated
  ON public.questions (author_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_questions_source_doc
  ON public.questions (source_document_id)
  WHERE source_document_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_questions_updated_at ON public.questions;
CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Tabla public.question_options
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(trim(text)) BETWEEN 1 AND 1000),
  is_correct BOOLEAN NOT NULL DEFAULT false,
  feedback TEXT NOT NULL DEFAULT '' CHECK (char_length(feedback) <= 1000),
  sort_order INT NOT NULL DEFAULT 1 CHECK (sort_order >= 0)
);

COMMENT ON TABLE public.question_options IS 'Opciones de respuesta y feedback individual por opción para cada pregunta determinista.';

CREATE INDEX IF NOT EXISTS idx_question_options_question_sort
  ON public.question_options (question_id, sort_order ASC);

-- 3. Trigger de integridad referencial, versionado y validación de publicación en public.questions
CREATE OR REPLACE FUNCTION public.enforce_question_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_id UUID;
  v_subject_owner UUID;
  v_subject_visibility TEXT;
  v_doc_owner UUID;
  v_doc_subject UUID;
  v_doc_filename TEXT;
  v_total_options INT;
  v_correct_options INT;
  v_incorrect_options INT;
BEGIN
  -- 3.1 Resolver la materia a la que pertenece el tema
  SELECT t.subject_id, s.owner_id, s.visibility
    INTO v_subject_id, v_subject_owner, v_subject_visibility
  FROM public.topics t
  INNER JOIN public.subjects s ON s.id = t.subject_id
  WHERE t.id = NEW.topic_id;

  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_QUESTION_TOPIC: El tema indicado no existe.';
  END IF;

  -- 3.2 Verificar que author_id sea propietario de la materia o admin sobre materia pública
  IF v_subject_owner <> NEW.author_id
     AND NOT (v_subject_visibility = 'public' AND public.is_admin())
     AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN_QUESTION_AUTHOR: No tienes permiso para crear o modificar preguntas en este tema.';
  END IF;

  -- 3.3 Si se vincula un documento PDF fuente, validar propiedad, materia y preservar source_document_name
  IF NEW.source_document_id IS NOT NULL THEN
    SELECT owner_id, subject_id, filename
      INTO v_doc_owner, v_doc_subject, v_doc_filename
    FROM public.documents
    WHERE id = NEW.source_document_id;

    IF v_doc_owner IS NULL OR v_doc_owner <> NEW.author_id OR v_doc_subject <> v_subject_id THEN
      RAISE EXCEPTION 'INVALID_SOURCE_DOCUMENT: El documento PDF fuente debe pertenecer al mismo propietario y materia.';
    END IF;

    NEW.source_document_name := COALESCE(NULLIF(trim(NEW.source_document_name), ''), v_doc_filename);
  END IF;

  -- 3.4 Incremento automático de version en UPDATE si cambia contenido sustantivo
  IF TG_OP = 'UPDATE' THEN
    IF NEW.prompt IS DISTINCT FROM OLD.prompt
       OR NEW.explanation IS DISTINCT FROM OLD.explanation
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.difficulty IS DISTINCT FROM OLD.difficulty THEN
      NEW.version := GREATEST(OLD.version + 1, NEW.version);
    END IF;
  END IF;

  -- 3.5 Validación de reglas de publicación cuando status = 'published'
  IF NEW.status = 'published' THEN
    IF char_length(trim(NEW.prompt)) < 5 THEN
      RAISE EXCEPTION 'EMPTY_QUESTION_PROMPT: El enunciado debe tener al menos 5 caracteres para publicarse.';
    END IF;

    IF char_length(trim(NEW.explanation)) < 5 THEN
      RAISE EXCEPTION 'MISSING_GENERAL_EXPLANATION: La explicación general es obligatoria para publicar una pregunta.';
    END IF;

    -- En UPDATE a published (cuando las opciones ya están persistidas), validar estructura por tipo
    IF TG_OP = 'UPDATE' THEN
      SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE is_correct = true),
        COUNT(*) FILTER (WHERE is_correct = false)
      INTO v_total_options, v_correct_options, v_incorrect_options
      FROM public.question_options
      WHERE question_id = NEW.id;

      IF v_total_options > 0 THEN
        IF NEW.type = 'single_choice' AND (v_total_options < 2 OR v_correct_options <> 1) THEN
          RAISE EXCEPTION 'INVALID_SINGLE_CHOICE_CORRECT_COUNT: Una pregunta single_choice requiere al menos 2 opciones y exactamente 1 correcta.';
        ELSIF NEW.type = 'true_false' AND (v_total_options <> 2 OR v_correct_options <> 1) THEN
          RAISE EXCEPTION 'INVALID_TRUE_FALSE_CONFIG: Una pregunta true_false requiere exactamente 2 opciones y 1 correcta.';
        ELSIF NEW.type = 'multiple_select' AND (v_total_options < 2 OR v_correct_options < 1 OR v_incorrect_options < 1) THEN
          RAISE EXCEPTION 'INVALID_MULTIPLE_SELECT_CONFIG: Una pregunta multiple_select requiere al menos 1 opción correcta y 1 incorrecta.';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_question_integrity ON public.questions;
CREATE TRIGGER trg_enforce_question_integrity
  BEFORE INSERT OR UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_question_integrity();

-- 4. Funciones auxiliares de acceso para políticas RLS de questions y question_options
CREATE OR REPLACE FUNCTION public.can_read_question(p_question_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.questions q
    INNER JOIN public.topics t ON t.id = q.topic_id
    INNER JOIN public.subjects s ON s.id = t.subject_id
    WHERE q.id = p_question_id
      AND (
        s.owner_id = auth.uid()
        OR (s.visibility = 'public' AND public.is_admin())
        OR (s.visibility = 'public' AND s.status = 'published' AND q.status = 'published')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_question(p_question_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.questions q
    INNER JOIN public.topics t ON t.id = q.topic_id
    WHERE q.id = p_question_id
      AND public.can_write_subject(t.subject_id)
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_question(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_question(UUID) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_write_question(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_write_question(UUID) TO authenticated, service_role;

-- 5. Políticas RLS separadas para public.questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS questions_select_policy ON public.questions;
CREATE POLICY questions_select_policy
  ON public.questions
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.topics t
      INNER JOIN public.subjects s ON s.id = t.subject_id
      WHERE t.id = questions.topic_id
        AND (
          s.owner_id = auth.uid()
          OR (s.visibility = 'public' AND public.is_admin())
          OR (s.visibility = 'public' AND s.status = 'published' AND questions.status = 'published')
        )
    )
  );

DROP POLICY IF EXISTS questions_insert_policy ON public.questions;
CREATE POLICY questions_insert_policy
  ON public.questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.topics t
      WHERE t.id = questions.topic_id
        AND public.can_write_subject(t.subject_id)
    )
  );

DROP POLICY IF EXISTS questions_update_policy ON public.questions;
CREATE POLICY questions_update_policy
  ON public.questions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.topics t
      WHERE t.id = questions.topic_id
        AND public.can_write_subject(t.subject_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.topics t
      WHERE t.id = questions.topic_id
        AND public.can_write_subject(t.subject_id)
    )
  );

DROP POLICY IF EXISTS questions_delete_policy ON public.questions;
CREATE POLICY questions_delete_policy
  ON public.questions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.topics t
      WHERE t.id = questions.topic_id
        AND public.can_write_subject(t.subject_id)
    )
  );

-- 6. Políticas RLS separadas para public.question_options
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS question_options_select_policy ON public.question_options;
CREATE POLICY question_options_select_policy
  ON public.question_options
  FOR SELECT
  TO anon, authenticated
  USING (public.can_read_question(question_id));

DROP POLICY IF EXISTS question_options_insert_policy ON public.question_options;
CREATE POLICY question_options_insert_policy
  ON public.question_options
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_question(question_id));

DROP POLICY IF EXISTS question_options_update_policy ON public.question_options;
CREATE POLICY question_options_update_policy
  ON public.question_options
  FOR UPDATE
  TO authenticated
  USING (public.can_write_question(question_id))
  WITH CHECK (public.can_write_question(question_id));

DROP POLICY IF EXISTS question_options_delete_policy ON public.question_options;
CREATE POLICY question_options_delete_policy
  ON public.question_options
  FOR DELETE
  TO authenticated
  USING (public.can_write_question(question_id));
