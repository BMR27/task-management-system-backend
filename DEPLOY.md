# Despliegue en Railway

Este backend está listo para desplegarse en Railway. Requiere 3 servicios en el mismo proyecto: Postgres, este backend, y el frontend (repo hermano).

## 0. Login (una sola vez, interactivo)

```bash
railway login
```

Esto abre el navegador para autenticarte. No puede automatizarse.

## 1. Crear el proyecto y el servicio de Postgres

```bash
cd task-management-system-backend
railway init                     # crea un nuevo proyecto Railway
railway add --database postgres  # agrega el plugin de Postgres
```

## 2. Configurar variables de entorno del backend

```bash
railway variables --set "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"
railway variables --set "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
railway variables --set "JWT_ACCESS_EXPIRES=15m"
railway variables --set "JWT_REFRESH_EXPIRES=7d"
railway variables --set "NODE_ENV=production"
railway variables --set "FRONTEND_URL=https://<dominio-del-frontend>.up.railway.app"
# DATABASE_URL se enlaza automáticamente si usas `railway add --database postgres`
# en el mismo proyecto (Railway inyecta la referencia ${{Postgres.DATABASE_URL}}).

# SMTP (opcional, se puede dejar vacío y configurar después — el sistema
# funciona sin bloquear, solo no envía correos reales hasta configurarlo)
railway variables --set "SMTP_HOST=smtp.tu-proveedor.com"
railway variables --set "SMTP_PORT=587"
railway variables --set "SMTP_USER=usuario@tu-proveedor.com"
railway variables --set "SMTP_PASS=xxxxx"
railway variables --set "SMTP_FROM=NEXT OS Help Desk <no-reply@tudominio.com>"
```

## 3. Deploy

```bash
railway up
```

`railway.toml` ya define:
- build con Nixpacks (detecta pnpm automáticamente)
- `startCommand = "npx prisma migrate deploy && node dist/main.js"` — corre migraciones en cada deploy
- healthcheck en `/api/health`

## 4. Seed inicial (una sola vez, después del primer deploy exitoso)

```bash
railway run npx prisma db seed
```

Esto crea los usuarios de prueba (todos con password `demo`):
- admin@nextos.com (admin)
- supervisor@nextos.com (supervisor)
- agent1@nextos.com (agent)
- user1@nextos.com (user)

**Importante:** cambia estas contraseñas o crea usuarios reales antes de dar acceso a usuarios finales — `demo` es solo para pruebas iniciales.

## 5. Obtener el dominio público

```bash
railway domain
```

Usa esta URL (con sufijo `/api`) como `NEXT_PUBLIC_API_URL` en el frontend.

## Notas de seguridad para producción

- Genera `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` únicos y no los reutilices del `.env` de desarrollo.
- Verifica que `FRONTEND_URL` apunte exactamente al dominio del frontend en producción (afecta CORS y cookies `SameSite=None`).
- Configura SMTP real cuanto antes para que las notificaciones por correo se envíen de verdad (mientras tanto, quedan registradas en el log del servidor sin fallar).
