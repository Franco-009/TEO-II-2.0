# StudyPlay

Plataforma web multiusuario para organizar materiales de estudio (materias, temas y apuntes PDF), practicar con cuestionarios autocorregibles, recibir correcciones explicadas y medir el progreso[cite: 1, 3].

## Decisiones Base (v1.0)
- **Sin dependencia de IA en v1:** Todo el circuito de estudio, juego y corrección es 100% determinista[cite: 1, 2, 3]. La arquitectura incluye puertos desacoplados para incorporar IA opcional en el futuro[cite: 2, 11].
- **Biblioteca mixta:** Espacio privado por usuario + catálogo público compartido gestionado por administradores[cite: 2, 4].
- **Seguridad por diseño:** Row Level Security (RLS) activo en todas las tablas de PostgreSQL y políticas independientes en Supabase Storage[cite: 9, 18].

## Stack Tecnológico
- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS[cite: 2, 9]
- **Backend y Persistencia:** Supabase (Auth, PostgreSQL, Storage)[cite: 2, 9]
- **Testing:** Vitest / Jest (unitarias e integración), Playwright (E2E) y pruebas SQL/RLS[cite: 9, 19]
- **Despliegue:** Vercel[cite: 2, 9]