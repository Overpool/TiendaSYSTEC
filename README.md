# TiendaSYSTEC — Cloudflare Workers + Neon

Tienda virtual en **React + Vite**, desplegada en **Cloudflare Workers** (frontend como assets estáticos + API en `/api/*`),
con base de datos **Neon (Postgres)** e imágenes en **Cloudflare R2**.

```
Navegador ──► www.systecfl.site (Cloudflare)
               ├── /, /cart, /admin/...  → archivos de React (dist/client)
               └── /api/*                → Worker (worker/index.ts)
                                             ├── Neon (Postgres)  → productos, ventas, compras, usuarios
                                             └── R2               → imágenes de productos
```

## Qué cambió respecto a Vercel + Supabase

| Antes | Ahora |
|---|---|
| El navegador hablaba directo con Supabase usando la clave pública (`anon`) y políticas RLS abiertas: cualquiera podía leer o modificar todas las tablas, incluida `users` con las contraseñas en texto plano | El navegador solo habla con tu Worker. La cadena de conexión de Neon es un secreto que nunca llega al navegador |
| Login comparando contraseñas en el navegador (se descargaban todos los usuarios) | Login en el servidor, contraseñas con hash PBKDF2, sesión en cookie `HttpOnly` |
| "Olvidé mi contraseña" permitía cambiar la clave de cualquier correo sin verificar | Código de 6 dígitos enviado por correo (Resend), válido 15 minutos |
| El total de la venta y el stock los calculaba el navegador | El Worker recalcula el total con los precios reales y actualiza el stock en una transacción |
| Imágenes en Supabase Storage | Imágenes en R2, servidas en `/api/images/...` |
| `/api/productos` no existía (Vercel devolvía el HTML y se usaba el fallback a Supabase) | `/api/productos` existe y tiene caché de 30 s |

Las contraseñas que vienen de Supabase en texto plano **siguen funcionando**: se convierten a hash automáticamente
la primera vez que cada usuario inicia sesión.

Archivos principales:

- `worker/index.ts` — API (productos, ventas, compras, usuarios, login, recuperación, imágenes)
- `worker/auth.ts` — hash de contraseñas y sesiones (JWT)
- `src/lib/api.ts` — cliente que usa el frontend (reemplaza a `supabase-js`)
- `wrangler.jsonc` — configuración de Cloudflare (dominio, R2, variables)
- `neon/schema.sql` — esquema de la base de datos para Neon
- `scripts/migrate-images.mjs` — copia las imágenes de Supabase Storage a R2

---

## Guía de migración paso a paso

Necesitas Node.js 20 o superior y, para migrar datos, `pg_dump`/`psql` (vienen con PostgreSQL; en Windows instala
"PostgreSQL" y marca *Command Line Tools*). Usa una versión de PostgreSQL igual o mayor que la de tu proyecto
Supabase (instalar la 17 es lo más seguro).

### 1. Crear la base de datos en Neon

1. Entra a <https://console.neon.tech> y crea un proyecto. Elige la región más cercana a Perú (São Paulo, si aparece).
2. En **Connect**, copia la cadena de conexión **pooled** (el host contiene `-pooler`). Se ve así:
   `postgresql://usuario:clave@ep-xxxx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require`
3. Abre el **SQL Editor** de Neon, pega el contenido de `neon/schema.sql` y ejecútalo.

### 2. Migrar los datos desde Supabase

1. En Supabase: **Project Settings → Database → Connection string**, copia la de **Session pooler** (URI) y pon tu contraseña de la base de datos.
2. Exporta solo los datos de tus 4 tablas:

   ```bash
   pg_dump "URL_DE_SUPABASE" --data-only --schema=public \
     -t products -t sales -t users -t purchases \
     --column-inserts --no-owner --no-privileges > datos_supabase.sql
   ```

3. Impórtalos en Neon:

   ```bash
   psql "URL_DE_NEON" -v ON_ERROR_STOP=1 -f datos_supabase.sql
   ```

4. Verifica los conteos (deben coincidir con Supabase):

   ```bash
   psql "URL_DE_NEON" -c "select (select count(*) from products) productos, (select count(*) from users) usuarios, (select count(*) from sales) ventas, (select count(*) from purchases) compras"
   ```

> Si no tienes usuarios en Supabase, ejecuta `neon/seed_admin.sql` para crear un administrador inicial.

### 3. Preparar Cloudflare

```bash
npm install
npx wrangler login                          # abre el navegador para autorizar tu cuenta
npx wrangler r2 bucket create systec-images # bucket para las imágenes
```

### 4. Probar en tu computadora con la base de datos real

1. Copia `.dev.vars.example` como `.dev.vars` y pon tu `DATABASE_URL` de Neon y un `JWT_SECRET`
   (genera uno con `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`).
2. Ejecuta `npm run dev` y abre la URL que muestra. Frontend y API corren juntos, igual que en producción.
3. Prueba: ver catálogo, iniciar sesión como admin, crear/editar un producto, hacer una venta en el POS.

> En local, R2 es un bucket simulado (vacío). Las imágenes reales se ven una vez desplegado.

### 5. Guardar los secretos en Cloudflare

```bash
npx wrangler secret put DATABASE_URL          # pega la cadena de Neon
npx wrangler secret put JWT_SECRET            # pega una cadena aleatoria larga (distinta a la de local)
npx wrangler secret put TURNSTILE_SECRET_KEY  # clave secreta del widget de Turnstile
```

