-- Private Known Farmer Intake. Administrators can curate permitted public
-- evidence and official YouTube API candidates into the existing managed
-- profile sample flow. Nothing here publishes, verifies, contacts or sends.

alter table public.managed_profile_sample_sources
  add column if not exists subject_association text not null
    default 'professional_reference',
  add column if not exists provider_item_id text;

alter table public.managed_profile_sample_sources
  drop constraint if exists managed_profile_sample_sources_discovery_provider_check,
  drop constraint if exists managed_profile_sample_sources_usage_rights_basis_check,
  drop constraint if exists managed_profile_sample_sources_check;

alter table public.managed_profile_sample_sources
  add constraint managed_profile_sample_sources_subject_association_check check (
    subject_association in (
      'owned_social_profile', 'third_party_coverage',
      'professional_reference'
    )
  ),
  add constraint managed_profile_sample_sources_provider_item_id_check check (
    provider_item_id is null
    or char_length(provider_item_id) between 1 and 160
  ),
  add constraint managed_profile_sample_sources_discovery_provider_v2_check check (
    discovery_provider is null or discovery_provider in (
      'brave_search', 'manual_google_review', 'youtube_data_api',
      'operator_supplied'
    )
  ),
  add constraint managed_profile_sample_sources_usage_rights_v2_check check (
    usage_rights_basis is null or usage_rights_basis in (
      'provider_storage_plan', 'operator_selected_destination',
      'youtube_api_terms', 'operator_supplied'
    )
  ),
  add constraint managed_profile_sample_sources_provider_provenance_v2_check check (
    (
      discovery_provider is null
      and provider_query_hash is null
      and provider_item_id is null
      and usage_rights_basis is null
    ) or (
      discovery_provider = 'brave_search'
      and provider_query_hash is not null
      and provider_item_id is null
      and usage_rights_basis = 'provider_storage_plan'
    ) or (
      discovery_provider = 'manual_google_review'
      and provider_query_hash is not null
      and provider_item_id is null
      and usage_rights_basis = 'operator_selected_destination'
    ) or (
      discovery_provider = 'youtube_data_api'
      and provider_query_hash is not null
      and provider_item_id is not null
      and usage_rights_basis = 'youtube_api_terms'
    ) or (
      discovery_provider = 'operator_supplied'
      and provider_query_hash is null
      and provider_item_id is null
      and usage_rights_basis = 'operator_supplied'
    )
  );

create table public.known_farmer_intakes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  subject_name text not null check (char_length(subject_name) between 2 and 100),
  location_hint text check (
    location_hint is null or char_length(location_hint) between 2 and 120
  ),
  farming_hint text check (
    farming_hint is null or char_length(farming_hint) between 2 and 120
  ),
  preferred_locale text not null check (
    char_length(preferred_locale) between 2 and 20
  ),
  relationship_basis text not null check (relationship_basis in (
    'founder_known', 'team_known', 'in_person_meeting',
    'trusted_partner_referral'
  )),
  relationship_confirmed_at timestamptz not null,
  google_query_hash text not null check (google_query_hash ~ '^[0-9a-f]{64}$'),
  social_discovery_completed_at timestamptz,
  state text not null default 'researching' check (state in (
    'researching', 'research_incomplete', 'ready_to_build', 'built',
    'rejected', 'expired'
  )),
  prospect_id uuid unique
    references public.outreach_prospects (id) on delete set null,
  sample_id uuid unique
    references public.managed_profile_samples (id) on delete set null,
  creation_idempotency_key uuid not null unique,
  build_idempotency_key uuid unique,
  retention_expires_at timestamptz not null default (now() + interval '30 days'),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (retention_expires_at > created_at),
  check (
    (state = 'built' and prospect_id is not null and sample_id is not null)
    or (state <> 'built' and prospect_id is null and sample_id is null)
  )
);

