# 05. Seguridad, Privacidad y Matriz RLS

## 1. Principios de Seguridad
- Activar Row Level Security (RLS) en todas las tablas expuestas a la API[cite: 18, 25].
- Crear políticas separadas para `SELECT`, `INSERT`, `UPDATE` y `DELETE`[cite: 18].
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` ni secretos en el cliente o en Git[cite: 16, 18, 25].
- No confiar en el campo `role` enviado desde el frontend; validarlo siempre en servidor y base de datos[cite: 5, 14, 18, 25].
- Aplicar políticas en Supabase Storage por separado (las políticas SQL de tablas no protegen buckets automáticamente)[cite: 18, 25].
- Acceder a documentos PDF privados únicamente mediante URLs firmadas temporales[cite: 5, 18].

## 2. Matriz Mínima RLS
| Recurso | Usuario propietario | Otro usuario | Administrador (`admin`) |
| :--- | :--- | :--- | :--- |
| **Perfil (`public.profiles`)** | `SELECT` y `UPDATE` propio (`display_name`, `avatar_path`); prohibido cambiar `role` | Sin acceso | `SELECT`, `UPDATE` y `DELETE` mediante `public.is_admin()` |
| **Materia / Tema / Pregunta privada** | CRUD propio | Sin acceso | Acceso solo si la función administrativa lo requiere[cite: 18] |
| **Materia pública publicada** | Lectura | Lectura | CRUD y publicación[cite: 18] |
| **Intento / Sesión / Resultado** | Lectura y creación propia | Sin acceso | Sin acceso rutinario al detalle personal[cite: 18] |
| **PDF privado (Storage)** | Acceso propio (`{user_id}/...`) | Sin acceso | Sin acceso por defecto[cite: 7, 18] |
| **XP y racha** | Lectura propia; escritura validada en servidor | Sin acceso | Sin modificación manual ordinaria[cite: 18] |