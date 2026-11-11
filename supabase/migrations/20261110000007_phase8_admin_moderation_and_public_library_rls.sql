-- ============================================================================
-- StudyPlay — Migración 0007 (Fase 8: Moderación administrativa, bitácora admin_audit_logs y reglas de catálogo público + RLS)
-- Fecha: 2026-11-11
-- Referencias: docs/04-MODELO-DATOS.md, docs/05-SEGURIDAD-RLS.md, docs/06-PLAN-DE-PRUEBAS.md
-- ============================================================================

-- 1. Tabla public.admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (
    action IN (
      'publish_subject',
      'unpublish_subject_to_draft',
      'archive_subject',
      'create_public_subject'
    )
  ),
  target_type TEXT NOT NULL DEFAULT 'subject' CHECK (
    target_type IN ('subject', 'question_bank')
  ),
  target_id UUID NOT NULL,
  target_title TEXT NOT NULL CHECK (char_length(btrim(target_title)) BETWEEN 1 AND 160),
  previous_status TEXT NULL CHECK (
    previous_status IS NULL OR previous_status IN ('draft', 'published', 'archived')
  ),
  new_status TEXT NOT NULL CHECK (
    new_status IN ('draft', 'published', 'archived')
  ),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.admin_audit_logs IS 'Bitácora inmutable de acciones de moderación y publicación ejecutadas por administradores sobre el catálogo público.';

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
  ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
  ON public.admin_audit_logs (target_id, created_at DESC);

-- 2. Trigger de integridad e inmutabilidad en public.admin_audit_logs
CREATE OR REPLACE FUNCTION public.enforce_admin_audit_log_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'IMMUTABLE_AUDIT_LOG: Los registros de auditoría administrativa son inmutables y no pueden alterarse ni eliminarse.';
  END IF;

  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'FORBIDDEN_ADMIN_ONLY: Solo un administrador verificado puede registrar eventos en admin_audit_logs.';
    END IF;

    IF auth.uid() IS NOT NULL AND NEW.actor_id <> auth.uid() THEN
      RAISE EXCEPTION 'INVALID_AUDIT_ACTOR: El actor_id debe coincidir con el administrador autenticado.';
    END IF;
  END IF;

  NEW.target_title := btrim(NEW.target_title);
  NEW.notes := btrim(COALESCE(NEW.notes, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_admin_audit_log_integrity ON public.admin_audit_logs;
CREATE TRIGGER trg_enforce_admin_audit_log_integrity
  BEFORE INSERT OR UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_audit_log_integrity();

-- 3. Endurecimiento de public.enforce_subject_publication_rules() (Fase 8)
-- Exige que solo admin gestione visibility = 'public' y que al pasar una materia pública
-- a status = 'published' en UPDATE cuente con al menos 1 tema y 1 pregunta publicada con explicación.
CREATE OR REPLACE FUNCTION public.enforce_subject_publication_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topics_count INT := 0;
  v_published_questions_count INT := 0;
BEGIN
  -- 3.1 En v1, solo un administrador (o service_role) puede gestionar materias con visibility = 'public'
  IF NEW.visibility = 'public' OR (TG_OP = 'UPDATE' AND OLD.visibility = 'public') THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'FORBIDDEN_PUBLIC_CATALOG: Solo un administrador puede publicar o modificar materias en el catálogo público.';
    END IF;
  END IF;

  -- 3.2 Cuando una materia pública se publica (status = 'published' en UPDATE), exigir >= 1 tema y >= 1 pregunta publicada
  IF TG_OP = 'UPDATE' AND NEW.visibility = 'public' AND NEW.status = 'published' THEN
    SELECT COUNT(*)
      INTO v_topics_count
      FROM public.topics t
     WHERE t.subject_id = NEW.id;

    SELECT COUNT(*)
      INTO v_published_questions_count
      FROM public.questions q
      JOIN public.topics t ON t.id = q.topic_id
     WHERE t.subject_id = NEW.id
       AND q.status = 'published'
       AND char_length(btrim(q.explanation)) > 0;

    IF v_topics_count < 1 OR v_published_questions_count < 1 THEN
      RAISE EXCEPTION 'PUBLICATION_REQUIREMENTS_NOT_MET: Para publicar en el catálogo público la materia debe tener al menos 1 tema y 1 pregunta publicada con explicación completa.';
    END IF;
  END IF;

  -- 3.3 Sellar published_at automáticamente cuando pasa a estado published
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, timezone('utc', now()));
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Row Level Security (RLS) para public.admin_audit_logs — Políticas separadas SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_audit_logs_select_admin ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_select_admin
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS admin_audit_logs_insert_admin ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_insert_admin
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND actor_id = auth.uid());

DROP POLICY IF EXISTS admin_audit_logs_update_denied ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_update_denied
  ON public.admin_audit_logs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS admin_audit_logs_delete_denied ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_delete_denied
  ON public.admin_audit_logs
  FOR DELETE
  TO authenticated
  USING (false);
