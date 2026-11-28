-- Remove a coluna e a resposta do RPC para bancos que já aplicaram a migração anterior.
drop function if exists public.get_android_app_release();

alter table if exists public.android_app_releases
  drop column if exists sha256;

create function public.get_android_app_release()
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
