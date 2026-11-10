# 02. Diseño Visual, Experiencia y Pantallas

## 1. Dirección Visual y Accesibilidad
- **Estética:** Moderna, enfocada y adulta en modo oscuro (azul marino/gris), superficies elevadas discretas y acentos azul/violeta[cite: 8].
- **Semántica de estados:** Verde (acierto), Rojo (error), Ámbar (advertencia)[cite: 8]. Nunca depender solo del color: acompañar siempre con iconos y etiquetas de texto accesibles[cite: 8].
- **Reglas de UI:** Responsive (móvil, tablet y escritorio), una acción primaria por pantalla, navegación completa por teclado, foco visible y estados explícitos (carga, vacío, error, éxito)[cite: 8].

## 2. Mapa de Rutas Web
- `/` : Landing pública[cite: 8, 16].
- `/login`, `/register`, `/forgot-password` : Autenticación[cite: 16].
- `/app` : Dashboard principal protegido[cite: 16].
- `/app/subjects`, `/app/subjects/new`, `/app/subjects/[id]` : Gestión de materias privadas[cite: 16].
- `/app/topics/[id]` : Detalle de tema, apuntes y banco de preguntas[cite: 8, 16].
- `/app/documents` : Biblioteca de documentos PDF privados[cite: 16].
- `/app/quizzes/new`, `/app/quizzes/[id]` : Configuración y sesión activa de juego[cite: 8, 16].
- `/app/sessions/[id]/result` : Resumen de resultados de la partida[cite: 8, 16].
- `/app/review` : Modo repaso de errores[cite: 6, 16].
- `/app/progress` : Estadísticas detalladas[cite: 6, 16].
- `/library`, `/library/[id]` : Catálogo público compartido[cite: 8, 16].
- `/profile` : Perfil y preferencias del usuario[cite: 5, 16].
- `/admin`, `/admin/content` : Panel de administración y publicación[cite: 8, 16].