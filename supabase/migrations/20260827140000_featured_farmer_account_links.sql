-- Explicit, administrator-reviewed bridge between a curated editorial profile
-- and one real FarmerBook account. It never converts the editorial record
-- into an identity or certification claim.

create table public.featured_farmer_account_links (
  featured_farmer_slug text primary key check (
    char_length(featured_farmer_slug) between 3 and 120
    and featured_farmer_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  linked_by uuid not null references auth.users(id) on delete restrict,
  linked_at timestamptz not null default now(),
  evidence_note text not null check (
    char_length(evidence_note) between 2 and 500
    and evidence_note = btrim(evidence_note)
    and replace(evidence_note, chr(10), '') !~ '[[:cntrl:]]'
  )
);

create table public.featured_farmer_account_link_events (
  id bigint generated always as identity primary key,
  featured_farmer_slug text not null check (
    char_length(featured_farmer_slug) between 3 and 120
    and featured_farmer_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('linked', 'unlinked')),
  acted_by uuid not null references auth.users(id) on delete restrict,
  note text not null check (
    char_length(note) between 2 and 500
    and note = btrim(note)
    and replace(note, chr(10), '') !~ '[[:cntrl:]]'
  ),
  created_at timestamptz not null default now()
);

create index featured_farmer_account_link_events_slug_idx
  on public.featured_farmer_account_link_events (
    featured_farmer_slug, created_at desc
  );

alter table public.featured_farmer_account_links enable row level security;
alter table public.featured_farmer_account_links force row level security;
alter table public.featured_farmer_account_link_events enable row level security;
alter table public.featured_farmer_account_link_events force row level security;

create or replace function public.search_featured_farmer_linkable_profiles(
  query_input text,
  limit_input integer default 12
)
returns table(
  profile_id uuid,
  handle text,
  full_name text,
  account_role text,
  onboarding_complete boolean,
  status text,
  public_profile_enabled boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := lower(btrim(coalesce(query_input, '')));
begin
  if not public.is_admin() then
    raise exception 'Administrator access required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if char_length(normalized_query) < 2 then
    raise exception 'Search needs at least two characters'
      using errcode = '22023', detail = 'INVALID_QUERY';
  end if;
  return query
  select
    profile.id,
    profile.handle,
    profile.full_name,
    profile.account_role,
    profile.onboarding_complete,
    profile.status,
    profile.public_profile_enabled
  from public.profiles profile
  where lower(profile.full_name) like '%' || normalized_query || '%'
     or lower(profile.handle) like '%' || normalized_query || '%'
  order by
    (lower(profile.handle) = normalized_query) desc,
    (lower(profile.full_name) = normalized_query) desc,
    profile.created_at desc
  limit greatest(1, least(coalesce(limit_input, 12), 25));
end;
$$;

create or replace function public.link_featured_farmer_account(
  slug_input text,
  profile_id_input uuid,
  note_input text
)
returns table(
  featured_farmer_slug text,
  profile_id uuid,
  handle text,
  full_name text,
  linked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target public.profiles%rowtype;
  replaced public.featured_farmer_account_links%rowtype;
  normalized_slug text := btrim(coalesce(slug_input, ''));
  normalized_note text := btrim(coalesce(note_input, ''));
  saved public.featured_farmer_account_links%rowtype;
begin
  if not public.is_admin() or actor_id is null then
    raise exception 'Administrator access required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(normalized_slug) not between 3 and 120
    or profile_id_input is null
    or char_length(normalized_note) not between 2 and 500
    or replace(normalized_note, chr(10), '') ~ '[[:cntrl:]]'
  then
    raise exception 'Link details are invalid'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select * into target from public.profiles
  where id = profile_id_input
  for update;
  if not found or target.status <> 'active'
    or not target.onboarding_complete or target.account_role <> 'farmer'
  then
    raise exception 'Select an active, onboarded Farmer account'
      using errcode = '42501', detail = 'LINKABLE_FARMER_REQUIRED';
  end if;

  if exists (
    select 1 from public.featured_farmer_account_links
    where profile_id = profile_id_input and featured_farmer_slug <> normalized_slug
  ) then
    raise exception 'This FarmerBook account is already linked to another featured profile'
      using errcode = '23505', detail = 'PROFILE_ALREADY_LINKED';
  end if;

  select * into replaced from public.featured_farmer_account_links
  where featured_farmer_slug = normalized_slug
    and profile_id <> profile_id_input
  for update;

  if found then
    delete from public.featured_farmer_account_links
    where featured_farmer_slug = normalized_slug;
    insert into public.featured_farmer_account_link_events (
      featured_farmer_slug, profile_id, action, acted_by, note
    ) values (
      replaced.featured_farmer_slug, replaced.profile_id, 'unlinked', actor_id,
      'Replaced by a newly approved account link.'
    );
  end if;

  insert into public.featured_farmer_account_links (
    featured_farmer_slug, profile_id, linked_by, evidence_note
  ) values (
    normalized_slug, profile_id_input, actor_id, normalized_note
  )
  on conflict (featured_farmer_slug) do update
    set profile_id = excluded.profile_id,
        linked_by = excluded.linked_by,
        linked_at = now(),
        evidence_note = excluded.evidence_note
  returning * into saved;

  insert into public.featured_farmer_account_link_events (
    featured_farmer_slug, profile_id, action, acted_by, note
  ) values (
    normalized_slug, profile_id_input, 'linked', actor_id, normalized_note
  );

  return query select saved.featured_farmer_slug, target.id, target.handle,
    target.full_name, saved.linked_at;
end;
$$;

create or replace function public.unlink_featured_farmer_account(
  slug_input text,
  note_input text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  saved public.featured_farmer_account_links%rowtype;
  normalized_slug text := btrim(coalesce(slug_input, ''));
  normalized_note text := btrim(coalesce(note_input, ''));
begin
  if not public.is_admin() or actor_id is null then
    raise exception 'Administrator access required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if char_length(normalized_note) not between 2 and 500
    or replace(normalized_note, chr(10), '') ~ '[[:cntrl:]]'
  then
    raise exception 'An unlink note is required'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  delete from public.featured_farmer_account_links
  where featured_farmer_slug = normalized_slug
  returning * into saved;
  if not found then return false; end if;
  insert into public.featured_farmer_account_link_events (
    featured_farmer_slug, profile_id, action, acted_by, note
  ) values (
    saved.featured_farmer_slug, saved.profile_id, 'unlinked', actor_id, normalized_note
  );
  return true;
end;
$$;

create or replace function public.get_featured_farmer_public_account(
  slug_input text
)
returns table(
  handle text,
  full_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.handle, profile.full_name
  from public.featured_farmer_account_links link
  join public.profiles profile on profile.id = link.profile_id
  where link.featured_farmer_slug = btrim(slug_input)
    and profile.status = 'active'
    and profile.account_role = 'farmer'
    and profile.public_profile_enabled;
$$;

revoke all on function public.search_featured_farmer_linkable_profiles(text, integer) from public;
revoke all on function public.link_featured_farmer_account(text, uuid, text) from public;
revoke all on function public.unlink_featured_farmer_account(text, text) from public;
revoke all on function public.get_featured_farmer_public_account(text) from public;
grant execute on function public.search_featured_farmer_linkable_profiles(text, integer) to authenticated;
grant execute on function public.link_featured_farmer_account(text, uuid, text) to authenticated;
grant execute on function public.unlink_featured_farmer_account(text, text) to authenticated;
grant execute on function public.get_featured_farmer_public_account(text) to anon, authenticated;
