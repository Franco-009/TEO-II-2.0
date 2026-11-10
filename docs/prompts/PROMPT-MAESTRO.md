# CONTEXTO PERMANENTE - STUDYPLAY

Estamos construyendo StudyPlay, una aplicación web multiusuario para organizar material de estudio y practicar mediante cuestionarios autocorregibles[cite: 25].

## OBJETIVO
Permitir que cada usuario cree materias, temas, documentos y preguntas; practique; reciba correcciones explicadas; repase errores y consulte su progreso[cite: 25].

## DECISIONES DE PRODUCTO
- Carga manual de preguntas y carga de documentos PDF/apuntes[cite: 25].
- Biblioteca mixta: contenido privado por usuario y catálogo público publicado[cite: 25].
- Roles iniciales: `user` y `admin`[cite: 25].
- Corrección determinista: las respuestas y explicaciones están guardadas[cite: 25].
- La IA no participa en el juego ni en las correcciones de la primera versión[cite: 25].
- La arquitectura debe permitir IA futura como módulo opcional desacoplado[cite: 25].

## STACK PROPUESTO
Next.js App Router, React, TypeScript, Tailwind CSS, Supabase (Auth + PostgreSQL + Storage), Vercel, Git[cite: 25].
Usa versiones estables compatibles al iniciar y respeta el lockfile existente[cite: 25].

## ARQUITECTURA
Separar UI, features, application/use cases, domain e infrastructure/adapters[cite: 25].
Las reglas del dominio deben poder probarse sin navegador ni proveedor externo[cite: 25].
No importar SDK de IA en frontend ni acoplar proveedor futuro a las reglas[cite: 25].

## REGLAS DE SEGURIDAD
- Activar y probar RLS en todas las tablas expuestas[cite: 25].
- Crear políticas de Storage por separado[cite: 25].
- No exponer `service_role` ni secretos en el cliente o Git[cite: 25].
- No confiar en permisos enviados por frontend[cite: 25].
- Probar denegación entre dos usuarios distintos[cite: 25].
- Un usuario solo accede a su contenido privado y sus intentos[cite: 25].
- Contenido público visible únicamente si está publicado[cite: 25].

## REGLAS DE TRABAJO
1. Lee `README.md` y `/docs` antes de actuar[cite: 25].
2. Inspecciona Git y el código existente antes de cambiar[cite: 25].
3. Trabaja solo en la fase solicitada[cite: 25].
4. No borres ni reemplaces archivos sin explicar el motivo[cite: 25].
5. No cambies contratos existentes sin actualizar pruebas y docs[cite: 25].
6. Usa migraciones incrementales y reproducibles[cite: 25].
7. Añade pruebas, ejecuta build/lint y revisa el diff[cite: 25].
8. Actualiza `CHANGELOG.md` y documentación relevante[cite: 25].
9. Nunca inventes secretos, credenciales o configuración[cite: 25].
10. Reporta claramente qué quedó hecho, qué pruebas corriste y qué falta[cite: 25].