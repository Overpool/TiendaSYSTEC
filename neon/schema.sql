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
  items          jsonb not null
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

create index if not exists products_name_idx     on products (name);
create index if not exists sales_date_idx        on sales (date desc);
create index if not exists purchases_date_idx    on purchases (date desc);
create index if not exists users_email_lower_idx on users (lower(email));
create index if not exists password_resets_email_idx on password_resets (lower(email));
