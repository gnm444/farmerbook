-- Compatibility bridge for production installations whose original schema was
-- applied before FarmerBook began recording Supabase CLI migration history.
-- Existing agriculture installations keep their control table unchanged; a
-- baseline-only installation receives only the release-control primitive that
-- the isolated sourced-Farmer migration requires.

create table if not exists public.ecosystem_release_controls (
  control_key text primary key check (
    control_key in ('sourced_farmer_research')
  ),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger trigger
    where trigger.tgrelid = 'public.ecosystem_release_controls'::regclass
      and trigger.tgname = 'ecosystem_release_controls_set_updated_at'
      and not trigger.tgisinternal
  ) then
    create trigger ecosystem_release_controls_set_updated_at
    before update on public.ecosystem_release_controls
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.ecosystem_release_controls enable row level security;
revoke all on public.ecosystem_release_controls from public, anon, authenticated;
grant select, update (enabled)
  on public.ecosystem_release_controls to service_role;

create or replace function public.is_ecosystem_release_enabled(
  control_key_input text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select control.enabled
    from public.ecosystem_release_controls control
    where control.control_key = control_key_input
  ), false);
$$;

revoke all on function public.is_ecosystem_release_enabled(text)
  from public, anon, authenticated;
grant execute on function public.is_ecosystem_release_enabled(text)
  to anon, authenticated;
