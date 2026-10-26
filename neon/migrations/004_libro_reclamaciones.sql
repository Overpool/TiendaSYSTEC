-- Libro de Reclamaciones virtual (Código de Protección y Defensa del Consumidor, Ley 29571, y su reglamento).
-- Ejecutar una vez en bases creadas antes de este cambio (neon/schema.sql ya lo incluye).
-- Las hojas se conservan al menos 2 años; no se borran desde la aplicación.

create sequence if not exists complaints_number_seq;

create table if not exists complaints (
  id               uuid primary key default gen_random_uuid(),
  number           integer not null unique default nextval('complaints_number_seq'), -- correlativo de la hoja
  type             text not null check (type in ('reclamo', 'queja')),
  -- 1. Consumidor reclamante
  consumer_name    text not null,
  document_type    text not null check (document_type in ('DNI', 'CE', 'PASAPORTE', 'RUC')),
  document_number  text not null,
  address          text not null,
  phone            text not null,
  email            text not null,
  guardian_name    text,          -- padre, madre o apoderado si el consumidor es menor de edad
  -- 2. Bien contratado
  item_type        text not null check (item_type in ('producto', 'servicio')),
  item_description text not null,
  amount           numeric,       -- monto reclamado (opcional)
  order_code       text,          -- N° de pedido (opcional)
  -- 3. Detalle y pedido
  detail           text not null,
  request          text not null,
  -- 4. Respuesta del proveedor
  status           text not null default 'pendiente' check (status in ('pendiente', 'respondido')),
  response         text,
  responded_at     timestamptz,
  responded_by     text,
  user_id          text,          -- si lo registró un usuario con sesión
  created_at       timestamptz not null default now()
);
create index if not exists complaints_created_idx on complaints (created_at desc);
