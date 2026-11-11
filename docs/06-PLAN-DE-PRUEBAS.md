# 06. Estrategia de Pruebas y Calidad

## 1. Niveles de Prueba
- **Unitarias (Vitest/Jest):** Reglas puras del dominio (motor de corrección `single_choice`, `true_false`, `multiple_select`, validaciones de preguntas y cálculo de XP)[cite: 9, 17, 19].
- **Integración:** Casos de uso, repositorios y persistencia[cite: 19].
- **RLS / Seguridad:** Pruebas de acceso permitido y denegado con al menos dos usuarios distintos (`Usuario A` no puede leer ni modificar materias, PDFs ni intentos de `Usuario B`)[cite: 18, 19].
- **E2E (Playwright):** Flujo completo desde navegador (`Registro -> Crear materia -> Crear pregunta -> Jugar -> Ver resultado`)[cite: 9, 19].

## 2. Casos Imprescindibles (Checklist de Calidad)
1. Registro válido, email duplicado y contraseña inválida[cite: 19].
2. Visitante no autenticado redirigido al intentar entrar a ruta privada (`/app/*`)[cite: 19, 20].
3. Dos usuarios crean materias con el mismo título sin cruzar datos[cite: 19].
4. Propietario edita su materia; otro usuario recibe denegación[cite: 19].
5. Materia pública en estado `draft` o `archived` no aparece en el catálogo público (`admin.rules.test.ts` y `admin.use-cases.test.ts`)[cite: 15, 19].
6. Pregunta `single_choice` rechaza IDs de opciones que no pertenecen a esa pregunta (`quizzes.rules.test.ts`)[cite: 17, 19].
7. Pregunta `multiple_select` solo marca acierto cuando coincide el conjunto completo de opciones correctas (`quizzes.rules.test.ts`)[cite: 5, 17, 19].
8. Reintento de red no duplica puntos en `xp_events` (idempotencia por `event_key`) (`progress.use-cases.test.ts`)[cite: 6, 14, 19, 23].
9. Usuario no puede enviar respuestas a una `quiz_session` ajena o ya cerrada (`SESSION_CLOSED`) (`quizzes.use-cases.test.ts`)[cite: 17, 19].
10. PDF privado de Usuario A no puede descargarse desde cuenta de Usuario B[cite: 19, 21].
11. El sistema compila y permite estudiar/jugar con `ENABLE_AI_FEATURES=false`[cite: 19, 23].