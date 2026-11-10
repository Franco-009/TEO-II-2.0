# 03. Arquitectura Técnica y Organización Modular

## 1. Separación de Capas
`Interfaz (app/components)` -> `Casos de uso (features/application)` -> `Reglas de dominio (domain)` -> `Puertos (ports)` -> `Adaptadores (infrastructure)`[cite: 9].

- La UI no contiene reglas de corrección ni consultas SQL directas[cite: 9].
- El dominio contiene reglas puras, validaciones y el motor de corrección determinista, testeables sin navegador ni conexión a red[cite: 9, 25].
- Los adaptadores implementan los contratos hacia Supabase Auth, PostgreSQL, Storage y futura IA[cite: 9, 11].

## 2. Estructura de Carpetas (`src/`)
- `src/app/` : Rutas de Next.js App Router, layouts y route handlers[cite: 9, 16].
- `src/components/` : Componentes visuales compartidos[cite: 9, 16].
- `src/features/` : Módulos funcionales (`auth`, `dashboard`, `subjects`, `topics`, `documents`, `questions`, `quizzes`, `attempts`, `progress`, `gamification`, `public-library`, `admin`)[cite: 9, 16].
- `src/domain/` : Entidades, tipos puros, motor de corrección y contratos/puertos[cite: 9, 11, 16].
- `src/application/` : Casos de uso y orquestación[cite: 9, 16].
- `src/infrastructure/` : Clientes de Supabase (`supabase/`), archivos (`storage/`), correo (`email/`)[cite: 9, 10, 16].
- `src/shared/` y `src/config/` : Utilidades, errores tipados, validación de variables de entorno y feature flags[cite: 10, 16].

## 3. Puertos Neutrales Reservados para IA Futura
El dominio define contratos sin implementar conectores externos en v1[cite: 11, 13]:
- `DocumentTextExtractor`: `extract(input: DocumentReference): Promise<ExtractedDocument>`[cite: 11]
- `QuestionDraftGenerator`: `generate(input: QuestionGenerationRequest): Promise<QuestionDraft[]>`[cite: 11]
- `StudyAssistant`: `explain(input: ExplanationRequest): Promise<ExplanationDraft>`[cite: 11]