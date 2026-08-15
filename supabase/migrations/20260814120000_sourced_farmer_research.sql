-- Founder-only sourced-Farmer research. YouTube descriptions and person data
-- remain transient; this schema stores only anonymous, expiring provenance.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents', 'managed_operations_agents',
      'featured_farmer_profiles', 'private_farmer_contacts',
      'sourced_farmer_research'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('sourced_farmer_research', false)
on conflict (control_key) do nothing;

create or replace function public.is_sourced_farmer_topic_slugs(value text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and cardinality(value) between 1 and 16
    and (
      select count(distinct slug) = cardinality(value)
      from unnest(value) slug
    )
    and not exists (
      select 1
      from unnest(value) slug
      where slug not in (
        'general-agriculture', 'paddy', 'tomato', 'papaya', 'maize',
        'cotton', 'oil-palm', 'arecanut', 'vegetables', 'brinjal',
        'mango', 'guava', 'sandalwood', 'fodder', 'seed-production',
        'sheep', 'goats', 'poultry', 'dairy', 'aquaculture',
        'beekeeping', 'sericulture', 'intercropping', 'organic-farming',
        'natural-farming', 'drip-irrigation', 'drone-spraying', 'nursery',
        'integrated-pest-management', 'protected-cultivation',
        'farm-mechanization'
      )
    );
$$;

create or replace function public.is_sourced_farmer_actor_counts(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and (select count(*) from jsonb_object_keys(value)) = 5
    and not exists (
      select 1
      from jsonb_each(value) item
      where item.key not in (
        'farmer', 'organization', 'official', 'scientist', 'trader'
      )
        or jsonb_typeof(item.value) <> 'number'
        or item.value::text !~ '^[0-9]+$'
        or (item.value::text)::integer not between 0 and 25
    );
$$;

create or replace function public.is_sourced_farmer_channel_actor_counts(
  value jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and (
      (select count(*) from jsonb_object_keys(value)) = 0
      or (
        (select count(*) from jsonb_object_keys(value)) = 5
        and not exists (
          select 1
          from jsonb_each(value) item
          where item.key not in (
            'farmer', 'organization', 'official', 'scientist', 'trader'
          )
            or jsonb_typeof(item.value) <> 'number'
            or item.value::text !~ '^[0-9]+$'
            or (item.value::text)::integer not between 0 and 2500
        )
      )
    );
$$;

create or replace function public.is_sourced_farmer_evidence_url(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and char_length(value) between 10 and 2048
    and value ~ '^https://[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?(?::443)?(?:/|$)'
    and value !~ '^https://[^/]*@'
    and value !~* '^https://([^/]*\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)(?::443)?(?:/|$)';
$$;

create or replace function public.sourced_farmer_contains_contact_text(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    value ~* '[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9-]+(\.[A-Z0-9-]+)+'
    or value ~* '(^|[^A-Za-z0-9])(mailto|tel|sms):'
    or value ~* '(^|[^A-Za-z0-9])(whatsapp|phone|telephone|mobile|contact)[[:space:]]*(us|me)?[[:space:]]*(at|on|:|-)?'
    or value ~* '(^|[^A-Za-z0-9])(wa\.me|whatsapp\.com|api\.whatsapp\.com|t\.me|telegram\.me|signal\.me|m\.me|instagram\.com|facebook\.com)(/|$)'
    or value ~ '(^|[[:space:](:,;])@[[:alnum:]_.-]{2,}'
    or value ~ '(^|[^0-9])(\+|00)?[0-9][0-9 ().-]{8,}[0-9]([^0-9]|$)',
    false
  );
$$;

create table public.farmer_source_channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  provider_channel_id text not null check (
    provider_channel_id ~ '^UC[A-Za-z0-9_-]{8,62}$'
  ),
  channel_url text not null check (
    channel_url = 'https://www.youtube.com/channel/' || provider_channel_id
  ),
  topic_slugs text[] not null check (
    cardinality(topic_slugs) = 0
      or public.is_sourced_farmer_topic_slugs(topic_slugs)
  ),
  actor_counts jsonb not null check (
    public.is_sourced_farmer_channel_actor_counts(actor_counts)
  ),
  source_fingerprint text not null check (
    source_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  collected_at timestamptz not null,
  refresh_due_at timestamptz not null,
  retention_expires_at timestamptz not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider_channel_id),
  unique (id, owner_id),
  check (collected_at <= now() + interval '5 minutes'),
  check (refresh_due_at > collected_at),
  check (refresh_due_at <= retention_expires_at),
  check (retention_expires_at > collected_at),
  check (retention_expires_at <= collected_at + interval '30 days')
);

create table public.farmer_source_videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  channel_id uuid not null,
  provider_video_id text not null check (
    provider_video_id ~ '^[A-Za-z0-9_-]{11}$'
  ),
  video_url text not null check (
    video_url = 'https://www.youtube.com/watch?v=' || provider_video_id
  ),
  published_at timestamptz not null,
  topic_slugs text[] not null check (
    public.is_sourced_farmer_topic_slugs(topic_slugs)
  ),
  actor_counts jsonb not null check (
    public.is_sourced_farmer_actor_counts(actor_counts)
  ),
  content_fingerprint text not null check (
    content_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  collected_at timestamptz not null,
  refresh_due_at timestamptz not null,
  retention_expires_at timestamptz not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (channel_id, owner_id)
    references public.farmer_source_channels (id, owner_id) on delete cascade,
  unique (owner_id, provider_video_id),
  unique (id, owner_id),
  check (published_at <= collected_at + interval '5 minutes'),
  check (collected_at <= now() + interval '5 minutes'),
  check (refresh_due_at > collected_at),
  check (refresh_due_at <= retention_expires_at),
  check (retention_expires_at > collected_at),
  check (retention_expires_at <= collected_at + interval '30 days')
);

create table public.farmer_source_discovery_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  seed_channel_hash text not null check (
    seed_channel_hash ~ '^[0-9a-f]{64}$'
  ),
  state text not null default 'reserved' check (
    state in ('reserved', 'running', 'succeeded', 'failed')
  ),
  checkpoint_token text check (
    checkpoint_token is null or char_length(checkpoint_token) between 1 and 1000
  ),
  pages_processed smallint not null default 0 check (
    pages_processed between 0 and 2
  ),
  videos_seen smallint not null default 0 check (videos_seen between 0 and 100),
  videos_saved smallint not null default 0 check (
    videos_saved between 0 and videos_seen
  ),
  failure_code text check (
    failure_code is null or failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  reservation_idempotency_key uuid not null unique,
  completion_idempotency_key uuid unique,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  retention_expires_at timestamptz not null default (now() + interval '30 days'),
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  check (retention_expires_at > requested_at),
  check (retention_expires_at <= requested_at + interval '30 days'),
  check (
    (state in ('reserved', 'running') and completed_at is null
      and failure_code is null and completion_idempotency_key is null)
    or (state = 'succeeded' and completed_at is not null
      and failure_code is null and completion_idempotency_key is not null)
    or (state = 'failed' and completed_at is not null
      and failure_code is not null and completion_idempotency_key is not null)
  )
);

create table public.sourced_farmer_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  district text check (district is null or char_length(btrim(district)) between 2 and 100),
  state_name text check (state_name is null or char_length(btrim(state_name)) between 2 and 100),
  summary text not null check (char_length(btrim(summary)) between 20 and 1200),
  topic_slugs text[] not null check (
    public.is_sourced_farmer_topic_slugs(topic_slugs)
  ),
  evidence_basis text not null check (
    evidence_basis in ('documented_subject_consent', 'independent_public_source')
  ),
  evidence_url text,
  consent_reference text check (
    consent_reference is null
      or char_length(btrim(consent_reference)) between 8 and 500
  ),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  duplicate_fingerprint text not null check (
    duplicate_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  operator_attested boolean not null check (operator_attested),
  state text not null default 'pending' check (
    state in ('pending', 'approved', 'rejected', 'archived')
  ),
  reviewed_by uuid references public.profiles (id) on delete restrict,
  reviewed_at timestamptz,
  archived_at timestamptz,
  retention_expires_at timestamptz,
  creation_idempotency_key uuid not null unique,
  review_idempotency_key uuid unique,
  archive_idempotency_key uuid unique,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  check (
    (evidence_basis = 'documented_subject_consent'
      and evidence_url is null and consent_reference is not null)
    or (evidence_basis = 'independent_public_source'
      and public.is_sourced_farmer_evidence_url(evidence_url)
      and consent_reference is null)
  ),
  check (not public.sourced_farmer_contains_contact_text(display_name)),
  check (district is null or not public.sourced_farmer_contains_contact_text(district)),
  check (state_name is null or not public.sourced_farmer_contains_contact_text(state_name)),
  check (not public.sourced_farmer_contains_contact_text(summary)),
  check (
    consent_reference is null
      or not public.sourced_farmer_contains_contact_text(consent_reference)
  ),
  check (
    retention_expires_at is null
      or (retention_expires_at > created_at
        and retention_expires_at <= created_at + interval '365 days')
  ),
  check (
    (state = 'pending' and reviewed_by is null and reviewed_at is null
      and archived_at is null and review_idempotency_key is null
      and archive_idempotency_key is null)
    or (state in ('approved', 'rejected') and reviewed_by is not null
      and reviewed_at is not null and archived_at is null
      and review_idempotency_key is not null and archive_idempotency_key is null)
    or (state = 'archived' and archived_at is not null
      and archive_idempotency_key is not null)
  )
);

create unique index sourced_farmer_profiles_owner_duplicate_idx
  on public.sourced_farmer_profiles (owner_id, duplicate_fingerprint)
  where state <> 'archived';

create table public.sourced_farmer_facts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  profile_id uuid not null,
  evidence_basis text not null check (
    evidence_basis in ('documented_subject_consent', 'independent_public_source')
  ),
  fact_type text not null check (fact_type in (
    'professional_name', 'organization_name', 'professional_role',
    'farm_location', 'crop', 'livestock', 'practice', 'professional_impact'
  )),
  fact_value text not null check (char_length(btrim(fact_value)) between 1 and 500),
  source_url text,
  evidence_excerpt text not null check (
    char_length(btrim(evidence_excerpt)) between 5 and 1000
  ),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  fact_fingerprint text not null check (fact_fingerprint ~ '^[0-9a-f]{64}$'),
  decision text not null default 'pending' check (
    decision in ('pending', 'approved', 'rejected')
  ),
  reviewed_by uuid references public.profiles (id) on delete restrict,
  reviewed_at timestamptz,
  creation_idempotency_key uuid not null unique,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, owner_id)
    references public.sourced_farmer_profiles (id, owner_id) on delete cascade,
  unique (profile_id, fact_fingerprint),
  unique (id, owner_id),
  check (
    (evidence_basis = 'documented_subject_consent' and source_url is null)
    or (evidence_basis = 'independent_public_source'
      and public.is_sourced_farmer_evidence_url(source_url))
  ),
  check (not public.sourced_farmer_contains_contact_text(fact_value)),
  check (not public.sourced_farmer_contains_contact_text(evidence_excerpt)),
  check (
    (decision = 'pending' and reviewed_by is null and reviewed_at is null)
    or (decision in ('approved', 'rejected')
      and reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.farmer_source_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  event_type text not null check (event_type in (
    'discovery_reserved', 'batch_saved', 'discovery_completed',
    'profile_created', 'profile_reviewed', 'profile_archived',
    'source_data_purged'
  )),
  target_type text not null check (target_type in (
    'discovery_run', 'sourced_farmer_profile', 'source_data'
  )),
  target_id uuid,
  related_id uuid,
  detail_hash text check (detail_hash is null or detail_hash ~ '^[0-9a-f]{64}$'),
  item_count integer check (item_count is null or item_count between 0 and 500),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index farmer_source_channels_owner_refresh_idx
  on public.farmer_source_channels (owner_id, refresh_due_at);
create index farmer_source_videos_owner_published_idx
  on public.farmer_source_videos (owner_id, published_at desc);
create index farmer_source_videos_channel_idx
  on public.farmer_source_videos (owner_id, channel_id, published_at desc);
create index farmer_source_runs_owner_requested_idx
  on public.farmer_source_discovery_runs (owner_id, requested_at desc);
create index sourced_farmer_profiles_owner_state_idx
  on public.sourced_farmer_profiles (owner_id, state, created_at desc);
create index sourced_farmer_facts_profile_idx
  on public.sourced_farmer_facts (owner_id, profile_id, created_at);
create index farmer_source_events_owner_created_idx
  on public.farmer_source_events (owner_id, created_at desc);

create or replace function public.sourced_farmer_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.revision = old.revision + 1;
  return new;
end;
$$;

create trigger farmer_source_channels_set_updated_at
before update on public.farmer_source_channels
for each row execute function public.sourced_farmer_set_updated_at();
create trigger farmer_source_videos_set_updated_at
before update on public.farmer_source_videos
for each row execute function public.sourced_farmer_set_updated_at();
create trigger farmer_source_discovery_runs_set_updated_at
before update on public.farmer_source_discovery_runs
for each row execute function public.sourced_farmer_set_updated_at();
create trigger sourced_farmer_profiles_set_updated_at
before update on public.sourced_farmer_profiles
for each row execute function public.sourced_farmer_set_updated_at();
create trigger sourced_farmer_facts_set_updated_at
before update on public.sourced_farmer_facts
for each row execute function public.sourced_farmer_set_updated_at();

create or replace function public.prevent_farmer_source_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Sourced Farmer research events are immutable'
    using errcode = '42501', detail = 'AUDIT_IMMUTABLE';
end;
$$;

create trigger farmer_source_events_are_immutable
before update or delete on public.farmer_source_events
for each row execute function public.prevent_farmer_source_event_mutation();

create or replace function public.assert_sourced_farmer_research_access(
  owner_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('sourced_farmer_research') then
    raise exception 'Sourced Farmer research is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if owner_id_input is null or not exists (
    select 1
    from public.profiles profile
    where profile.id = owner_id_input and profile.status = 'active'
  ) then
    raise exception 'Invalid sourced Farmer research owner'
      using errcode = '22023', detail = 'INVALID_OWNER';
  end if;
end;
$$;

create or replace function public.reserve_sourced_farmer_discovery(
  owner_id_input uuid,
  seed_channel_hash_input text,
  idempotency_key_input uuid
)
returns table(code text, run_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.farmer_source_discovery_runs%rowtype;
  created public.farmer_source_discovery_runs%rowtype;
begin
  perform public.assert_sourced_farmer_research_access(owner_id_input);
  if idempotency_key_input is null
    or seed_channel_hash_input !~ '^[0-9a-f]{64}$'
  then
    raise exception 'Invalid sourced Farmer discovery reservation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select run.* into existing
  from public.farmer_source_discovery_runs run
  where run.reservation_idempotency_key = idempotency_key_input;
  if found then
    if existing.owner_id <> owner_id_input
      or existing.seed_channel_hash <> seed_channel_hash_input
    then
      raise exception 'Sourced Farmer discovery idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id, existing.revision;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('sourced-farmer-discovery-quota', 0)
  );
  if (
    select count(*)
    from public.farmer_source_discovery_runs run
    where run.owner_id = owner_id_input
      and run.requested_at >= date_trunc('day', now())
  ) >= 10 or (
    select count(*)
    from public.farmer_source_discovery_runs run
    where run.owner_id = owner_id_input
      and run.requested_at >= date_trunc('month', now())
  ) >= 100 or (
    select count(*)
    from public.farmer_source_discovery_runs run
    where run.requested_at >= date_trunc('day', now())
  ) >= 50 then
    raise exception 'Sourced Farmer discovery quota exceeded'
      using errcode = '42501', detail = 'SEARCH_QUOTA_EXCEEDED';
  end if;

  insert into public.farmer_source_discovery_runs (
    owner_id, seed_channel_hash, reservation_idempotency_key
  ) values (
    owner_id_input, seed_channel_hash_input, idempotency_key_input
  ) returning * into created;
  insert into public.farmer_source_events (
    owner_id, event_type, target_type, target_id, detail_hash,
    item_count, idempotency_key
  ) values (
    owner_id_input, 'discovery_reserved', 'discovery_run', created.id,
    seed_channel_hash_input, 0, idempotency_key_input
  );
  return query select 'RESERVED', created.id, created.revision;
end;
$$;

create or replace function public.save_sourced_farmer_discovery_batch(
  owner_id_input uuid,
  run_id_input uuid,
  batch_input jsonb,
  idempotency_key_input uuid
)
returns table(
  code text,
  run_id uuid,
  channel_id uuid,
  saved_count integer,
  revision integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.farmer_source_discovery_runs%rowtype;
  existing_event public.farmer_source_events%rowtype;
  saved_channel public.farmer_source_channels%rowtype;
  video_item jsonb;
  collected_value timestamptz;
  refresh_value timestamptz;
  expiry_value timestamptz;
  video_collected_value timestamptz;
  video_refresh_value timestamptz;
  video_expiry_value timestamptz;
  video_published_value timestamptz;
  batch_hash text;
  item_total integer;
  page_number_value integer;
  next_checkpoint_value text;
  next_revision integer;
begin
  perform public.assert_sourced_farmer_research_access(owner_id_input);
  if run_id_input is null or idempotency_key_input is null
    or jsonb_typeof(batch_input) <> 'object'
    or batch_input - array[
      'providerChannelId', 'channelUrl', 'channelFingerprint', 'collectedAt',
      'refreshDueAt', 'retentionExpiresAt', 'topicSlugs', 'actorCounts',
      'nextCheckpoint', 'pageNumber', 'videos'
    ]::text[] <> '{}'::jsonb
    or not batch_input ?& array[
      'providerChannelId', 'channelUrl', 'channelFingerprint', 'collectedAt',
      'refreshDueAt', 'retentionExpiresAt', 'topicSlugs', 'actorCounts',
      'nextCheckpoint', 'pageNumber', 'videos'
    ]::text[]
    or jsonb_typeof(batch_input -> 'videos') <> 'array'
    or jsonb_array_length(batch_input -> 'videos') > 50
  then
    raise exception 'Invalid sourced Farmer discovery batch'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  begin
    collected_value := (batch_input ->> 'collectedAt')::timestamptz;
    refresh_value := (batch_input ->> 'refreshDueAt')::timestamptz;
    expiry_value := (batch_input ->> 'retentionExpiresAt')::timestamptz;
    page_number_value := (batch_input ->> 'pageNumber')::integer;
    next_checkpoint_value := batch_input ->> 'nextCheckpoint';
  exception when others then
    raise exception 'Invalid sourced Farmer discovery batch values'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end;
  item_total := jsonb_array_length(batch_input -> 'videos');
  batch_hash := encode(
    extensions.digest(convert_to(batch_input::text, 'UTF8'), 'sha256'), 'hex'
  );

  if batch_input ->> 'providerChannelId' !~ '^UC[A-Za-z0-9_-]{8,62}$'
    or batch_input ->> 'channelUrl' <>
      'https://www.youtube.com/channel/' || (batch_input ->> 'providerChannelId')
    or batch_input ->> 'channelFingerprint' !~ '^[0-9a-f]{64}$'
    or not (
      jsonb_typeof(batch_input -> 'topicSlugs') = 'array'
      and (
        jsonb_array_length(batch_input -> 'topicSlugs') = 0
        or public.is_sourced_farmer_topic_slugs(
          array(select jsonb_array_elements_text(batch_input -> 'topicSlugs'))
        )
      )
    )
    or not public.is_sourced_farmer_channel_actor_counts(
      batch_input -> 'actorCounts'
    )
    or collected_value > now() + interval '5 minutes'
    or refresh_value <= collected_value
    or refresh_value > expiry_value
    or expiry_value <= collected_value
    or expiry_value > collected_value + interval '30 days'
    or page_number_value not between 1 and 2
    or (
      next_checkpoint_value is not null
      and char_length(next_checkpoint_value) not between 1 and 1000
    )
  then
    raise exception 'Invalid sourced Farmer discovery batch values'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select event.* into existing_event
  from public.farmer_source_events event
  where event.idempotency_key = idempotency_key_input;
  if found then
    if existing_event.owner_id <> owner_id_input
      or existing_event.event_type <> 'batch_saved'
      or existing_event.target_id <> run_id_input
      or existing_event.detail_hash <> batch_hash
    then
      raise exception 'Sourced Farmer batch idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query
      select 'IDEMPOTENT_REPLAY', run_id_input, existing_event.related_id,
        coalesce(existing_event.item_count, 0), run.revision
      from public.farmer_source_discovery_runs run
      where run.id = run_id_input and run.owner_id = owner_id_input;
    return;
  end if;

  select run.* into target
  from public.farmer_source_discovery_runs run
  where run.id = run_id_input and run.owner_id = owner_id_input
  for update;
  if not found then
    raise exception 'Sourced Farmer discovery run not found'
      using errcode = 'P0002', detail = 'RUN_NOT_FOUND';
  end if;
  if target.state not in ('reserved', 'running')
    or target.pages_processed <> 0
    or target.videos_seen + item_total > 100
  then
    raise exception 'Sourced Farmer discovery checkpoint conflict'
      using errcode = '40001', detail = 'CHECKPOINT_CONFLICT';
  end if;

  insert into public.farmer_source_channels (
    owner_id, provider_channel_id, channel_url, topic_slugs, actor_counts,
    source_fingerprint, collected_at, refresh_due_at, retention_expires_at
  ) values (
    owner_id_input, batch_input ->> 'providerChannelId',
    batch_input ->> 'channelUrl',
    array(select jsonb_array_elements_text(batch_input -> 'topicSlugs')),
    batch_input -> 'actorCounts', batch_input ->> 'channelFingerprint',
    collected_value, refresh_value, expiry_value
  )
  on conflict (owner_id, provider_channel_id) do update set
    channel_url = excluded.channel_url,
    topic_slugs = excluded.topic_slugs,
    actor_counts = excluded.actor_counts,
    source_fingerprint = excluded.source_fingerprint,
    collected_at = excluded.collected_at,
    refresh_due_at = excluded.refresh_due_at,
    retention_expires_at = excluded.retention_expires_at
  returning * into saved_channel;

  for video_item in
    select item from jsonb_array_elements(batch_input -> 'videos') item
  loop
    if jsonb_typeof(video_item) <> 'object'
      or video_item - array[
        'providerVideoId', 'videoUrl', 'publishedAt', 'topicSlugs',
        'actorCounts', 'contentFingerprint', 'collectedAt', 'refreshDueAt',
        'retentionExpiresAt'
      ]::text[] <> '{}'::jsonb
      or not video_item ?& array[
        'providerVideoId', 'videoUrl', 'publishedAt', 'topicSlugs',
        'actorCounts', 'contentFingerprint', 'collectedAt', 'refreshDueAt',
        'retentionExpiresAt'
      ]::text[]
    then
      raise exception 'Invalid sourced Farmer video item'
        using errcode = '22023', detail = 'INVALID_VIDEO_ITEM';
    end if;
    begin
      video_published_value := (video_item ->> 'publishedAt')::timestamptz;
      video_collected_value := (video_item ->> 'collectedAt')::timestamptz;
      video_refresh_value := (video_item ->> 'refreshDueAt')::timestamptz;
      video_expiry_value := (video_item ->> 'retentionExpiresAt')::timestamptz;
    exception when others then
      raise exception 'Invalid sourced Farmer video timestamps'
        using errcode = '22023', detail = 'INVALID_VIDEO_ITEM';
    end;
    if video_item ->> 'providerVideoId' !~ '^[A-Za-z0-9_-]{11}$'
      or video_item ->> 'videoUrl' <>
        'https://www.youtube.com/watch?v=' || (video_item ->> 'providerVideoId')
      or video_item ->> 'contentFingerprint' !~ '^[0-9a-f]{64}$'
      or not public.is_sourced_farmer_topic_slugs(
        array(select jsonb_array_elements_text(video_item -> 'topicSlugs'))
      )
      or not public.is_sourced_farmer_actor_counts(video_item -> 'actorCounts')
      or video_published_value > video_collected_value + interval '5 minutes'
      or video_collected_value > now() + interval '5 minutes'
      or video_refresh_value <= video_collected_value
      or video_refresh_value > video_expiry_value
      or video_expiry_value <= video_collected_value
      or video_expiry_value > video_collected_value + interval '30 days'
    then
      raise exception 'Invalid sourced Farmer video item values'
        using errcode = '22023', detail = 'INVALID_VIDEO_ITEM';
    end if;

    insert into public.farmer_source_videos (
      owner_id, channel_id, provider_video_id, video_url, published_at,
      topic_slugs, actor_counts, content_fingerprint, collected_at,
      refresh_due_at, retention_expires_at
    ) values (
      owner_id_input, saved_channel.id, video_item ->> 'providerVideoId',
      video_item ->> 'videoUrl', video_published_value,
      array(select jsonb_array_elements_text(video_item -> 'topicSlugs')),
      video_item -> 'actorCounts', video_item ->> 'contentFingerprint',
      video_collected_value, video_refresh_value, video_expiry_value
    )
    on conflict (owner_id, provider_video_id) do update set
      channel_id = excluded.channel_id,
      video_url = excluded.video_url,
      published_at = excluded.published_at,
      topic_slugs = excluded.topic_slugs,
      actor_counts = excluded.actor_counts,
      content_fingerprint = excluded.content_fingerprint,
      collected_at = excluded.collected_at,
      refresh_due_at = excluded.refresh_due_at,
      retention_expires_at = excluded.retention_expires_at;
  end loop;

  update public.farmer_source_discovery_runs run
  set state = 'running', checkpoint_token = next_checkpoint_value,
    pages_processed = page_number_value,
    videos_seen = run.videos_seen + item_total,
    videos_saved = run.videos_saved + item_total
  where run.id = target.id
  returning run.revision into next_revision;
  insert into public.farmer_source_events (
    owner_id, event_type, target_type, target_id, related_id, detail_hash,
    item_count, idempotency_key
  ) values (
    owner_id_input, 'batch_saved', 'discovery_run', target.id,
    saved_channel.id, batch_hash, item_total, idempotency_key_input
  );
  return query
    select 'BATCH_SAVED', target.id, saved_channel.id,
      item_total, next_revision;
end;
$$;

create or replace function public.complete_sourced_farmer_discovery(
  owner_id_input uuid,
  run_id_input uuid,
  outcome_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, run_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.farmer_source_discovery_runs%rowtype;
  existing_event public.farmer_source_events%rowtype;
  outcome_hash text;
  state_value text;
  failure_value text;
  next_revision integer;
begin
  perform public.assert_sourced_farmer_research_access(owner_id_input);
  if run_id_input is null or idempotency_key_input is null
    or jsonb_typeof(outcome_input) <> 'object'
    or outcome_input - array['state', 'failureCode']::text[] <> '{}'::jsonb
    or not outcome_input ?& array['state', 'failureCode']::text[]
  then
    raise exception 'Invalid sourced Farmer discovery outcome'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  state_value := outcome_input ->> 'state';
  failure_value := outcome_input ->> 'failureCode';
  if state_value not in ('succeeded', 'failed')
    or (state_value = 'succeeded' and failure_value is not null)
    or (state_value = 'failed'
      and coalesce(failure_value, '') !~ '^[A-Z0-9_]{2,80}$')
  then
    raise exception 'Invalid sourced Farmer discovery outcome values'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  outcome_hash := encode(
    extensions.digest(convert_to(outcome_input::text, 'UTF8'), 'sha256'), 'hex'
  );

  select event.* into existing_event
  from public.farmer_source_events event
  where event.idempotency_key = idempotency_key_input;
  if found then
    if existing_event.owner_id <> owner_id_input
      or existing_event.event_type <> 'discovery_completed'
      or existing_event.target_id <> run_id_input
      or existing_event.detail_hash <> outcome_hash
    then
      raise exception 'Sourced Farmer completion idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query
      select 'IDEMPOTENT_REPLAY', run.id, run.revision
      from public.farmer_source_discovery_runs run
      where run.id = run_id_input and run.owner_id = owner_id_input;
    return;
  end if;

  select run.* into target
  from public.farmer_source_discovery_runs run
  where run.id = run_id_input and run.owner_id = owner_id_input
  for update;
  if not found then
    raise exception 'Sourced Farmer discovery run not found'
      using errcode = 'P0002', detail = 'RUN_NOT_FOUND';
  end if;
  if target.state not in ('reserved', 'running') then
    raise exception 'Sourced Farmer discovery is already complete'
      using errcode = '40001', detail = 'STATE_CONFLICT';
  end if;
  update public.farmer_source_discovery_runs run
  set state = state_value, failure_code = failure_value, completed_at = now(),
    completion_idempotency_key = idempotency_key_input
  where run.id = target.id
  returning run.revision into next_revision;
  insert into public.farmer_source_events (
    owner_id, event_type, target_type, target_id, detail_hash,
    item_count, idempotency_key
  ) values (
    owner_id_input, 'discovery_completed', 'discovery_run', target.id,
    outcome_hash, target.videos_saved, idempotency_key_input
  );
  return query select upper(state_value), target.id, next_revision;
end;
$$;

create or replace function public.create_sourced_farmer_profile(
  owner_id_input uuid,
  profile_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, profile_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.sourced_farmer_profiles%rowtype;
  existing_event public.farmer_source_events%rowtype;
  duplicate_profile_id uuid;
  fact_item jsonb;
  profile_hash text;
  evidence_basis_value text;
  evidence_url_value text;
  consent_reference_value text;
  retention_value timestamptz;
  fact_total integer;
begin
  perform public.assert_sourced_farmer_research_access(owner_id_input);
  if idempotency_key_input is null
    or jsonb_typeof(profile_input) <> 'object'
    or profile_input - array[
      'displayName', 'district', 'state', 'summary', 'topicSlugs',
      'evidenceBasis', 'evidenceUrl', 'consentReference', 'evidenceHash',
      'duplicateFingerprint', 'operatorAttested', 'retentionExpiresAt', 'facts'
    ]::text[] <> '{}'::jsonb
    or not profile_input ?& array[
      'displayName', 'district', 'state', 'summary', 'topicSlugs',
      'evidenceBasis', 'evidenceUrl', 'consentReference', 'evidenceHash',
      'duplicateFingerprint', 'operatorAttested', 'retentionExpiresAt', 'facts'
    ]::text[]
    or jsonb_typeof(profile_input -> 'facts') <> 'array'
    or jsonb_array_length(profile_input -> 'facts') not between 1 and 20
  then
    raise exception 'Invalid sourced Farmer profile'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  evidence_basis_value := profile_input ->> 'evidenceBasis';
  evidence_url_value := profile_input ->> 'evidenceUrl';
  consent_reference_value := profile_input ->> 'consentReference';
  if profile_input ->> 'retentionExpiresAt' is not null then
    begin
      retention_value := (profile_input ->> 'retentionExpiresAt')::timestamptz;
    exception when others then
      raise exception 'Invalid sourced Farmer profile retention'
        using errcode = '22023', detail = 'INVALID_INPUT';
    end;
  end if;
  fact_total := jsonb_array_length(profile_input -> 'facts');
  profile_hash := encode(
    extensions.digest(convert_to(profile_input::text, 'UTF8'), 'sha256'), 'hex'
  );

  select event.* into existing_event
  from public.farmer_source_events event
  where event.idempotency_key = idempotency_key_input;
  if found then
    if existing_event.owner_id <> owner_id_input
      or existing_event.event_type <> 'profile_created'
      or existing_event.detail_hash <> profile_hash
    then
      raise exception 'Sourced Farmer profile idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query
      select 'IDEMPOTENT_REPLAY', profile.id, profile.revision
      from public.sourced_farmer_profiles profile
      where profile.id = existing_event.target_id
        and profile.owner_id = owner_id_input;
    return;
  end if;

  if char_length(btrim(profile_input ->> 'displayName')) not between 2 and 100
    or (profile_input ->> 'district' is not null and
      char_length(btrim(profile_input ->> 'district')) not between 2 and 100)
    or (profile_input ->> 'state' is not null and
      char_length(btrim(profile_input ->> 'state')) not between 2 and 100)
    or char_length(btrim(profile_input ->> 'summary')) not between 20 and 1200
    or public.sourced_farmer_contains_contact_text(profile_input ->> 'displayName')
    or public.sourced_farmer_contains_contact_text(profile_input ->> 'district')
    or public.sourced_farmer_contains_contact_text(profile_input ->> 'state')
    or public.sourced_farmer_contains_contact_text(profile_input ->> 'summary')
    or not public.is_sourced_farmer_topic_slugs(
      array(select jsonb_array_elements_text(profile_input -> 'topicSlugs'))
    )
    or evidence_basis_value not in (
      'documented_subject_consent', 'independent_public_source'
    )
    or profile_input ->> 'evidenceHash' !~ '^[0-9a-f]{64}$'
    or profile_input ->> 'duplicateFingerprint' !~ '^[0-9a-f]{64}$'
    or profile_input -> 'operatorAttested' <> 'true'::jsonb
    or (retention_value is not null and (
      retention_value <= now()
      or retention_value > now() + interval '365 days'
    ))
    or (evidence_basis_value = 'documented_subject_consent' and (
      evidence_url_value is not null
      or char_length(btrim(consent_reference_value)) not between 8 and 500
      or public.sourced_farmer_contains_contact_text(consent_reference_value)
    ))
    or (evidence_basis_value = 'independent_public_source' and (
      not public.is_sourced_farmer_evidence_url(evidence_url_value)
      or consent_reference_value is not null
    ))
  then
    raise exception 'Invalid sourced Farmer profile values'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  for fact_item in
    select item from jsonb_array_elements(profile_input -> 'facts') item
  loop
    if jsonb_typeof(fact_item) <> 'object'
      or fact_item - array[
        'factType', 'factValue', 'sourceUrl', 'evidenceExcerpt',
        'evidenceHash', 'factFingerprint', 'idempotencyKey'
      ]::text[] <> '{}'::jsonb
      or not fact_item ?& array[
        'factType', 'factValue', 'sourceUrl', 'evidenceExcerpt',
        'evidenceHash', 'factFingerprint', 'idempotencyKey'
      ]::text[]
      or fact_item ->> 'factType' not in (
        'professional_name', 'organization_name', 'professional_role',
        'farm_location', 'crop', 'livestock', 'practice', 'professional_impact'
      )
      or char_length(btrim(fact_item ->> 'factValue')) not between 1 and 500
      or char_length(btrim(fact_item ->> 'evidenceExcerpt')) not between 5 and 1000
      or public.sourced_farmer_contains_contact_text(fact_item ->> 'factValue')
      or public.sourced_farmer_contains_contact_text(fact_item ->> 'evidenceExcerpt')
      or fact_item ->> 'evidenceHash' !~ '^[0-9a-f]{64}$'
      or fact_item ->> 'factFingerprint' !~ '^[0-9a-f]{64}$'
      or coalesce(fact_item ->> 'idempotencyKey', '') !~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or (evidence_basis_value = 'documented_subject_consent'
        and fact_item ->> 'sourceUrl' is not null)
      or (evidence_basis_value = 'independent_public_source'
        and not public.is_sourced_farmer_evidence_url(fact_item ->> 'sourceUrl'))
    then
      raise exception 'Invalid sourced Farmer profile fact'
        using errcode = '22023', detail = 'INVALID_FACT';
    end if;
  end loop;

  select profile.id into duplicate_profile_id
  from public.sourced_farmer_profiles profile
  where profile.owner_id = owner_id_input
    and profile.duplicate_fingerprint = profile_input ->> 'duplicateFingerprint'
    and profile.state <> 'archived'
  limit 1;
  if duplicate_profile_id is not null then
    raise exception 'Possible sourced Farmer profile duplicate'
      using errcode = '22023', detail = 'DUPLICATE_PROFILE';
  end if;

  insert into public.sourced_farmer_profiles (
    owner_id, display_name, district, state_name, summary, topic_slugs,
    evidence_basis, evidence_url, consent_reference, evidence_hash,
    duplicate_fingerprint, operator_attested, retention_expires_at,
    creation_idempotency_key
  ) values (
    owner_id_input, btrim(profile_input ->> 'displayName'),
    nullif(btrim(profile_input ->> 'district'), ''),
    nullif(btrim(profile_input ->> 'state'), ''),
    btrim(profile_input ->> 'summary'),
    array(select jsonb_array_elements_text(profile_input -> 'topicSlugs')),
    evidence_basis_value, evidence_url_value, consent_reference_value,
    profile_input ->> 'evidenceHash',
    profile_input ->> 'duplicateFingerprint', true, retention_value,
    idempotency_key_input
  ) returning * into created;

  for fact_item in
    select item from jsonb_array_elements(profile_input -> 'facts') item
  loop
    insert into public.sourced_farmer_facts (
      owner_id, profile_id, evidence_basis, fact_type, fact_value, source_url,
      evidence_excerpt, evidence_hash, fact_fingerprint,
      creation_idempotency_key
    ) values (
      owner_id_input, created.id, evidence_basis_value,
      fact_item ->> 'factType', btrim(fact_item ->> 'factValue'),
      fact_item ->> 'sourceUrl', btrim(fact_item ->> 'evidenceExcerpt'),
      fact_item ->> 'evidenceHash', fact_item ->> 'factFingerprint',
      (fact_item ->> 'idempotencyKey')::uuid
    );
  end loop;
  insert into public.farmer_source_events (
    owner_id, event_type, target_type, target_id, detail_hash,
    item_count, idempotency_key
  ) values (
    owner_id_input, 'profile_created', 'sourced_farmer_profile', created.id,
    profile_hash, fact_total, idempotency_key_input
  );
  return query select 'PROFILE_CREATED', created.id, created.revision;
end;
$$;

create or replace function public.review_sourced_farmer_profile(
  owner_id_input uuid,
  profile_id_input uuid,
  decision_input text,
  expected_revision_input integer,
  idempotency_key_input uuid
)
returns table(code text, profile_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sourced_farmer_profiles%rowtype;
  existing_event public.farmer_source_events%rowtype;
  decision_hash text;
  next_revision integer;
begin
  perform public.assert_sourced_farmer_research_access(owner_id_input);
  if profile_id_input is null or idempotency_key_input is null
    or decision_input not in ('approved', 'rejected')
    or expected_revision_input is null or expected_revision_input < 0
  then
    raise exception 'Invalid sourced Farmer profile review'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  decision_hash := encode(extensions.digest(convert_to(
    decision_input || ':' || expected_revision_input::text,
    'UTF8'
  ), 'sha256'), 'hex');
  select event.* into existing_event
  from public.farmer_source_events event
  where event.idempotency_key = idempotency_key_input;
  if found then
    if existing_event.owner_id <> owner_id_input
      or existing_event.event_type <> 'profile_reviewed'
      or existing_event.target_id <> profile_id_input
      or existing_event.detail_hash <> decision_hash
    then
      raise exception 'Sourced Farmer review idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query
      select 'IDEMPOTENT_REPLAY', profile.id, profile.revision
      from public.sourced_farmer_profiles profile
      where profile.id = profile_id_input and profile.owner_id = owner_id_input;
    return;
  end if;
  select profile.* into target
  from public.sourced_farmer_profiles profile
  where profile.id = profile_id_input and profile.owner_id = owner_id_input
  for update;
  if not found then
    raise exception 'Sourced Farmer profile not found'
      using errcode = 'P0002', detail = 'PROFILE_NOT_FOUND';
  end if;
  if target.revision <> expected_revision_input then
    raise exception 'Sourced Farmer profile revision conflict'
      using errcode = '40001', detail = 'REVISION_CONFLICT';
  end if;
  if target.state <> 'pending' then
    raise exception 'Sourced Farmer profile review state conflict'
      using errcode = '40001', detail = 'STATE_CONFLICT';
  end if;
  update public.sourced_farmer_profiles profile
  set state = decision_input, reviewed_by = owner_id_input, reviewed_at = now(),
    review_idempotency_key = idempotency_key_input
  where profile.id = target.id
  returning profile.revision into next_revision;
  update public.sourced_farmer_facts fact
  set decision = decision_input, reviewed_by = owner_id_input, reviewed_at = now()
  where fact.profile_id = target.id and fact.owner_id = owner_id_input;
  insert into public.farmer_source_events (
    owner_id, event_type, target_type, target_id, detail_hash,
    item_count, idempotency_key
  ) values (
    owner_id_input, 'profile_reviewed', 'sourced_farmer_profile', target.id,
    decision_hash, null, idempotency_key_input
  );
  return query
    select 'PROFILE_' || upper(decision_input), target.id, next_revision;
end;
$$;

create or replace function public.archive_sourced_farmer_profile(
  owner_id_input uuid,
  profile_id_input uuid,
  reason_input text,
  expected_revision_input integer,
  idempotency_key_input uuid
)
returns table(code text, profile_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sourced_farmer_profiles%rowtype;
  existing_event public.farmer_source_events%rowtype;
  reason_hash text;
  next_revision integer;
begin
  perform public.assert_sourced_farmer_research_access(owner_id_input);
  if profile_id_input is null or idempotency_key_input is null
    or expected_revision_input is null or expected_revision_input < 0
    or char_length(btrim(reason_input)) not between 5 and 500
    or public.sourced_farmer_contains_contact_text(reason_input)
  then
    raise exception 'Invalid sourced Farmer profile archive'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  reason_hash := encode(extensions.digest(convert_to(
    btrim(reason_input) || ':' || expected_revision_input::text,
    'UTF8'
  ), 'sha256'), 'hex');
  select event.* into existing_event
  from public.farmer_source_events event
  where event.idempotency_key = idempotency_key_input;
  if found then
    if existing_event.owner_id <> owner_id_input
      or existing_event.event_type <> 'profile_archived'
      or existing_event.target_id <> profile_id_input
      or existing_event.detail_hash <> reason_hash
    then
      raise exception 'Sourced Farmer archive idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query
      select 'IDEMPOTENT_REPLAY', profile.id, profile.revision
      from public.sourced_farmer_profiles profile
      where profile.id = profile_id_input and profile.owner_id = owner_id_input;
    return;
  end if;
  select profile.* into target
  from public.sourced_farmer_profiles profile
  where profile.id = profile_id_input and profile.owner_id = owner_id_input
  for update;
  if not found then
    raise exception 'Sourced Farmer profile not found'
      using errcode = 'P0002', detail = 'PROFILE_NOT_FOUND';
  end if;
  if target.revision <> expected_revision_input then
    raise exception 'Sourced Farmer profile revision conflict'
      using errcode = '40001', detail = 'REVISION_CONFLICT';
  end if;
  if target.state = 'archived' then
    raise exception 'Sourced Farmer profile is already archived'
      using errcode = '40001', detail = 'STATE_CONFLICT';
  end if;
  update public.sourced_farmer_profiles profile
  set state = 'archived', archived_at = now(),
    archive_idempotency_key = idempotency_key_input
  where profile.id = target.id
  returning profile.revision into next_revision;
  insert into public.farmer_source_events (
    owner_id, event_type, target_type, target_id, detail_hash,
    item_count, idempotency_key
  ) values (
    owner_id_input, 'profile_archived', 'sourced_farmer_profile', target.id,
    reason_hash, null, idempotency_key_input
  );
  return query select 'PROFILE_ARCHIVED', target.id, next_revision;
end;
$$;

create or replace function public.purge_expired_farmer_source_data(
  owner_id_input uuid,
  limit_input integer,
  idempotency_key_input uuid
)
returns table(code text, event_id uuid, deleted_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_event public.farmer_source_events%rowtype;
  created_event_id uuid;
  payload_hash text;
  deleted_value integer := 0;
  affected integer := 0;
  remaining integer;
begin
  perform public.assert_sourced_farmer_research_access(owner_id_input);
  if idempotency_key_input is null or limit_input not between 1 and 500 then
    raise exception 'Invalid sourced Farmer source purge'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  payload_hash := encode(extensions.digest(convert_to(
    owner_id_input::text || ':' || limit_input::text,
    'UTF8'
  ), 'sha256'), 'hex');
  select event.* into existing_event
  from public.farmer_source_events event
  where event.idempotency_key = idempotency_key_input;
  if found then
    if existing_event.owner_id <> owner_id_input
      or existing_event.event_type <> 'source_data_purged'
      or existing_event.detail_hash <> payload_hash
    then
      raise exception 'Sourced Farmer purge idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing_event.id,
      coalesce(existing_event.item_count, 0);
    return;
  end if;

  delete from public.farmer_source_videos video
  where video.id in (
    select candidate.id
    from public.farmer_source_videos candidate
    where candidate.owner_id = owner_id_input
      and candidate.retention_expires_at <= now()
    order by candidate.retention_expires_at, candidate.id
    limit limit_input
    for update skip locked
  );
  get diagnostics affected = row_count;
  deleted_value := deleted_value + affected;
  remaining := limit_input - deleted_value;

  if remaining > 0 then
    delete from public.farmer_source_channels channel
    where channel.id in (
      select candidate.id
      from public.farmer_source_channels candidate
      where candidate.owner_id = owner_id_input
        and candidate.retention_expires_at <= now()
        and not exists (
          select 1
          from public.farmer_source_videos video
          where video.channel_id = candidate.id
            and video.owner_id = candidate.owner_id
        )
      order by candidate.retention_expires_at, candidate.id
      limit remaining
      for update skip locked
    );
    get diagnostics affected = row_count;
    deleted_value := deleted_value + affected;
    remaining := limit_input - deleted_value;
  end if;

  if remaining > 0 then
    delete from public.farmer_source_discovery_runs run
    where run.id in (
      select candidate.id
      from public.farmer_source_discovery_runs candidate
      where candidate.owner_id = owner_id_input
        and candidate.retention_expires_at <= now()
      order by candidate.retention_expires_at, candidate.id
      limit remaining
      for update skip locked
    );
    get diagnostics affected = row_count;
    deleted_value := deleted_value + affected;
  end if;

  insert into public.farmer_source_events (
    owner_id, event_type, target_type, detail_hash, item_count, idempotency_key
  ) values (
    owner_id_input, 'source_data_purged', 'source_data', payload_hash,
    deleted_value, idempotency_key_input
  ) returning id into created_event_id;
  return query select 'SOURCE_DATA_PURGED', created_event_id, deleted_value;
end;
$$;

alter table public.farmer_source_channels enable row level security;
alter table public.farmer_source_videos enable row level security;
alter table public.farmer_source_discovery_runs enable row level security;
alter table public.sourced_farmer_profiles enable row level security;
alter table public.sourced_farmer_facts enable row level security;
alter table public.farmer_source_events enable row level security;

revoke all on table public.farmer_source_channels,
  public.farmer_source_videos,
  public.farmer_source_discovery_runs,
  public.sourced_farmer_profiles,
  public.sourced_farmer_facts,
  public.farmer_source_events
from public, anon, authenticated;

grant select on table public.farmer_source_channels to service_role;
grant select on table public.farmer_source_videos to service_role;
grant select on table public.farmer_source_discovery_runs to service_role;
grant select on table public.sourced_farmer_profiles to service_role;
grant select on table public.sourced_farmer_facts to service_role;
grant select on table public.farmer_source_events to service_role;

revoke all on function public.is_sourced_farmer_topic_slugs(text[]),
  public.is_sourced_farmer_actor_counts(jsonb),
  public.is_sourced_farmer_channel_actor_counts(jsonb),
  public.is_sourced_farmer_evidence_url(text),
  public.sourced_farmer_contains_contact_text(text),
  public.sourced_farmer_set_updated_at(),
  public.prevent_farmer_source_event_mutation(),
  public.assert_sourced_farmer_research_access(uuid),
  public.reserve_sourced_farmer_discovery(uuid, text, uuid),
  public.save_sourced_farmer_discovery_batch(uuid, uuid, jsonb, uuid),
  public.complete_sourced_farmer_discovery(uuid, uuid, jsonb, uuid),
  public.create_sourced_farmer_profile(uuid, jsonb, uuid),
  public.review_sourced_farmer_profile(uuid, uuid, text, integer, uuid),
  public.archive_sourced_farmer_profile(uuid, uuid, text, integer, uuid),
  public.purge_expired_farmer_source_data(uuid, integer, uuid)
from public, anon, authenticated;

grant execute on function public.reserve_sourced_farmer_discovery(
  uuid, text, uuid
) to service_role;
grant execute on function public.save_sourced_farmer_discovery_batch(
  uuid, uuid, jsonb, uuid
) to service_role;
grant execute on function public.complete_sourced_farmer_discovery(
  uuid, uuid, jsonb, uuid
) to service_role;
grant execute on function public.create_sourced_farmer_profile(
  uuid, jsonb, uuid
) to service_role;
grant execute on function public.review_sourced_farmer_profile(
  uuid, uuid, text, integer, uuid
) to service_role;
grant execute on function public.archive_sourced_farmer_profile(
  uuid, uuid, text, integer, uuid
) to service_role;
grant execute on function public.purge_expired_farmer_source_data(
  uuid, integer, uuid
) to service_role;
