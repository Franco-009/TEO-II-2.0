# 06. Estrategia de Pruebas, Trazabilidad y Criterios de Aceptación (v1.0.0)

## 1. Niveles de Prueba Automatizada
- **Unitarias (`src/domain/**/__tests__/*.test.ts`):** Reglas puras del dominio sin dependencias de red ni navegador (autenticación y rutas, materias y árbol jerárquico de temas, validación binaria/MIME de PDFs, editor y publicación de preguntas, motor de corrección determinista `single_choice`, `true_false`, `multiple_select`, cálculo de XP, rachas y dominio de temas, elegibilidad y moderación administrativa).
- **Integración por Casos de Uso (`src/application/**/__tests__/*.test.ts`):** Verificación de casos de uso completos contra repositorios, garantizando idempotencia, aislamiento entre propietarios y preservación del historial.
- **E2E / Flujo Integral Multi-Actor (`src/__tests__/e2e/mvp-phase9-e2e.test.ts`):** Recorrido completo de punta a punta con `Visitante`, `Usuario A`, `Usuario B` y `Administrador` validando el circuito `Registro -> Login -> Crear Materia y Temas -> Subir PDF Privado -> Crear y Publicar Preguntas -> Jugar Cuestionario -> Recibir Corrección Explicada -> Modo Repaso de Errores -> Progreso y XP Idempotente -> Moderación y Catálogo Público`.
- **Auditoría Estática de Seguridad, Esquema SQL/RLS y Secretos (`src/__tests__/security/security-and-rls.audit.test.ts`):** Verificación automatizada de las 7 migraciones SQL (`0001` a `0007`), activación de `ENABLE ROW LEVEL SECURITY` y políticas separadas `SELECT`, `INSERT`, `UPDATE`, `DELETE` en las 11 tablas públicas y en `storage.objects`, ausencia de filtración de `SUPABASE_SERVICE_ROLE_KEY` en archivos `"use client"` y funcionamiento íntegro con `ENABLE_AI_FEATURES=false`.

---

## 2. Sección 12.2 — Casos de Prueba Imprescindibles (12 Casos)

| # | Caso de prueba imprescindible (Sección 12.2) | Suites de prueba que lo verifican | Estado |
| :- | :--- | :--- | :-: |
| **1** | Registro válido, email duplicado y contraseña inválida. | `auth.rules.test.ts`, `auth.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **2** | Usuario no autenticado intenta entrar a una ruta privada. | `auth.rules.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **3** | Dos usuarios crean materias con el mismo título sin cruzar datos. | `subjects-topics.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **4** | Propietario puede editar su materia; otro usuario no puede. | `subjects-topics.rules.test.ts`, `subjects-topics.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **5** | Una materia pública borrador no aparece en catálogo. | `admin.rules.test.ts`, `admin.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **6** | Una pregunta de opción múltiple rechaza respuestas que no son opciones de esa pregunta. | `quizzes.rules.test.ts`, `quizzes.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **7** | Selección múltiple acierta solo cuando coincide el conjunto completo. | `quizzes.rules.test.ts`, `quizzes.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **8** | Un intento repetido por reintento de red no duplica XP. | `gamification-progress.rules.test.ts`, `progress.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **9** | Un usuario no puede enviar respuestas a una sesión ajena. | `quizzes.rules.test.ts`, `quizzes.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **10** | Un PDF de usuario A no se descarga desde usuario B. | `documents.rules.test.ts`, `documents.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **11** | Una sesión cerrada no acepta nuevos intentos. | `quizzes.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **12** | La página y el juego funcionan con las funciones futuras de IA desactivadas. | `mvp-phase9-e2e.test.ts`, `security-and-rls.audit.test.ts`, `smoke.test.ts` | ✅ |

---

## 3. Sección 14 — Criterios de Aceptación de la Primera Versión (16 Criterios)

| # | Criterio de aceptación (Sección 14) | Evidencia y verificación automatizada | Estado |
| :- | :--- | :--- | :-: |
| **1** | Un visitante puede registrarse, iniciar sesión y cerrar sesión. | `auth.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` (`/register`, `/login`, logout) | ✅ |
| **2** | Un usuario puede crear, editar y archivar sus materias y temas. | `subjects-topics.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **3** | Un usuario puede subir y consultar su PDF privado. | `documents.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` (`study-documents`, URL firmada) | ✅ |
| **4** | Un usuario puede crear al menos preguntas de opción múltiple, verdadero/falso y selección múltiple. | `questions.rules.test.ts`, `questions.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **5** | El editor impide publicar preguntas mal configuradas. | `questions.rules.test.ts`, `questions.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **6** | Un usuario puede iniciar un cuestionario desde un tema y responderlo. | `quizzes.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **7** | La corrección aparece inmediatamente con la respuesta y explicación guardadas. | `quizzes.rules.test.ts`, `quizzes.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **8** | El resultado y los intentos quedan persistidos. | `quizzes.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` (`quiz_sessions`, `attempts`) | ✅ |
| **9** | El modo errores recupera preguntas previamente falladas. | `quizzes.rules.test.ts`, `quizzes.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **10** | El dashboard muestra estadísticas básicas coherentes. | `progress.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **11** | XP no se duplica cuando se repite una solicitud. | `progress.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` (`event_key` único) | ✅ |
| **12** | El catálogo muestra solo contenido público publicado. | `admin.rules.test.ts`, `admin.use-cases.test.ts`, `mvp-phase9-e2e.test.ts` | ✅ |
| **13** | Un usuario no puede acceder a materias, documentos o intentos privados de otro. | `mvp-phase9-e2e.test.ts`, `security-and-rls.audit.test.ts` | ✅ |
| **14** | Las funciones centrales trabajan con IA desactivada y sin claves de proveedor. | `mvp-phase9-e2e.test.ts`, `security-and-rls.audit.test.ts` (`ENABLE_AI_FEATURES=false`) | ✅ |
| **15** | El README permite a otro desarrollador instalar y ejecutar el proyecto siguiendo instrucciones. | `README.md`, `security-and-rls.audit.test.ts` | ✅ |
| **16** | Las migraciones y los documentos permiten reconstruir el esquema y el propósito de módulos. | `supabase/migrations/0001..0007`, `/docs`, `security-and-rls.audit.test.ts` | ✅ |
