-- ============================================================================
-- StudyPlay — Migración 0003 (Fase 4: Tabla public.documents y Storage Privado)
-- Fecha: 2026-11-10
-- Referencias: docs/04-MODELO-DATOS.md, docs/05-SEGURIDAD-RLS.md, ADR-0004
-- ============================================================================

-- 1. Tabla public.documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID NULL REFERENCES public.topics(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL CHECK (char_length(trim(filename)) BETWEEN 5 AND 200),
  mime_type TEXT NOT NULL CHECK (mime_type = 'application/pdf'),
  size_bytes INT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 15728640),
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'available', 'failed', 'unavailable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.documents IS 'Metadatos de documentos PDF privados por usuario (máx. 15 MB). Almacenados en bucket privado study-documents.';

CREATE INDEX IF NOT EXISTS idx_documents_owner_created
  ON public.documents (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_subject_topic
  ON public.documents (subject_id, topic_id);

-- 2. Trigger de integridad referencial y aislamiento de ruta en public.documents
CREATE OR REPLACE FUNCTION public.enforce_document_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_owner UUID;
  v_topic_subject UUID;
BEGIN
  -- Verificar que la materia exista y pertenezca al mismo propietario del documento
  SELECT owner_id INTO v_subject_owner
  FROM public.subjects
  WHERE id = NEW.subject_id;

  IF v_subject_owner IS NULL OR v_subject_owner <> NEW.owner_id THEN
    RAISE EXCEPTION 'FORBIDDEN_DOCUMENT_SUBJECT: La materia no pertenece al propietario del documento.';
  END IF;

  -- Si se especificó topic_id, verificar que pertenezca a la misma materia
  IF NEW.topic_id IS NOT NULL THEN
    SELECT subject_id INTO v_topic_subject
    FROM public.topics
    WHERE id = NEW.topic_id;

    IF v_topic_subject IS NULL OR v_topic_subject <> NEW.subject_id THEN
      RAISE EXCEPTION 'INVALID_DOCUMENT_TOPIC: El tema no pertenece a la materia seleccionada.';
    END IF;
  END IF;

  -- Verificar que storage_path comience con {owner_id}/{document_id}/ y termine en .pdf
  IF position(NEW.owner_id::text || '/' || NEW.id::text || '/' in NEW.storage_path) <> 1
     OR lower(right(NEW.storage_path, 4)) <> '.pdf' THEN
    RAISE EXCEPTION 'INVALID_STORAGE_PATH: storage_path debe seguir el patrón {owner_id}/{document_id}/archivo.pdf';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_document_integrity ON public.documents;
CREATE TRIGGER trg_enforce_document_integrity
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_integrity();

-- 3. Políticas RLS separadas para public.documents (acceso estrictamente privado del propietario)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_select_own_policy ON public.documents;
CREATE POLICY documents_select_own_policy
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS documents_insert_own_policy ON public.documents;
CREATE POLICY documents_insert_own_policy
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS documents_update_own_policy ON public.documents;
CREATE POLICY documents_update_own_policy
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS documents_delete_own_policy ON public.documents;
CREATE POLICY documents_delete_own_policy
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- 4. Creación del Bucket Privado 'study-documents' en Supabase Storage y Políticas RLS separadas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-documents',
  'study-documents',
  false,
  15728640,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS storage_study_documents_select_own ON storage.objects;
CREATE POLICY storage_study_documents_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'study-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS storage_study_documents_insert_own ON storage.objects;
CREATE POLICY storage_study_documents_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'study-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(right(name, 4)) = '.pdf'
  );

DROP POLICY IF EXISTS storage_study_documents_update_own ON storage.objects;
CREATE POLICY storage_study_documents_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'study-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'study-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(right(name, 4)) = '.pdf'
  );

DROP POLICY IF EXISTS storage_study_documents_delete_own ON storage.objects;
CREATE POLICY storage_study_documents_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'study-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
