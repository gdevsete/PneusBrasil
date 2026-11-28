insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'checkout-product-images',
  'checkout-product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin uploads checkout product images" on storage.objects;
create policy "Admin uploads checkout product images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'checkout-product-images'
    and lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@outlook.com'
  );
