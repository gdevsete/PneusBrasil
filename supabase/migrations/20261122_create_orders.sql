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
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@gmail.com');

drop policy if exists "Only authenticated users can update orders" on public.orders;
create policy "Only authenticated users can update orders"
  on public.orders
  for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@gmail.com');

create table if not exists public.tracking_codes (
  code text primary key,
  order_id uuid references public.orders(id) on delete cascade,
  origin_city text not null,
  destination_city text not null,
  current_status text not null default 'Pedido confirmado',
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tracking_codes enable row level security;

drop policy if exists "Authenticated users manage tracking" on public.tracking_codes;
create policy "Authenticated users manage tracking"
  on public.tracking_codes
  for all
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@gmail.com');

create or replace function public.get_tracking(p_code text)
returns table (
  code text,
  origin_city text,
  destination_city text,
  current_status text,
  history jsonb,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    t.code,
    t.origin_city,
    t.destination_city,
    t.current_status,
    t.history,
    t.updated_at
  from public.tracking_codes t
  where t.code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.get_tracking(text) from public;
grant execute on function public.get_tracking(text) to anon, authenticated;
