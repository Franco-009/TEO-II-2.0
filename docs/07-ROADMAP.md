# 07. Plan de Desarrollo por Etapas (Roadmap)

Regla: Avanzar de fase únicamente cuando se cumpla el criterio de salida verificable[cite: 20].

- [x] **FASE 0 - Preparación y decisiones:** Estructura `/docs`, `README.md`, `.env.example`, `.gitignore`, `CHANGELOG.md` y ADRs iniciales[cite: 20, 26].
- [x] **FASE 1 - Base visual y navegación:** Inicializar Next.js + TypeScript + Tailwind, tokens de color (modo oscuro azul marino/gris), layouts público y autenticado, pantallas con datos ficticios y diseño responsive[cite: 8, 20].
- [x] **FASE 2 - Supabase y autenticación:** Clientes Supabase (servidor/cliente), registro, login, logout, recuperación, tabla `profiles` con rol seguro y protección de rutas[cite: 20].
- [x] **FASE 3 - Datos, materias y temas:** Migraciones SQL para `subjects` y `topics`, RLS completo, CRUD de materias/temas jerárquicos y catálogo público básico[cite: 20, 21].
- [x] **FASE 4 - Documentos:** Bucket privado en Storage, políticas de acceso, subida de PDF (máx. 15 MB) con validación MIME/extensión y vista/descarga protegida[cite: 5, 18, 21, 28].
- [x] **FASE 5 - Preguntas y editor:** Migraciones `questions` y `question_options`, formularios por tipo (`single_choice`, `true_false`, `multiple_select`), validaciones de publicación y vista previa[cite: 5, 17, 21, 23].
- [ ] **FASE 6 - Motor de juego y corrección:** Tablas `quiz_sessions` y `attempts`, motor de corrección determinista en dominio, pantalla de juego, devolución explicada y modo errores[cite: 6, 9, 21].
- [ ] **FASE 7 - Progreso y gamificación:** Tablas `xp_events` y `user_daily_activity`, cálculo de estadísticas por materia/tema, racha y XP idempotente[cite: 6, 14, 21, 22].
- [ ] **FASE 8 - Administración y biblioteca pública:** Autorización de servidor para rol `admin`, cola de revisión/publicación y moderación en `/admin`[cite: 16, 22].
- [ ] **FASE 9 - Endurecimiento, publicación y operación:** Suite completa unitaria, integración, RLS y E2E, revisión de privacidad/secretos y despliegue en Vercel[cite: 9, 22].