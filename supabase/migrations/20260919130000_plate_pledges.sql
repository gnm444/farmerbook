-- Private pledge submissions for the no-plastic plate campaign.
-- The service-role API owns both writes and the deliberately redacted name list.

create table public.plate_pledges (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (
    char_length(btrim(display_name)) between 2 and 120
  ),
  phone_number text not null check (
    phone_number ~ '^[+]91[6-9][0-9]{9}$'
  ),
  locality text check (
    locality is null or char_length(btrim(locality)) between 1 and 120
  ),
  organization text check (
    organization is null or char_length(btrim(organization)) between 1 and 160
  ),
  choice text not null default 'natural_leaf' check (choice = 'natural_leaf'),
  show_public_name boolean not null default false,
  consented_at timestamptz not null default now(),
  consent_version text not null default 'plate-pledge-v1' check (
    consent_version = 'plate-pledge-v1'
  ),
  created_at timestamptz not null default now()
);

comment on table public.plate_pledges is
  'Private no-plastic pledge submissions; access is restricted to service_role.';
comment on column public.plate_pledges.phone_number is
  'Private contact detail. Never expose through a public listing function.';

create index plate_pledges_public_names_created_idx
  on public.plate_pledges (created_at desc)
  where show_public_name;

create unique index plate_pledges_phone_number_unique_idx
  on public.plate_pledges (phone_number);

create or replace function public.submit_plate_pledge(
  display_name_input text,
  phone_number_input text,
  locality_input text default null,
  organization_input text default null,
  show_public_name_input boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;

  insert into public.plate_pledges (
    display_name,
    phone_number,
    locality,
    organization,
    choice,
    show_public_name,
    consented_at,
    consent_version
  ) values (
    btrim(display_name_input),
    btrim(phone_number_input),
    nullif(btrim(locality_input), ''),
    nullif(btrim(organization_input), ''),
    'natural_leaf',
    coalesce(show_public_name_input, false),
    clock_timestamp(),
    'plate-pledge-v1'
  ) returning id into created_id;

  return created_id;
end;
$$;

create or replace function public.list_plate_pledge_names(
  limit_input integer default 100
)
returns table(display_name text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if limit_input is null or limit_input < 1 or limit_input > 200 then
    raise exception 'Invalid pledge name list limit'
      using errcode = '22023', detail = 'INVALID_LIMIT';
  end if;

  return query
  select pledge.display_name, pledge.created_at
  from public.plate_pledges pledge
  where pledge.show_public_name
  order by pledge.created_at desc, pledge.id desc
  limit limit_input;
end;
$$;

alter table public.plate_pledges enable row level security;
alter table public.plate_pledges force row level security;

revoke all on table public.plate_pledges from public, anon, authenticated;
revoke all on function public.submit_plate_pledge(text, text, text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.list_plate_pledge_names(integer)
  from public, anon, authenticated;

grant select, insert, update, delete on public.plate_pledges to service_role;
grant execute on function public.submit_plate_pledge(
  text, text, text, text, boolean
) to service_role;
grant execute on function public.list_plate_pledge_names(integer)
  to service_role;
