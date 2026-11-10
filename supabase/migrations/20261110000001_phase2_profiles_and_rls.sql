-- ============================================================================
-- StudyPlay — Migración 0001 (Fase 2: Supabase Auth, Tabla profiles y RLS)
-- Fecha: 2026-11-10
-- Referencias: docs/04-MODELO-DATOS.md, docs/05-SEGURIDAD-RLS.md
-- ============================================================================

-- 1. Tabla public.profiles (1:1 con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 1 AND 100),
  avatar_path TEXT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfiles de usuario vinculados 1:1 con auth.users. El campo role se controla exclusivamente en servidor.';
COMMENT ON COLUMN public.profiles.role IS 'Rol de autorización en servidor (user | admin). Nunca confiar en valores enviados por el cliente.';

-- 2. Función auxiliar en servidor para verificar rol admin sin recursión en políticas RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 3. Trigger para crear automáticamente el perfil al registrarse un usuario en auth.users
-- SEGURIDAD: Asigna siempre role = 'user'. Ignora cualquier intento de inyectar role en raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  v_display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Estudiante'
  );

  INSERT INTO public.profiles (id, display_name, avatar_path, role)
  VALUES (NEW.id, left(v_display_name, 100), NULL, 'user')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Defensa en profundidad: Trigger BEFORE UPDATE que bloquea escalación de privilegios en role
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'FORBIDDEN_ROLE_CHANGE: Un usuario estándar no puede modificar su propio rol.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 5. Activación estricta de Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Política SELECT: El propietario lee su propio perfil; admin puede consultar perfiles para moderación
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- Política INSERT: Un usuario autenticado solo puede insertar su propio perfil y únicamente con role = 'user'
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'user');

-- Política UPDATE: El propietario puede actualizar sus datos (display_name, avatar_path) sin cambiar su role
DROP POLICY IF EXISTS profiles_update_own_policy ON public.profiles;
CREATE POLICY profiles_update_own_policy
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
    OR public.is_admin()
  );

-- Política DELETE: Solo administradores (o borrado en cascada desde auth.users en servidor)
DROP POLICY IF EXISTS profiles_delete_admin_policy ON public.profiles;
CREATE POLICY profiles_delete_admin_policy
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
