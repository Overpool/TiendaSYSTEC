-- Envíos por Shalom: datos del destinatario (DNI verificado con apisPeru) y seguimiento desde el panel.
-- Ejecutar una vez en bases creadas antes de este cambio (neon/schema.sql ya lo incluye).

-- DNI consultados en apisPeru: el nombre se toma de aquí (no del navegador) y ahorra consultas
create table if not exists dni_lookups (
  dni              text primary key,
  nombres          text not null,
  apellido_paterno text not null,
  apellido_materno text not null,
  fetched_at       timestamptz not null default now()
);

-- Un envío por cada venta online
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
create index if not exists shipments_status_idx on shipments (status, created_at desc);

-- Las órdenes de Culqi (pago con QR) guardan los datos de envío hasta que se confirme el pago
alter table culqi_orders add column if not exists shipping jsonb;
