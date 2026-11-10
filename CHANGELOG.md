# Changelog

## [0.2.0] - Fase 1: Base Visual y Navegación
- Inicialización aditiva de Next.js (App Router), TypeScript estricto, Tailwind CSS y Vitest conservando `/docs` y archivos base.
- Creación de `.gitignore` y `.env.example` sin secretos expuestos (`ENABLE_AI_FEATURES=false`, `MAX_PDF_SIZE_BYTES=15728640`).
- Definición de tokens visuales en modo oscuro (azul marino/gris, superficies elevadas, acentos azul/violeta y colores semánticos verde/rojo/ámbar acompañados siempre de iconos y texto accesible).
- Construcción de arquitectura modular bajo `src/` (`config`, `shared`, `domain`, `application`, `infrastructure`, `features`, `components`, `app`) incluyendo puertos conceptuales desacoplados para IA futura (`DocumentTextExtractor`, `QuestionDraftGenerator`, `StudyAssistant`).
- Implementación de layouts público y autenticado de prueba, navegación responsive y las 19 rutas especificadas en `docs/02-UX-Y-PANTALLAS.md` con datos ficticios y simulador de estados explícitos (poblado, vacío, carga, error).

## [0.1.0] - Fase 0: Preparación y Documentación Base
- Creación de estructura base del repositorio y carpeta `/docs` según Plan Maestro v1.0[cite: 1, 20, 26].