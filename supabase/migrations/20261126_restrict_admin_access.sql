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

drop policy if exists "Authenticated users manage tracking" on public.tracking_codes;
create policy "Authenticated users manage tracking"
  on public.tracking_codes
  for all
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@gmail.com');