create table public.known_farmer_source_candidates (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null
    references public.known_farmer_intakes (id) on delete cascade,
  source_url text not null check (
    char_length(source_url) between 8 and 2048
    and source_url ~ '^https://'
  ),
  source_type text not null check (source_type in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin', 'other_social'
  )),
  source_title text check (
    source_title is null or char_length(source_title) between 1 and 180
  ),
  source_excerpt text not null
    check (char_length(source_excerpt) between 2 and 8000),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  discovery_method text not null check (discovery_method in (
    'manual_google_review', 'youtube_data_api', 'operator_supplied'
  )),
  subject_association text not null default 'professional_reference' check (
    subject_association in (
      'owned_social_profile', 'third_party_coverage',
      'professional_reference'
    )
  ),
  decision text not null default 'pending' check (
    decision in ('pending', 'selected', 'rejected')
  ),
  provider_item_id text check (
    provider_item_id is null or char_length(provider_item_id) between 1 and 160
  ),
  provider_query_hash text check (
    provider_query_hash is null or provider_query_hash ~ '^[0-9a-f]{64}$'
  ),
  usage_rights_basis text not null check (usage_rights_basis in (
    'operator_selected_destination', 'youtube_api_terms', 'operator_supplied'
  )),
  collected_at timestamptz not null,
  refresh_due_at timestamptz,
  retention_expires_at timestamptz not null,
  creation_idempotency_key uuid not null unique,
  decision_idempotency_key uuid unique,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intake_id, source_hash),
  check (retention_expires_at > created_at),
  check (
    (
      discovery_method = 'manual_google_review'
      and provider_query_hash is not null
      and provider_item_id is null
      and usage_rights_basis = 'operator_selected_destination'
      and refresh_due_at is null
    ) or (
      discovery_method = 'youtube_data_api'
      and source_type = 'youtube'
      and provider_query_hash is not null
      and provider_item_id is not null
      and usage_rights_basis = 'youtube_api_terms'
      and refresh_due_at is not null
      and refresh_due_at <= collected_at + interval '30 days'
    ) or (
      discovery_method = 'operator_supplied'
      and provider_query_hash is null
      and provider_item_id is null
      and usage_rights_basis = 'operator_supplied'
      and refresh_due_at is null
    )
  )
);

