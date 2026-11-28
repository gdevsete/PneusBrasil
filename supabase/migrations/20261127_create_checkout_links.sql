create table if not exists public.checkout_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  order_id uuid references public.orders(id)
);

alter table public.checkout_links enable row level security;
grant select, insert on public.checkout_links to authenticated;

drop policy if exists "Admin manages checkout links" on public.checkout_links;
create policy "Admin manages checkout links"
  on public.checkout_links
  for all
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@outlook.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@outlook.com');

create or replace function public.get_checkout_link(p_token text)
returns table (items jsonb)
language sql
security definer
set search_path = public
as $$
  select c.items
  from public.checkout_links c
  where c.token = p_token
    and c.used_at is null
    and c.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_checkout_link(text) from public;
grant execute on function public.get_checkout_link(text) to anon, authenticated;

create or replace function public.submit_checkout_link_order(
  p_token text,
  p_customer_name text,
  p_whatsapp text,
  p_cep text,
  p_street text,
  p_number text,
  p_neighborhood text,
  p_city text,
  p_state text,
  p_complement text,
  p_payment_method text,
  p_device_type text,
  p_device_label text,
  p_user_agent text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.checkout_links%rowtype;
  v_total numeric(12,2);
  v_public_id text;
  v_order_id uuid;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2
    or length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10
    or length(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g')) <> 8
    or length(trim(coalesce(p_street, ''))) = 0
    or length(trim(coalesce(p_number, ''))) = 0
    or length(trim(coalesce(p_neighborhood, ''))) = 0
    or length(trim(coalesce(p_city, ''))) = 0
    or length(trim(coalesce(p_state, ''))) <> 2
    or coalesce(p_payment_method, '') not in ('Pix', 'CartÃ£o', 'Dinheiro') then
    raise exception 'Dados de pedido inválidos';
  end if;

  select * into v_link
  from public.checkout_links
  where token = p_token
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Link de pedido expirado ou já utilizado';
  end if;

  select sum((item.value ->> 'price')::numeric * (item.value ->> 'quantity')::integer)
  into v_total
  from jsonb_array_elements(v_link.items) as item(value);

  if v_total is null or v_total <= 0 then
    raise exception 'Itens do pedido inválidos';
  end if;

  v_public_id := 'PED-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.orders (
    public_id, status, customer_name, whatsapp, cep, street, number,
    neighborhood, city, state, complement, payment_method, items, total,
    device_type, device_label, user_agent
  ) values (
    v_public_id, 'Novo', trim(p_customer_name), p_whatsapp, p_cep,
    trim(p_street), trim(p_number), trim(p_neighborhood), trim(p_city),
    upper(trim(p_state)), nullif(trim(coalesce(p_complement, '')), ''),
    p_payment_method, v_link.items, v_total, p_device_type, p_device_label, p_user_agent
  ) returning id into v_order_id;

  update public.checkout_links
  set used_at = now(), order_id = v_order_id
  where id = v_link.id;

  return v_public_id;
end;
$$;

revoke all on function public.submit_checkout_link_order(text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_checkout_link_order(text, text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
