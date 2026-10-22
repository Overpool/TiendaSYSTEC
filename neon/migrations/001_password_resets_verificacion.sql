-- Recuperación de contraseña en 3 pasos (código -> verificación -> nueva contraseña).
-- Ejecutar una vez en bases creadas antes de este cambio (neon/schema.sql ya lo incluye).
alter table password_resets add column if not exists attempts    integer not null default 0;
alter table password_resets add column if not exists verified_at timestamptz;
