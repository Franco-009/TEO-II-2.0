# 09. Operación, Diagnóstico y Recuperación

## 1. Reglas Operativas en Git y Base de Datos
- No borrar migraciones SQL ya aplicadas; crear siempre una nueva migración incremental[cite: 16, 24, 25].
- No ejecutar comandos destructivos sin revisar `git status --short` y `git diff`[cite: 24, 27].
- Si un archivo se borra por error, recuperarlo con `git restore --source=<commit> -- ruta/al/archivo`[cite: 27].

## 2. Comandos de Verificación Habituales
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`[cite: 27]