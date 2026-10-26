-- =====================================================================
-- Esquema de TiendaSYSTEC para Neon (Postgres)
-- Ejecútalo UNA vez en el SQL Editor de Neon (o con psql) ANTES de migrar los datos.
-- Reúne supabase_schema.sql + db_schema_update.sql + columnas que el código ya usaba (min_stock)
-- Ya no hay políticas RLS "abiertas": la base de datos solo es accesible desde el Worker.
-- =====================================================================

create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  code           text,
  name           text not null,
  brand          text,
  category       text,
  price          numeric not null,
  cost           numeric not null,
  stock          integer not null default 0,
  min_stock      integer default 0,
  description    text,
  image          text,
  is_sale        boolean default false,
  discount_price numeric
);

create table if not exists sales (
  id             uuid primary key default gen_random_uuid(),
  user_id        text,
  total          numeric not null,
  payment_method text not null,
  date           timestamptz default now(),
  items          jsonb not null,
  payment_ref    text,   -- id del cobro en Culqi (chr_... u ord_...) en ventas online
  customer       jsonb   -- datos de contacto del comprador en ventas online
);
create unique index if not exists sales_payment_ref_key on sales (payment_ref) where payment_ref is not null;

-- Órdenes de Culqi pendientes de pago (billeteras Yape/Plin por QR)
create table if not exists culqi_orders (
  id           text primary key,
  amount_cents integer not null,
  user_id      text,
  customer     jsonb not null,
  shipping     jsonb,          -- datos de envío (Shalom) hasta que se confirme el pago
  items        jsonb not null,
  status       text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed')),
  sale_id      uuid,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create table if not exists purchases (
  id       text primary key,
  supplier text not null,
  total    numeric not null,
  date     timestamptz default now(),
  items    jsonb not null
);

create table if not exists users (
  id          text primary key,
  name        text not null,
  email       text not null,
  password    text not null,  -- hash PBKDF2 (las contraseñas migradas en texto plano se hashean en el primer login)
  role        text not null check (role in ('admin', 'employee', 'shopper')),
  permissions text[] default array[]::text[],
  wishlist    text[] default array[]::text[],
  dni         text,
  phone       text,
  address     text,
  city        text,
  zip_code    text,
  country     text,
  created_at  timestamptz default now()
);

-- Códigos de recuperación de contraseña (se guarda solo el hash del código)
create table if not exists password_resets (
  id          bigint generated always as identity primary key,
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  attempts    integer not null default 0,  -- intentos fallidos (se invalida al llegar a 5)
  verified_at timestamptz,                 -- momento en que se validó el código
  created_at  timestamptz not null default now()
);

-- DNI consultados en apisPeru (el nombre del destinatario se toma de aquí, no del navegador)
create table if not exists dni_lookups (
  dni              text primary key,
  nombres          text not null,
  apellido_paterno text not null,
  apellido_materno text not null,
  fetched_at       timestamptz not null default now()
);

-- Envíos por Shalom: uno por cada venta online
create table if not exists shipments (
  id             uuid primary key default gen_random_uuid(),
  sale_id        uuid not null unique references sales (id) on delete cascade,
  status         text not null default 'pendiente'
                 check (status in ('pendiente', 'preparando', 'enviado', 'en_agencia', 'entregado', 'cancelado')),
  dni            text not null,
  recipient_name text not null,
  phone          text not null,
  email          text not null,
  department     text not null,
  province       text not null,
  agency         jsonb not null,  -- agencia Shalom elegida: { id, nombre, direccion, distrito, horario }
  tracking_code  text,            -- N° de orden / guía de Shalom
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Libro de Reclamaciones virtual (Ley 29571); las hojas se conservan al menos 2 años
create sequence if not exists complaints_number_seq;
create table if not exists complaints (
  id               uuid primary key default gen_random_uuid(),
  number           integer not null unique default nextval('complaints_number_seq'),
  type             text not null check (type in ('reclamo', 'queja')),
  consumer_name    text not null,
  document_type    text not null check (document_type in ('DNI', 'CE', 'PASAPORTE', 'RUC')),
  document_number  text not null,
  address          text not null,
  phone            text not null,
  email            text not null,
  guardian_name    text,          -- padre, madre o apoderado si el consumidor es menor de edad
  item_type        text not null check (item_type in ('producto', 'servicio')),
  item_description text not null,
  amount           numeric,
  order_code       text,
  detail           text not null,
  request          text not null,
  status           text not null default 'pendiente' check (status in ('pendiente', 'respondido')),
  response         text,
  responded_at     timestamptz,
  responded_by     text,
  user_id          text,
  created_at       timestamptz not null default now()
);

create index if not exists products_name_idx     on products (name);
create index if not exists complaints_created_idx on complaints (created_at desc);
create index if not exists shipments_status_idx  on shipments (status, created_at desc);
create index if not exists sales_date_idx        on sales (date desc);
create index if not exists purchases_date_idx    on purchases (date desc);
create index if not exists users_email_lower_idx on users (lower(email));
create index if not exists password_resets_email_idx on password_resets (lower(email));
