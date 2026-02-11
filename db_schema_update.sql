-- 1. Create User Columns (DNI, Phone, etc.)
-- These columns are needed for the profile/edit feature
alter table public.users add column if not exists dni text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists address text;
alter table public.users add column if not exists city text;
alter table public.users add column if not exists country text;
alter table public.users add column if not exists zip_code text;
alter table public.users add column if not exists permissions text[];
alter table public.users add column if not exists wishlist text[];

-- 2. Create Product Code Column
-- This column is needed for storing product SKU/Barcode
alter table public.products add column if not exists code text;
-- Add unique constraint if desired (optional but recommended)
-- alter table public.products add constraint products_code_key unique (code);

-- 3. Create Purchases Table
-- This table is needed to store purchase history separately from sales
create table if not exists public.purchases (
  id text primary key,
  supplier text not null,
  total numeric not null,
  date timestamp with time zone default now(),
  items jsonb not null
);

-- 4. Secure Purchases Table
alter table public.purchases enable row level security;
create policy "Enable all access for all users" on public.purchases for all using (true) with check (true);
