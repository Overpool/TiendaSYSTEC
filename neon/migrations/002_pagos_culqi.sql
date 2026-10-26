-- Pagos online con Culqi (tarjeta, Yape con código de aprobación y billeteras Yape/Plin por QR).
-- Ejecutar una vez en bases creadas antes de este cambio (neon/schema.sql ya lo incluye).

-- Referencia del cobro en Culqi (chr_... u ord_...) y datos de contacto del comprador
alter table sales add column if not exists payment_ref text;
alter table sales add column if not exists customer    jsonb;
alter table sales alter column customer type jsonb using customer::jsonb; -- por si existía como text
create unique index if not exists sales_payment_ref_key on sales (payment_ref) where payment_ref is not null;

-- Órdenes de Culqi pendientes de pago (billeteras): guardan el carrito hasta que Culqi confirma el pago
create table if not exists culqi_orders (
  id           text primary key,              -- ord_test_... / ord_live_...
  amount_cents integer not null,
  user_id      text,
  customer     jsonb not null,
  items        jsonb not null,
  status       text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed')),
  sale_id      uuid,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
