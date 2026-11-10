# Capa de Aplicación (`src/application`)

Esta capa alojará los casos de uso y orquestadores de negocio a partir de la Fase 2 (Autenticación, CRUD de Materias/Temas, Subida de Documentos, Motor de Partidas y Cálculo de XP).

- No debe depender de componentes de React ni rutas específicas de Next.js.
- Orquesta llamadas entre las reglas puras de `src/domain` y los adaptadores de `src/infrastructure`.
