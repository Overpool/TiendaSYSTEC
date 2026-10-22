-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Products Table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  code text, -- Product SKU/Code
  name text not null,
  brand text,
  category text,
  price numeric not null,
  cost numeric not null,
  stock integer not null default 0,
  description text,
  image text,
  is_sale boolean default false,
  discount_price numeric
);

-- Sales Table
create table public.sales (
  id uuid default uuid_generate_v4() primary key,
  user_id text, -- Optional link to registered user
  total numeric not null,
  payment_method text not null,
  date timestamp with time zone default now(),
  items jsonb not null
);

-- Users Table
-- Note: In a production app, use Supabase Auth. This table mimics the current local store.
create table public.users (
  id text primary key, -- Keeping as text to support existing ID format if needed, or switch to uuid
  name text not null,
  email text not null,
  password text not null,
  role text not null check (role in ('admin', 'employee', 'shopper')),
  permissions text[],
  wishlist text[] default array[]::text[], -- Array of product IDs
  -- New Optional Fields
  dni text,
  phone text,
  address text,
  city text,
  zip_code text,
  country text,
  created_at timestamp with time zone default now()
);

-- Row Level Security (RLS) - Optional for now, but good practice
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.users enable row level security;

-- Policies (Open for all for demo purposes - SECURE THIS IN PRODUCTION)
create policy "Enable all access for all users" on public.products for all using (true) with check (true);
create policy "Enable all access for all users" on public.sales for all using (true) with check (true);
create policy "Enable all access for all users" on public.users for all using (true) with check (true);
