# Capa de Infraestructura (`src/infrastructure`)

Esta capa alojará los adaptadores concretos a partir de la Fase 2:
- `supabase/`: Clientes de servidor y navegador, políticas RLS y repositorios PostgreSQL.
- `storage/`: Adaptador de bucket privado para documentos PDF con URLs firmadas temporales.
- `email/`: Notificaciones transaccionales y recuperación de cuenta.
