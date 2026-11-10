# 00. Plan Maestro del Proyecto — StudyPlay (v1.0)

## 1. Propósito
Construir una plataforma web multiusuario para organizar materiales de estudio, practicar con cuestionarios, recibir correcciones explicadas y seguir el progreso[cite: 1]. La primera versión funciona 100% sin IA; la arquitectura queda preparada para incorporar IA en el futuro sin rehacer el motor de estudio[cite: 1, 2].

## 2. Decisiones Base Adoptadas
- **Nombre del proyecto:** StudyPlay[cite: 2].
- **Tipo de producto:** Aplicación web responsive, multiusuario[cite: 2].
- **Contenido:** Carga manual de preguntas y carga de documentos PDF/apuntes[cite: 2].
- **Modelo de biblioteca:** Sistema mixto (espacio privado por usuario + catálogo público compartido)[cite: 2, 4].
- **Roles:** `user` y `admin`[cite: 2, 25]. La publicación y gestión global queda reservada a administración en v1[cite: 2, 4].
- **IA en v1:** Desactivada (`ENABLE_AI_FEATURES=false`)[cite: 2, 12, 23]. No se utiliza para corregir ni durante el juego[cite: 2, 25].
- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Auth, PostgreSQL, Storage) + Vercel[cite: 2, 9].

## 3. Principios del Producto
- **Simple primero:** Cada pantalla tiene una acción primaria clara[cite: 3, 8].
- **Corrección determinista:** Comparar con respuestas guardadas y explicar errores de forma inmediata[cite: 3, 6].
- **Privacidad por diseño:** Los espacios privados y los intentos nunca se cruzan entre usuarios (RLS estricto)[cite: 3, 4, 18].
- **Modularidad y recuperabilidad:** Contratos claros, pruebas automatizadas, migraciones SQL incrementales y control en Git[cite: 3, 10, 25].
