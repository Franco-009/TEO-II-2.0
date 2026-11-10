# 10. Preparación para IA Futura (Módulo Opcional Desacoplado)

## 1. Reglas de Frontera
- En v1, StudyPlay funciona al 100% con `ENABLE_AI_FEATURES=false`[cite: 1, 12, 23, 25].
- Cuando se active en el futuro, correrá exclusivamente del lado servidor mediante trabajos asíncronos (`ai_jobs` con estados `queued`, `processing`, `needs_review`, `completed`, `failed`, `cancelled`)[cite: 12, 25].
- Toda pregunta sugerida por IA nace como borrador y exige revisión y aprobación humana antes de pasar al banco activo[cite: 11, 12, 13, 25].