**Turnstile (anti-bots)** protege el login, el registro y la recuperación de contraseña. Crea un widget en
Cloudflare → **Turnstile** con los dominios `systecfl.site` y `www.systecfl.site`, pon su *site key* (pública) en
`wrangler.jsonc` → `vars.TURNSTILE_SITE_KEY` y guarda la *secret key* con el comando de arriba. En local,
`.dev.vars.example` trae las claves de prueba oficiales de Cloudflare, que siempre aprueban.

### 6. Mover el dominio de Vercel a Cloudflare

`wrangler.jsonc` ya tiene `www.systecfl.site` y `systecfl.site` como dominios personalizados. Cloudflare no puede
asignarlos mientras existan los registros DNS que apuntan a Vercel, así que:

1. En el panel de Cloudflare → tu dominio → **DNS → Records**, elimina los registros de Vercel
   (normalmente un `A` a `76.76.21.21` y un `CNAME` `www` a `cname.vercel-dns.com`).
   *Desde aquí la web estará caída unos minutos hasta el paso 2.*
2. Despliega:

   ```bash
   npm run deploy
   ```

   Wrangler crea los registros DNS y el certificado SSL automáticamente.
3. Abre <https://www.systecfl.site> y prueba de nuevo.

> ¿Prefieres probar antes de tocar el dominio? Comenta el bloque `"routes"` en `wrangler.jsonc`, ejecuta
> `npm run deploy` y prueba en la URL `https://tienda-systec.<tu-subdominio>.workers.dev`. Luego descomenta,
> borra los registros de Vercel y vuelve a desplegar.

### 7. Migrar las imágenes de Supabase Storage a R2

```bash
DATABASE_URL="URL_DE_NEON" node scripts/migrate-images.mjs
```

(En PowerShell: `$env:DATABASE_URL="URL_DE_NEON"; node scripts/migrate-images.mjs`)

Descarga cada imagen de Supabase, la sube a R2 y actualiza la URL en `products.image`. Las imágenes externas
(Unsplash, placehold.co, etc.) no se tocan.

### 8. (Recomendado) Recuperación de contraseña por correo

1. Crea una cuenta gratuita en <https://resend.com> y agrega el dominio `systecfl.site`.
   Resend te da registros DNS (DKIM, SPF y DMARC); agrégalos en Cloudflare → DNS (o usa *Auto configure*).
2. Crea una API key y guárdala:

   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

3. El remitente se configura en `wrangler.jsonc` → `vars.MAIL_FROM`.
4. En bases creadas antes de este cambio, ejecuta una vez `neon/migrations/001_password_resets_verificacion.sql`.

El flujo tiene 3 pasos: (1) el usuario escribe su correo y, si existe una cuenta, recibe un código de 6 dígitos
válido 15 minutos (solo el último código es válido y hay que esperar 1 minuto para pedir otro); (2) escribe el
código, con un máximo de 5 intentos; (3) crea su nueva contraseña con un permiso de un solo uso válido 10 minutos.

Sin Resend, "¿Olvidaste tu contraseña?" muestra un mensaje pidiendo contactar al administrador
(el admin puede cambiar contraseñas desde **Usuarios**). En local, con `DEV_LOG_CODES="true"` en `.dev.vars`,
el código aparece en la consola de `npm run dev` en lugar de enviarse por correo.

### 9. Despliegue automático desde GitHub (opcional)

En el panel de Cloudflare → **Workers & Pages** → el Worker `tienda-systec` → **Settings → Build** →
conecta el repositorio `Overpool/TiendaSYSTEC`:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Cada `git push` a `main` desplegará solo. Los secretos del paso 5 se mantienen.

### 10. Apagar lo anterior

Cuando todo funcione unos días:

- Vercel: elimina el proyecto (o quita el dominio).
- Supabase: guarda un respaldo (`pg_dump` completo) y luego pausa o elimina el proyecto.
- Borra las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de tu `.env` local.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Frontend + API en local (necesita `.dev.vars`) |
| `npm run build` | Compila frontend y Worker en `dist/` |
| `npm run preview` | Compila y ejecuta la versión de producción en local |
| `npm run deploy` | Compila y despliega en Cloudflare |
| `npm run cf-typegen` | Regenera los tipos de `wrangler.jsonc` |
| `npx wrangler tail` | Ver logs del Worker en vivo |

## Endpoints de la API

| Método y ruta | Acceso |
|---|---|
| `GET /api/productos` | Público |
| `POST /api/products`, `PATCH/DELETE /api/products/:id`, `POST /api/upload` | Admin o empleado con permiso *Inventario* |
| `GET /api/sales` | Admin o empleado |
| `POST /api/sales` | Cualquiera (tienda online); efectivo solo para personal (POS) |
| `GET/POST /api/purchases` | Admin o empleado con *Inventario* |
| `GET/POST /api/users`, `DELETE /api/users/:id` | Admin o empleado con *Usuarios* |
| `PATCH /api/users/:id` | El propio usuario (perfil) o quien tenga *Usuarios* |
| `POST /api/auth/login`, `/register`, `/forgot`, `/verify-code` | Público, con token de Turnstile |
| `POST /api/auth/reset` | Público, con el permiso que entrega `/verify-code` |
| `POST /api/auth/logout`; `GET /api/auth/me`, `GET /api/config` | Público |
| `PUT /api/me/wishlist` | Usuario con sesión |
| `GET /api/images/*` | Público (imágenes en R2) |
