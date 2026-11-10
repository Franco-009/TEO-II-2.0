# 01. Requisitos, Roles y Alcance Funcional

## 1. Usuarios y Roles
- **Visitante:** Puede ver la landing, registrarse e iniciar sesión[cite: 4]. No accede a rutas privadas ni datos[cite: 4, 20].
- **Usuario (`user`):** Crea y administra su biblioteca privada (materias, temas, documentos PDF, preguntas), practica cuestionarios, repasa errores, ve sus estadísticas y consulta el catálogo público publicado[cite: 4, 5, 6].
- **Administrador (`admin`):** Gestiona el catálogo público, revisa y publica materias/preguntas compartidas[cite: 4, 7]. No accede a documentos ni intentos privados de otros usuarios[cite: 4, 18].

## 2. Estados del Contenido
- `draft`: En edición; solo visible para su propietario o administradores autorizados[cite: 4]. No entra en partidas normales[cite: 17].
- `published`: Revisado y activo; visible según su ámbito (`private` o `public`)[cite: 4].
- `archived`: Retirado de búsquedas y catálogos nuevos, pero conserva referencias históricas para no romper intentos previos[cite: 4, 15].

## 3. Módulos del MVP (In Scope v1)
1. **Autenticación y Perfil:** Registro, login, logout, recuperación de contraseña y tabla `profiles` con rol asignado en servidor[cite: 5, 20].
2. **Dashboard:** Acceso rápido a continuar practicando, materias recientes/fijadas, XP, racha, objetivo diario y temas por reforzar[cite: 5, 8].
3. **Materias y Temas:** CRUD de materias privadas y estructura jerárquica de temas con orden manual (`sort_order`)[cite: 5, 14].
4. **Documentos PDF:** Subida de archivos PDF (máx. 15 MB) en bucket privado, validación de MIME/extensión y lectura por URL firmada[cite: 5, 7, 18, 28]. Al borrar un PDF, las preguntas asociadas pasan a "fuente no disponible" sin borrarse[cite: 5].
5. **Editor de Preguntas:** Soporte en v1 para `single_choice`, `true_false` y `multiple_select` con enunciado, opciones, respuesta correcta, explicación general y feedback por opción[cite: 5, 6, 17, 23].
6. **Motor de Cuestionarios y Corrección:** Modos práctica, desafío y errores; corrección determinista inmediata y persistencia de sesión e intentos[cite: 6, 7].
7. **Estadísticas y Gamificación:** Precisión por materia/tema (mínimo 5 intentos para considerar dominado) y eventos de XP idempotentes (`+10`, `+20`, `+30`, `+50`)[cite: 6, 14].

## 4. Fuera de Alcance Inicial (Out of Scope v1)
- Generación automática con IA, tutor conversacional o corrección semántica[cite: 3, 5].
- Preguntas de respuesta corta (`short_answer`) diferidas pos-MVP para asegurar corrección 100% determinista[cite: 17, 28].
- Clases en vivo, chat entre usuarios, pagos/suscripciones y app móvil nativa[cite: 3].