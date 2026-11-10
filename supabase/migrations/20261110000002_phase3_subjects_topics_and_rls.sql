-- ============================================================================
-- StudyPlay — Migración 0002 (Fase 3: Tablas subjects y topics, Jerarquía y RLS)
-- Fecha: 2026-11-10
-- Referencias: docs/04-MODELO-DATOS.md, docs/05-SEGURIDAD-RLS.md, ADR-0001
-- ============================================================================

-- 1. Función reutilizable para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Tabla public.subjects
-- Nota de diseño: No existe restricción UNIQUE global sobre title para permitir
-- que dos usuarios distintos creen materias con el mismo título sin cruzar datos.
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subjects IS 'Materias privadas por usuario y catálogo público curado por administración.';

CREATE INDEX IF NOT EXISTS idx_subjects_owner_updated
  ON public.subjects (owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_subjects_public_catalog
  ON public.subjects (visibility, status, published_at DESC)
  WHERE visibility = 'public' AND status = 'published';

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Trigger de reglas de publicación y visibilidad en subjects (ADR-0001)
CREATE OR REPLACE FUNCTION public.enforce_subject_publication_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- En v1, solo un administrador (o service_role) puede gestionar materias con visibility = 'public'
  IF NEW.visibility = 'public' THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'FORBIDDEN_PUBLIC_CATALOG: Solo un administrador puede publicar o modificar materias en el catálogo público.';
    END IF;
  END IF;

  -- Sellar published_at automáticamente cuando pasa a estado published
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_subject_publication_rules ON public.subjects;
CREATE TRIGGER trg_enforce_subject_publication_rules
  BEFORE INSERT OR UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_subject_publication_rules();

-- 4. Tabla public.topics (jerárquica con parent_topic_id y sort_order)
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  sort_order INT NOT NULL DEFAULT 1 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_topic_not_self_parent CHECK (parent_topic_id IS NULL OR parent_topic_id <> id)
);

COMMENT ON TABLE public.topics IS 'Temas jerárquicos dentro de una materia con orden manual sort_order.';

CREATE INDEX IF NOT EXISTS idx_topics_subject_sort
  ON public.topics (subject_id, sort_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_topics_parent
  ON public.topics (parent_topic_id);

DROP TRIGGER IF EXISTS trg_topics_updated_at ON public.topics;
CREATE TRIGGER trg_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Trigger de integridad jerárquica en topics (misma materia y prevención de ciclos)
CREATE OR REPLACE FUNCTION public.enforce_topic_hierarchy_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_subject_id UUID;
  v_has_cycle BOOLEAN;
BEGIN
  IF NEW.parent_topic_id IS NOT NULL THEN
    SELECT subject_id INTO v_parent_subject_id
    FROM public.topics
    WHERE id = NEW.parent_topic_id;

    IF v_parent_subject_id IS NULL OR v_parent_subject_id <> NEW.subject_id THEN
      RAISE EXCEPTION 'INVALID_PARENT_TOPIC: El tema padre debe pertenecer a la misma materia.';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.id IS NOT NULL THEN
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_topic_id
        FROM public.topics
        WHERE id = NEW.parent_topic_id
        UNION ALL
        SELECT t.id, t.parent_topic_id
        FROM public.topics t
        INNER JOIN ancestors a ON t.id = a.parent_topic_id
      )
      SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id) INTO v_has_cycle;

      IF v_has_cycle THEN
        RAISE EXCEPTION 'TOPIC_CYCLE_DETECTED: Un tema no puede ser subtema de sus propios descendientes.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_topic_hierarchy_integrity ON public.topics;
CREATE TRIGGER trg_enforce_topic_hierarchy_integrity
  BEFORE INSERT OR UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_topic_hierarchy_integrity();

-- 6. Funciones auxiliares de acceso para políticas RLS de topics
CREATE OR REPLACE FUNCTION public.can_read_subject(p_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subjects s
    WHERE s.id = p_subject_id
      AND (
        (s.visibility = 'public' AND s.status = 'published')
        OR s.owner_id = auth.uid()
        OR (s.visibility = 'public' AND public.is_admin())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_subject(p_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subjects s
    WHERE s.id = p_subject_id
      AND (
        s.owner_id = auth.uid()
        OR (s.visibility = 'public' AND public.is_admin())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_subject(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_subject(UUID) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_write_subject(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_write_subject(UUID) TO authenticated, service_role;

-- 7. Políticas RLS separadas para public.subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subjects_select_policy ON public.subjects;
CREATE POLICY subjects_select_policy
  ON public.subjects
  FOR SELECT
  TO anon, authenticated
  USING (
    (visibility = 'public' AND status = 'published')
    OR owner_id = auth.uid()
    OR (visibility = 'public' AND public.is_admin())
  );

DROP POLICY IF EXISTS subjects_insert_policy ON public.subjects;
CREATE POLICY subjects_insert_policy
  ON public.subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (visibility = 'private' OR public.is_admin())
  );

DROP POLICY IF EXISTS subjects_update_policy ON public.subjects;
CREATE POLICY subjects_update_policy
  ON public.subjects
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (visibility = 'public' AND public.is_admin())
  )
  WITH CHECK (
    (owner_id = auth.uid() AND (visibility = 'private' OR public.is_admin()))
    OR (visibility = 'public' AND public.is_admin())
  );

DROP POLICY IF EXISTS subjects_delete_policy ON public.subjects;
CREATE POLICY subjects_delete_policy
  ON public.subjects
  FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (visibility = 'public' AND public.is_admin())
  );

-- 8. Políticas RLS separadas para public.topics
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS topics_select_policy ON public.topics;
CREATE POLICY topics_select_policy
  ON public.topics
  FOR SELECT
  TO anon, authenticated
  USING (public.can_read_subject(subject_id));

DROP POLICY IF EXISTS topics_insert_policy ON public.topics;
CREATE POLICY topics_insert_policy
  ON public.topics
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_subject(subject_id));

DROP POLICY IF EXISTS topics_update_policy ON public.topics;
CREATE POLICY topics_update_policy
  ON public.topics
  FOR UPDATE
  TO authenticated
  USING (public.can_write_subject(subject_id))
  WITH CHECK (public.can_write_subject(subject_id));

DROP POLICY IF EXISTS topics_delete_policy ON public.topics;
CREATE POLICY topics_delete_policy
  ON public.topics
  FOR DELETE
  TO authenticated
  USING (public.can_write_subject(subject_id));
