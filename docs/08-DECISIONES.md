# 08. Registro de Decisiones de Arquitectura (ADR)

## ADR-0001: Biblioteca Mixta y Rol Administrador
- **Estado:** Aprobado.
- **Contexto:** Se requiere espacio personal privado por estudiante y acceso a material curado compartido[cite: 2, 26].
- **Decisión:** Implementar biblioteca privada por usuario + catálogo público donde solo el rol `admin` publica en v1[cite: 2, 4, 26].
- **Consecuencias:** Requiere campos `visibility`, `status` (`draft`, `published`, `archived`) y políticas RLS diferenciadas[cite: 4, 15, 26].

## ADR-0002: IA Futura Desacoplada mediante Puertos y Adaptadores
- **Estado:** Aprobado[cite: 26].
- **Contexto:**El MVP debe funcionar sin costos ni dependencia de proveedores de IA, pero permitir su incorporación futura[cite: 1, 26].
- **Decisión:** Definir interfaces neutrales en el dominio (`DocumentTextExtractor`, `QuestionDraftGenerator`, `StudyAssistant`), feature flag `ENABLE_AI_FEATURES=false` y flujo futuro asíncrono con revisión humana obligatoria[cite: 11, 12, 26].

## ADR-0003: Diferir `short_answer` en el MVP Inicial
- **Estado:** Aprobado.
- **Contexto:** Las preguntas de texto libre pueden generar falsos negativos sin normalización compleja[cite: 17, 28].
- **Decisión:** Priorizar en el MVP `single_choice`, `true_false` y `multiple_select` (100% deterministas)[cite: 17, 23, 28].

## ADR-0004: Límite de 15 MB para Archivos PDF
- **Estado:** Aprobado.
- **Decisión:** Fijar `MAX_PDF_SIZE_BYTES=15728640` (15 MB) y exigir validación de extensión `.pdf` y MIME `application/pdf` antes de subir al bucket privado[cite: 5, 18, 28].