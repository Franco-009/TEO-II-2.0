-- ============================================================================
-- StudyPlay — Migración 0006 (Fase 7: Tablas xp_events y user_daily_activity + RLS)
-- Fecha: 2026-11-11
-- Referencias: docs/04-MODELO-DATOS.md, docs/05-SEGURIDAD-RLS.md, docs/06-PLAN-DE-PRUEBAS.md
-- ============================================================================

-- 1. Tabla public.xp_events
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL UNIQUE CHECK (char_length(btrim(event_key)) BETWEEN 3 AND 200),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'attempt_correct',
      'quiz_completed',
      'daily_goal_reached',
      'topic_mastered'
    )
  ),
  points INT NOT NULL CHECK (points > 0 AND points <= 500),
  reference_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.xp_events IS 'Eventos de experiencia (XP) idempotentes por event_key para impedir duplicación de puntos ante reintentos de red (Caso Imprescindible #8).';

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created
  ON public.xp_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_type
  ON public.xp_events (user_id, event_type);

-- 2. Trigger de integridad en public.xp_events
CREATE OR REPLACE FUNCTION public.enforce_xp_event_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_points INT;
BEGIN
  -- 2.1 Prohibir alterar eventos XP ya emitidos (inmutables)
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'IMMUTABLE_XP_EVENT: Los eventos de experiencia son inmutables una vez registrados.';
  END IF;

  -- 2.2 Normalizar event_key
  NEW.event_key := btrim(NEW.event_key);
  IF char_length(NEW.event_key) < 3 THEN
    RAISE EXCEPTION 'INVALID_EVENT_KEY: El event_key debe tener al menos 3 caracteres.';
  END IF;

  -- 2.3 Validar propietario cuando se invoca desde sesión autenticada
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND auth.uid() IS NOT NULL
     AND NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN_XP_EVENT_OWNER: No puedes registrar eventos de experiencia para otro usuario.';
  END IF;

  -- 2.4 Validar puntos deterministas por tipo de evento (+10, +20, +30, +50)
  expected_points := CASE NEW.event_type
    WHEN 'attempt_correct' THEN 10
    WHEN 'quiz_completed' THEN 20
    WHEN 'daily_goal_reached' THEN 30
    WHEN 'topic_mastered' THEN 50
    ELSE NULL
  END;

  IF expected_points IS NULL OR NEW.points <> expected_points THEN
    RAISE EXCEPTION 'INVALID_XP_POINTS: El tipo de evento % requiere exactamente % puntos XP.', NEW.event_type, COALESCE(expected_points, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_xp_event_integrity ON public.xp_events;
CREATE TRIGGER trg_enforce_xp_event_integrity
  BEFORE INSERT OR UPDATE ON public.xp_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_xp_event_integrity();

-- 3. Tabla public.user_daily_activity
CREATE TABLE IF NOT EXISTS public.user_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  questions_answered INT NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
  correct_answers INT NOT NULL DEFAULT 0 CHECK (correct_answers >= 0 AND correct_answers <= questions_answered),
  quizzes_completed INT NOT NULL DEFAULT 0 CHECK (quizzes_completed >= 0),
  minutes_studied INT NOT NULL DEFAULT 0 CHECK (minutes_studied >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_user_daily_activity_user_date UNIQUE (user_id, activity_date)
);

COMMENT ON TABLE public.user_daily_activity IS 'Registro diario consolidado por estudiante para cálculo de racha consecutiva y objetivo diario.';

CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_date
  ON public.user_daily_activity (user_id, activity_date DESC);

-- 4. Trigger de integridad en public.user_daily_activity
CREATE OR REPLACE FUNCTION public.enforce_daily_activity_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND auth.uid() IS NOT NULL
     AND NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN_DAILY_ACTIVITY_OWNER: No puedes modificar la actividad diaria de otro usuario.';
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.user_id <> NEW.user_id OR OLD.activity_date <> NEW.activity_date) THEN
    RAISE EXCEPTION 'IMMUTABLE_DAILY_ACTIVITY_KEY: No se puede cambiar el usuario ni la fecha de un registro diario.';
  END IF;

  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_activity_integrity ON public.user_daily_activity;
CREATE TRIGGER trg_enforce_daily_activity_integrity
  BEFORE INSERT OR UPDATE ON public.user_daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_daily_activity_integrity();

-- 5. Row Level Security (RLS) — Políticas separadas SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

-- 5.1 Políticas para public.xp_events
DROP POLICY IF EXISTS xp_events_select_own ON public.xp_events;
CREATE POLICY xp_events_select_own
  ON public.xp_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS xp_events_insert_own ON public.xp_events;
CREATE POLICY xp_events_insert_own
  ON public.xp_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS xp_events_update_denied ON public.xp_events;
CREATE POLICY xp_events_update_denied
  ON public.xp_events
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS xp_events_delete_own ON public.xp_events;
CREATE POLICY xp_events_delete_own
  ON public.xp_events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 5.2 Políticas para public.user_daily_activity
DROP POLICY IF EXISTS user_daily_activity_select_own ON public.user_daily_activity;
CREATE POLICY user_daily_activity_select_own
  ON public.user_daily_activity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_daily_activity_insert_own ON public.user_daily_activity;
CREATE POLICY user_daily_activity_insert_own
  ON public.user_daily_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_daily_activity_update_own ON public.user_daily_activity;
CREATE POLICY user_daily_activity_update_own
  ON public.user_daily_activity
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_daily_activity_delete_own ON public.user_daily_activity;
CREATE POLICY user_daily_activity_delete_own
  ON public.user_daily_activity
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
