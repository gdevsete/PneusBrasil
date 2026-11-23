create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  status text not null default 'Novo',
  customer_name text not null,
  whatsapp text not null,
  cep text not null,
  street text not null,
  number text not null,
  neighborhood text not null,
  city text not null,
  state text not null,
  complement text,
  payment_method text not null,
  items jsonb not null,
  total numeric(12,2) not null,
  device_type text,
  device_label text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Anyone can create an order" on public.orders;
create policy "Anyone can create an order"
  on public.orders
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Only authenticated users can read orders" on public.orders;
create policy "Only authenticated users can read orders"
  on public.orders
  for select
  to authenticated
  using (true);

drop policy if exists "Only authenticated users can update orders" on public.orders;
create policy "Only authenticated users can update orders"
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);
