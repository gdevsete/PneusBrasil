insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'android-app-downloads',
  'android-app-downloads',
  true,
  104857600,
  array['application/vnd.android.package-archive', 'application/octet-stream']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin uploads Android app APKs" on storage.objects;
create policy "Admin uploads Android app APKs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'android-app-downloads'
    and lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@outlook.com'
  );

drop policy if exists "Admin removes old Android app APKs" on storage.objects;
create policy "Admin removes old Android app APKs"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'android-app-downloads'
    and lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@outlook.com'
  );

create table if not exists public.android_app_releases (
  id text primary key default 'current' check (id = 'current'),
  app_name text not null,
  version text not null,
  description text not null,
  release_notes text,
  file_path text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  updated_at timestamptz not null default now(),
  uploaded_by uuid not null default auth.uid() references auth.users(id)
);

alter table public.android_app_releases enable row level security;
grant select, insert, update on public.android_app_releases to authenticated;

drop policy if exists "Admin manages Android app release" on public.android_app_releases;
create policy "Admin manages Android app release"
  on public.android_app_releases
  for all
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@outlook.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'fehprado2025@outlook.com');

create or replace function public.get_android_app_release()
returns table (
  app_name text,
  version text,
  description text,
  release_notes text,
  file_path text,
  file_size_bytes bigint,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.app_name,
    r.version,
    r.description,
    r.release_notes,
    r.file_path,
    r.file_size_bytes,
    r.updated_at
  from public.android_app_releases r
  where r.id = 'current'
  limit 1;
$$;

revoke all on function public.get_android_app_release() from public;
grant execute on function public.get_android_app_release() to anon, authenticated;