create table public.known_farmer_youtube_searches (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null
    references public.known_farmer_intakes (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete restrict,
  query_hash text not null check (query_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'reserved' check (
    state in ('reserved', 'succeeded', 'failed')
  ),
  result_count smallint check (result_count between 0 and 5),
  failure_code text check (
    failure_code is null or failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  idempotency_key uuid not null unique,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (state = 'reserved' and result_count is null and failure_code is null
      and completed_at is null)
    or (state = 'succeeded' and result_count between 0 and 5
      and failure_code is null and completed_at is not null)
    or (state = 'failed' and result_count between 0 and 5
      and failure_code is not null and completed_at is not null)
  )
);

create index known_farmer_intakes_retention_idx
  on public.known_farmer_intakes (retention_expires_at)
  where state not in ('built', 'rejected', 'expired');
create index known_farmer_candidates_intake_idx
  on public.known_farmer_source_candidates (intake_id, decision, created_at);
create index known_farmer_candidates_retention_idx
  on public.known_farmer_source_candidates (retention_expires_at);
create index known_farmer_youtube_quota_idx
  on public.known_farmer_youtube_searches (requested_by, created_at desc);

create or replace function public.is_supported_owned_social_profile_url(
  source_type_input text,
  source_url_input text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select case source_type_input
    when 'linkedin' then source_url_input ~* '^https://([^/]+\.)?linkedin\.com/in/[^/?#]+/?(\?.*)?$'
    when 'instagram' then
      source_url_input ~* '^https://([^/]+\.)?instagram\.com/[^/?#]+/?(\?.*)?$'
      and source_url_input !~* 'instagram\.com/(p|reel|reels|stories|tv)(/|\?|$)'
    when 'facebook' then
      source_url_input ~* '^https://([^/]+\.)?facebook\.com/profile\.php\?[^#]*id=[^&#]+'
      or (
        source_url_input ~* '^https://([^/]+\.)?facebook\.com/[^/?#]+/?(\?.*)?$'
        and source_url_input !~* 'facebook\.com/(groups|photo|photos|reel|reels|story\.php|watch)(/|\?|$)'
      )
    when 'youtube' then source_url_input ~* '^https://([^/]+\.)?youtube\.com/(@[^/?#]+|channel/[^/?#]+)/?(\?.*)?$'
    else false
  end;
$$;

create or replace function public.require_social_link_for_public_farmer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.account_role = 'farmer'
    and new.public_profile_enabled
    and not (
      public.is_supported_owned_social_profile_url(
        'linkedin', coalesce(new.linkedin_url, '')
      )
      or public.is_supported_owned_social_profile_url(
        'instagram', coalesce(new.instagram_url, '')
      )
      or public.is_supported_owned_social_profile_url(
        'facebook', coalesce(new.facebook_url, '')
      )
      or public.is_supported_owned_social_profile_url(
        'youtube', coalesce(new.youtube_url, '')
      )
    )
  then
    raise exception 'A public Farmer profile requires an approved social link'
      using errcode = '22023', detail = 'SOCIAL_LINK_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger profiles_require_social_link_for_public_farmer
before insert or update of account_role, public_profile_enabled,
  linkedin_url, instagram_url, facebook_url, youtube_url
on public.profiles
for each row execute function public.require_social_link_for_public_farmer();

create or replace function public.known_farmer_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger known_farmer_intakes_set_updated_at
before update on public.known_farmer_intakes
for each row execute function public.known_farmer_set_updated_at();

create trigger known_farmer_candidates_set_updated_at
before update on public.known_farmer_source_candidates
for each row execute function public.known_farmer_set_updated_at();

create or replace function public.refresh_known_farmer_intake_state(
  intake_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake public.known_farmer_intakes%rowtype;
  selected_evidence_count integer;
  selected_social_count integer;
begin
  select candidate.* into intake
  from public.known_farmer_intakes candidate
  where candidate.id = intake_id_input
  for update;
  if not found or intake.state in ('built', 'rejected', 'expired') then
    return;
  end if;
  select count(*) into selected_evidence_count
  from public.known_farmer_source_candidates source
  where source.intake_id = intake.id
    and source.decision = 'selected'
    and source.retention_expires_at > now();
  select count(*) into selected_social_count
  from public.known_farmer_source_candidates source
  where source.intake_id = intake.id
    and source.decision = 'selected'
    and source.subject_association = 'owned_social_profile'
    and public.is_supported_owned_social_profile_url(
      source.source_type, source.source_url
    )
    and source.retention_expires_at > now();
  update public.known_farmer_intakes current
  set state = case
        when intake.social_discovery_completed_at is not null
          and selected_evidence_count > 0 and selected_social_count > 0
          then 'ready_to_build'
        when intake.social_discovery_completed_at is not null
          then 'research_incomplete'
        else 'researching'
      end,
      revision = revision + 1
  where current.id = intake.id;
end;
$$;

create or replace function public.create_known_farmer_intake(
  intake_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, intake_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing public.known_farmer_intakes%rowtype;
  created public.known_farmer_intakes%rowtype;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent')
    or not public.is_ecosystem_release_enabled('profile_research_agents')
  then
    raise exception 'Known Farmer Intake is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if idempotency_key_input is null
    or char_length(btrim(intake_input ->> 'fullName')) not between 2 and 100
    or char_length(intake_input ->> 'preferredLocale') not between 2 and 20
    or intake_input ->> 'relationshipBasis' not in (
      'founder_known', 'team_known', 'in_person_meeting',
      'trusted_partner_referral'
    )
    or coalesce((intake_input ->> 'relationshipConfirmed')::boolean, false)
      is not true
    or intake_input ->> 'googleQueryHash' !~ '^[0-9a-f]{64}$'
  then
    raise exception 'Invalid Known Farmer Intake'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select candidate.* into existing
  from public.known_farmer_intakes candidate
  where candidate.creation_idempotency_key = idempotency_key_input
  for update;
  if found then
    if existing.created_by <> actor_id
      or existing.subject_name <> btrim(intake_input ->> 'fullName')
      or existing.google_query_hash <> intake_input ->> 'googleQueryHash'
    then
      raise exception 'Known Farmer Intake idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id, existing.revision;
    return;
  end if;
  insert into public.known_farmer_intakes (
    created_by, subject_name, location_hint, farming_hint, preferred_locale,
    relationship_basis, relationship_confirmed_at, google_query_hash,
    creation_idempotency_key
  ) values (
    actor_id, btrim(intake_input ->> 'fullName'),
    nullif(btrim(intake_input ->> 'locationHint'), ''),
    nullif(btrim(intake_input ->> 'farmingHint'), ''),
    intake_input ->> 'preferredLocale', intake_input ->> 'relationshipBasis',
    now(), intake_input ->> 'googleQueryHash', idempotency_key_input
  ) returning * into created;
  return query select 'CREATED', created.id, created.revision;
end;
$$;

create or replace function public.reserve_known_farmer_youtube_search(
  intake_id_input uuid,
  query_hash_input text,
  idempotency_key_input uuid
)
returns table(code text, search_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  intake public.known_farmer_intakes%rowtype;
  existing public.known_farmer_youtube_searches%rowtype;
  created_id uuid;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent')
    or not public.is_ecosystem_release_enabled('profile_research_agents')
  then
    raise exception 'Known Farmer Intake is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if query_hash_input !~ '^[0-9a-f]{64}$' or idempotency_key_input is null then
    raise exception 'Invalid YouTube search reservation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select candidate.* into intake
  from public.known_farmer_intakes candidate
  where candidate.id = intake_id_input
  for update;
  if not found or intake.created_by <> actor_id
    or intake.retention_expires_at <= now()
    or intake.state in ('built', 'rejected', 'expired')
  then
    raise exception 'Known Farmer Intake is unavailable'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  select request.* into existing
  from public.known_farmer_youtube_searches request
  where request.idempotency_key = idempotency_key_input
  for update;
  if found then
    if existing.intake_id <> intake.id
      or existing.requested_by <> actor_id
      or existing.query_hash <> query_hash_input
    then
      raise exception 'YouTube search idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id;
    return;
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended('known-farmer-youtube-search', 0)
  );
  if (
    select count(*) >= 50
    from public.known_farmer_youtube_searches request
    where request.created_at >= date_trunc('day', now())
  ) or (
    select count(*) >= 10
    from public.known_farmer_youtube_searches request
    where request.requested_by = actor_id
      and request.created_at >= date_trunc('day', now())
  ) or (
    select count(*) >= 100
    from public.known_farmer_youtube_searches request
    where request.requested_by = actor_id
      and request.created_at >= date_trunc('month', now())
  ) then
    raise exception 'Known Farmer YouTube quota exceeded'
      using errcode = 'P0001', detail = 'SEARCH_QUOTA_EXCEEDED';
  end if;
  insert into public.known_farmer_youtube_searches (
    intake_id, requested_by, query_hash, idempotency_key
  ) values (
    intake.id, actor_id, query_hash_input, idempotency_key_input
  ) returning id into created_id;
  return query select 'RESERVED', created_id;
end;
$$;

create or replace function public.complete_known_farmer_youtube_search(
  search_id_input uuid,
  outcome_input jsonb
)
returns table(code text, state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request public.known_farmer_youtube_searches%rowtype;
  outcome_state text := outcome_input ->> 'state';
  result_count_value integer := coalesce(
    (outcome_input ->> 'resultCount')::integer, 0
  );
  failure_code_value text := nullif(outcome_input ->> 'failureCode', '');
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  select candidate.* into request
  from public.known_farmer_youtube_searches candidate
  where candidate.id = search_id_input
  for update;
  if not found or request.requested_by <> actor_id then
    raise exception 'YouTube search reservation not found'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  if request.state <> 'reserved' then
    return query select 'IDEMPOTENT_REPLAY', request.state;
    return;
  end if;
  if result_count_value not between 0 and 5 then
    raise exception 'Invalid YouTube search result count'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if outcome_state = 'succeeded' and failure_code_value is null then
    update public.known_farmer_youtube_searches current
    set state = 'succeeded', result_count = result_count_value,
      completed_at = now()
    where current.id = request.id;
    update public.known_farmer_intakes intake
    set social_discovery_completed_at = now(), revision = revision + 1
    where intake.id = request.intake_id;
    perform public.refresh_known_farmer_intake_state(request.intake_id);
  elsif outcome_state = 'failed'
    and failure_code_value ~ '^[A-Z0-9_]{2,80}$'
  then
    update public.known_farmer_youtube_searches current
    set state = 'failed', result_count = result_count_value,
      failure_code = failure_code_value, completed_at = now()
    where current.id = request.id;
  else
    raise exception 'Invalid YouTube search outcome'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  return query select 'RECORDED', outcome_state;
end;
$$;

create or replace function public.save_known_farmer_source_candidates(
  intake_id_input uuid,
  candidates_input jsonb
)
returns table(code text, saved_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake public.known_farmer_intakes%rowtype;
  item jsonb;
  saved integer := 0;
  method_value text;
  collected_value timestamptz;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  select candidate.* into intake
  from public.known_farmer_intakes candidate
  where candidate.id = intake_id_input
  for update;
  if not found or intake.retention_expires_at <= now()
    or intake.state in ('built', 'rejected', 'expired')
    or jsonb_typeof(candidates_input) <> 'array'
    or jsonb_array_length(candidates_input) not between 1 and 5
  then
    raise exception 'Known Farmer Intake is unavailable'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  for item in select value from jsonb_array_elements(candidates_input)
  loop
    method_value := item ->> 'discoveryMethod';
    collected_value := (item ->> 'collectedAt')::timestamptz;
    if char_length(item ->> 'sourceUrl') not between 8 and 2048
      or item ->> 'sourceUrl' !~ '^https://'
      or item ->> 'sourceType' not in (
        'website', 'youtube', 'instagram', 'facebook', 'linkedin',
        'other_social'
      )
      or char_length(item ->> 'sourceText') not between 2 and 8000
      or item ->> 'sourceHash' !~ '^[0-9a-f]{64}$'
      or item ->> 'subjectAssociation' not in (
        'owned_social_profile', 'third_party_coverage',
        'professional_reference'
      )
      or method_value not in (
        'manual_google_review', 'youtube_data_api', 'operator_supplied'
      )
      or collected_value > now() + interval '5 minutes'
      or not (
        (method_value = 'manual_google_review'
          and item ->> 'providerQueryHash' = intake.google_query_hash
          and item ->> 'providerItemId' is null
          and item ->> 'usageRightsBasis' = 'operator_selected_destination')
        or (method_value = 'youtube_data_api'
          and item ->> 'sourceType' = 'youtube'
          and item ->> 'providerQueryHash' ~ '^[0-9a-f]{64}$'
          and char_length(item ->> 'providerItemId') between 1 and 160
          and item ->> 'usageRightsBasis' = 'youtube_api_terms')
        or (method_value = 'operator_supplied'
          and item ->> 'providerQueryHash' is null
          and item ->> 'providerItemId' is null
          and item ->> 'usageRightsBasis' = 'operator_supplied')
      )
    then
      raise exception 'Invalid Known Farmer source candidate'
        using errcode = '22023', detail = 'INVALID_SOURCE';
    end if;
    insert into public.known_farmer_source_candidates (
      intake_id, source_url, source_type, source_title, source_excerpt,
      source_hash, discovery_method, subject_association, provider_item_id,
      provider_query_hash, usage_rights_basis, collected_at, refresh_due_at,
      retention_expires_at, creation_idempotency_key
    ) values (
      intake.id, item ->> 'sourceUrl', item ->> 'sourceType',
      nullif(btrim(item ->> 'sourceTitle'), ''), item ->> 'sourceText',
      item ->> 'sourceHash', method_value, item ->> 'subjectAssociation',
      item ->> 'providerItemId', item ->> 'providerQueryHash',
      item ->> 'usageRightsBasis', collected_value,
      case when method_value = 'youtube_data_api'
        then least(collected_value + interval '30 days', intake.retention_expires_at)
        else null end,
      least(collected_value + interval '30 days', intake.retention_expires_at),
      (item ->> 'idempotencyKey')::uuid
    ) on conflict (intake_id, source_hash) do nothing;
    if found then saved := saved + 1; end if;
  end loop;
  if exists (
    select 1
    from public.known_farmer_source_candidates candidate
    where candidate.intake_id = intake.id
      and candidate.discovery_method = 'manual_google_review'
  ) then
    update public.known_farmer_intakes current
    set social_discovery_completed_at = coalesce(
          current.social_discovery_completed_at, now()
        ),
        revision = revision + 1
    where current.id = intake.id
      and current.social_discovery_completed_at is null;
    perform public.refresh_known_farmer_intake_state(intake.id);
  end if;
  return query select case when saved = 0 then 'IDEMPOTENT_REPLAY'
    else 'SAVED' end, saved;
end;
$$;

create or replace function public.decide_known_farmer_source_candidate(
  intake_id_input uuid,
  candidate_id_input uuid,
  decision_input text,
  subject_association_input text,
  expected_revision_input integer,
  idempotency_key_input uuid
)
returns table(code text, intake_state text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  intake public.known_farmer_intakes%rowtype;
  source public.known_farmer_source_candidates%rowtype;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if decision_input not in ('selected', 'rejected')
    or subject_association_input not in (
      'owned_social_profile', 'third_party_coverage',
      'professional_reference'
    ) or idempotency_key_input is null
  then
    raise exception 'Invalid candidate decision'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select candidate.* into intake
  from public.known_farmer_intakes candidate
  where candidate.id = intake_id_input
  for update;
  select candidate.* into source
  from public.known_farmer_source_candidates candidate
  where candidate.id = candidate_id_input
    and candidate.intake_id = intake_id_input
  for update;
  if intake.id is null or source.id is null or intake.created_by <> actor_id
    or intake.retention_expires_at <= now()
    or intake.state in ('built', 'rejected', 'expired')
  then
    raise exception 'Known Farmer candidate is unavailable'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  if source.decision_idempotency_key = idempotency_key_input then
    return query select 'IDEMPOTENT_REPLAY', intake.state, source.revision;
    return;
  end if;
  if source.revision <> expected_revision_input then
    raise exception 'Known Farmer candidate changed'
      using errcode = '40001', detail = 'CONFLICT';
  end if;
  if subject_association_input = 'owned_social_profile'
    and not public.is_supported_owned_social_profile_url(
      source.source_type, source.source_url
    )
  then
    raise exception 'Unsupported owned social profile'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  update public.known_farmer_source_candidates candidate
  set decision = decision_input,
      subject_association = subject_association_input,
      decision_idempotency_key = idempotency_key_input,
      revision = revision + 1
  where candidate.id = source.id;
  perform public.refresh_known_farmer_intake_state(intake.id);
  select candidate.* into intake
  from public.known_farmer_intakes candidate where candidate.id = intake.id;
  return query select 'UPDATED', intake.state, source.revision + 1;
end;
$$;

create or replace function public.link_known_farmer_intake_sample(
  intake_id_input uuid,
  prospect_id_input uuid,
  sample_id_input uuid,
  build_idempotency_key_input uuid
)
returns table(code text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake public.known_farmer_intakes%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  select candidate.* into intake
  from public.known_farmer_intakes candidate
  where candidate.id = intake_id_input
  for update;
  if not found or build_idempotency_key_input is null then
    raise exception 'Known Farmer Intake not found'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  if intake.state = 'built'
    and intake.build_idempotency_key = build_idempotency_key_input
  then
    return query select 'IDEMPOTENT_REPLAY', intake.revision;
    return;
  end if;
  if intake.state <> 'ready_to_build'
    or not exists (
      select 1 from public.managed_profile_samples sample
      where sample.id = sample_id_input
        and sample.prospect_id = prospect_id_input
    )
  then
    raise exception 'Known Farmer Intake is not ready'
      using errcode = '22023', detail = 'INTAKE_NOT_READY';
  end if;
  update public.known_farmer_intakes current
  set state = 'built', prospect_id = prospect_id_input,
      sample_id = sample_id_input,
      build_idempotency_key = build_idempotency_key_input,
      revision = revision + 1
  where current.id = intake.id;
  return query select 'LINKED', intake.revision + 1;
end;
$$;

create or replace function public.apply_known_farmer_sample_source_provenance(
  intake_id_input uuid,
  sample_id_input uuid
)
returns table(code text, updated_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not exists (
    select 1
    from public.known_farmer_intakes intake
    join public.managed_profile_samples sample
      on sample.id = sample_id_input
    join public.outreach_prospects prospect
      on prospect.id = sample.prospect_id
    where intake.id = intake_id_input
      and prospect.created_by = intake.created_by
      and (intake.sample_id is null or intake.sample_id = sample.id)
  ) then
    raise exception 'Known Farmer sample is unavailable'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  update public.managed_profile_sample_sources source
  set discovery_provider = candidate.discovery_method,
      provider_query_hash = candidate.provider_query_hash,
      provider_item_id = candidate.provider_item_id,
      usage_rights_basis = candidate.usage_rights_basis,
      subject_association = candidate.subject_association
  from public.known_farmer_source_candidates candidate
  where source.sample_id = sample_id_input
    and candidate.intake_id = intake_id_input
    and candidate.decision = 'selected'
    and candidate.source_hash = source.source_hash;
  get diagnostics affected = row_count;
  return query select 'APPLIED', affected;
end;
$$;

alter table public.known_farmer_intakes enable row level security;
alter table public.known_farmer_source_candidates enable row level security;
alter table public.known_farmer_youtube_searches enable row level security;

revoke all on public.known_farmer_intakes,
  public.known_farmer_source_candidates,
  public.known_farmer_youtube_searches
from public, anon, authenticated;

revoke all on function public.known_farmer_set_updated_at()
  from public, anon, authenticated;
revoke all on function public.require_social_link_for_public_farmer()
  from public, anon, authenticated;
revoke all on function public.is_supported_owned_social_profile_url(text, text)
  from public, anon, authenticated;
revoke all on function public.refresh_known_farmer_intake_state(uuid)
  from public, anon, authenticated;
revoke all on function public.create_known_farmer_intake(jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.reserve_known_farmer_youtube_search(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_known_farmer_youtube_search(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.save_known_farmer_source_candidates(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.decide_known_farmer_source_candidate(
  uuid, uuid, text, text, integer, uuid
) from public, anon, authenticated;
revoke all on function public.link_known_farmer_intake_sample(
  uuid, uuid, uuid, uuid
) from public, anon, authenticated;
revoke all on function public.apply_known_farmer_sample_source_provenance(
  uuid, uuid
) from public, anon, authenticated;

grant execute on function public.create_known_farmer_intake(jsonb, uuid)
  to authenticated;
grant execute on function public.reserve_known_farmer_youtube_search(
  uuid, text, uuid
) to authenticated;
grant execute on function public.complete_known_farmer_youtube_search(uuid, jsonb)
  to authenticated;
grant execute on function public.decide_known_farmer_source_candidate(
  uuid, uuid, text, text, integer, uuid
) to authenticated;

grant execute on function public.save_known_farmer_source_candidates(uuid, jsonb)
  to service_role;
grant execute on function public.link_known_farmer_intake_sample(
  uuid, uuid, uuid, uuid
) to service_role;
grant execute on function public.apply_known_farmer_sample_source_provenance(
  uuid, uuid
) to service_role;
