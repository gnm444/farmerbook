-- Featured Farmer editorial profiles. Research remains private and publication
-- produces a bounded immutable snapshot. This domain never creates a member,
-- outreach prospect, consent, invitation, verification claim, message or sale.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents', 'managed_operations_agents',
      'featured_farmer_profiles'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('featured_farmer_profiles', false)
on conflict (control_key) do nothing;

create table public.featured_farmer_research (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  subject_name text not null check (char_length(subject_name) between 2 and 100),
  district_hint text check (
    district_hint is null or char_length(district_hint) between 2 and 100
  ),
  state_hint text check (
    state_hint is null or char_length(state_hint) between 2 and 100
  ),
  farming_hint text check (
    farming_hint is null or char_length(farming_hint) between 2 and 160
  ),
  significance_hypothesis text not null
    check (char_length(significance_hypothesis) between 20 and 800),
  preferred_locale text not null
    references public.supported_locales (locale_code) on delete restrict,
  query_fingerprints jsonb not null check (
    jsonb_typeof(query_fingerprints) = 'object'
    and query_fingerprints ?& array[
      'identity', 'significance', 'institutions', 'social', 'current'
    ]
    and octet_length(query_fingerprints::text) <= 1024
    and query_fingerprints ->> 'identity' ~ '^[0-9a-f]{64}$'
    and query_fingerprints ->> 'significance' ~ '^[0-9a-f]{64}$'
    and query_fingerprints ->> 'institutions' ~ '^[0-9a-f]{64}$'
    and query_fingerprints ->> 'social' ~ '^[0-9a-f]{64}$'
    and query_fingerprints ->> 'current' ~ '^[0-9a-f]{64}$'
  ),
  state text not null default 'researching' check (state in (
    'researching', 'drafting', 'review_ready', 'published', 'withdrawn',
    'expired'
  )),
  creation_idempotency_key uuid not null unique,
  last_publish_idempotency_key uuid unique,
  last_withdraw_idempotency_key uuid unique,
  retention_expires_at timestamptz not null default (now() + interval '365 days'),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (retention_expires_at > created_at)
);

create table public.featured_farmer_sources (
  id uuid primary key default gen_random_uuid(),
  research_id uuid not null
    references public.featured_farmer_research (id) on delete cascade,
  source_url text not null check (
    char_length(source_url) between 8 and 2048 and source_url ~ '^https://'
  ),
  publisher_host text not null check (
    char_length(publisher_host) between 3 and 253
    and publisher_host ~ '^[a-z0-9.-]+$'
  ),
  publisher_name text not null check (
    char_length(publisher_name) between 2 and 160
  ),
  source_title text not null check (
    char_length(source_title) between 2 and 240
  ),
  source_published_at date,
  source_type text not null check (source_type in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin', 'other_social'
  )),
  source_excerpt text not null check (
    char_length(source_excerpt) between 20 and 8000
  ),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  discovery_method text not null check (discovery_method in (
    'manual_google_review', 'youtube_data_api', 'operator_supplied'
  )),
  source_quality text not null check (source_quality in (
    'official_record', 'institutional_reference', 'independent_reporting',
    'first_party', 'owned_social_profile', 'third_party_coverage'
  )),
  subject_association text not null check (subject_association in (
    'professional_reference', 'owned_social_profile', 'third_party_coverage'
  )),
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
  reviewed_by uuid references public.profiles (id) on delete restrict,
  reviewed_at timestamptz,
  creation_idempotency_key uuid not null unique,
  decision_idempotency_key uuid unique,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (research_id, source_hash),
  unique (research_id, source_url),
  check (retention_expires_at > created_at),
  check (
    (decision = 'pending' and reviewed_by is null and reviewed_at is null)
    or (decision in ('selected', 'rejected') and reviewed_by is not null
      and reviewed_at is not null)
  ),
  check (
    (subject_association = 'owned_social_profile'
      and source_quality = 'owned_social_profile')
    or (subject_association <> 'owned_social_profile'
      and source_quality <> 'owned_social_profile')
  ),
  check (
    (discovery_method = 'manual_google_review'
      and provider_query_hash is not null and provider_item_id is null
      and usage_rights_basis = 'operator_selected_destination'
      and refresh_due_at is null)
    or (discovery_method = 'youtube_data_api'
      and source_type = 'youtube' and provider_query_hash is not null
      and provider_item_id is not null
      and usage_rights_basis = 'youtube_api_terms'
      and refresh_due_at is not null
      and refresh_due_at <= collected_at + interval '30 days')
    or (discovery_method = 'operator_supplied'
      and provider_query_hash is null and provider_item_id is null
      and usage_rights_basis = 'operator_supplied'
      and refresh_due_at is null)
  )
);

create table public.featured_farmer_drafts (
  id uuid primary key default gen_random_uuid(),
  research_id uuid not null unique
    references public.featured_farmer_research (id) on delete cascade,
  slug text not null unique check (
    char_length(slug) between 3 and 100
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  headline text not null check (char_length(headline) between 8 and 180),
  deck text not null check (char_length(deck) between 20 and 360),
  why_featured text not null check (
    char_length(why_featured) between 40 and 900
  ),
  story_sections jsonb not null check (
    jsonb_typeof(story_sections) = 'array'
    and jsonb_array_length(story_sections) between 3 and 7
    and octet_length(story_sections::text) <= 24000
  ),
  category_slugs text[] not null default '{}'::text[] check (
    cardinality(category_slugs) <= 8
  ),
  limitations text[] not null check (
    cardinality(limitations) between 1 and 8
  ),
  state text not null default 'drafting' check (state in (
    'drafting', 'review_ready', 'published', 'withdrawn'
  )),
  last_save_idempotency_key uuid not null unique,
  reviewer_id uuid references public.profiles (id) on delete restrict,
  reviewed_at timestamptz,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.featured_farmer_claims (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null
    references public.featured_farmer_drafts (id) on delete cascade,
  claim_key text not null check (
    char_length(claim_key) between 2 and 60
    and claim_key ~ '^[a-z][a-z0-9_]*$'
  ),
  claim_type text not null check (claim_type in (
    'significance', 'impact', 'award', 'innovation', 'community',
    'knowledge_sharing', 'ecological_stewardship', 'leadership'
  )),
  statement text not null check (char_length(statement) between 10 and 700),
  display_label text check (
    display_label is null or char_length(display_label) between 2 and 80
  ),
  display_value text check (
    display_value is null or char_length(display_value) between 1 and 80
  ),
  display_context text check (
    display_context is null or char_length(display_context) between 2 and 240
  ),
  display_order smallint not null check (display_order between 0 and 100),
  review_state text not null default 'approved' check (
    review_state in ('draft', 'approved', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_id, claim_key)
);

create table public.featured_farmer_claim_sources (
  claim_id uuid not null
    references public.featured_farmer_claims (id) on delete cascade,
  source_id uuid not null
    references public.featured_farmer_sources (id) on delete restrict,
  support_note text check (
    support_note is null or char_length(support_note) between 5 and 500
  ),
  created_at timestamptz not null default now(),
  primary key (claim_id, source_id)
);

create table public.featured_farmer_social_links (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null
    references public.featured_farmer_drafts (id) on delete cascade,
  source_id uuid not null unique
    references public.featured_farmer_sources (id) on delete restrict,
  platform text not null check (platform in (
    'youtube', 'instagram', 'facebook', 'linkedin'
  )),
  profile_url text not null check (
    char_length(profile_url) between 8 and 2048 and profile_url ~ '^https://'
  ),
  ownership_basis text not null check (
    char_length(ownership_basis) between 10 and 500
  ),
  display_order smallint not null default 0 check (display_order between 0 and 20),
  confirmed_by uuid not null references public.profiles (id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  creation_idempotency_key uuid not null unique,
  unique (draft_id, platform)
);

create table public.featured_farmer_media (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique
    references public.featured_farmer_drafts (id) on delete cascade,
  asset_url text not null check (char_length(asset_url) between 1 and 2048),
  alt_text text not null check (char_length(alt_text) between 5 and 240),
  credit text not null check (char_length(credit) between 2 and 180),
  rights_basis text not null check (rights_basis in (
    'subject_permission', 'publisher_licence', 'farmerbook_owned', 'open_licence'
  )),
  rights_reference text not null check (
    char_length(rights_reference) between 5 and 500
  ),
  approved_by uuid not null references public.profiles (id) on delete restrict,
  approved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.featured_farmer_publications (
  id uuid primary key default gen_random_uuid(),
  research_id uuid not null
    references public.featured_farmer_research (id) on delete restrict,
  draft_id uuid not null
    references public.featured_farmer_drafts (id) on delete restrict,
  slug text not null check (
    char_length(slug) between 3 and 100
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  publication_revision integer not null check (publication_revision > 0),
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object'
    and octet_length(snapshot::text) <= 131072
  ),
  state text not null default 'published' check (state in (
    'published', 'withdrawn'
  )),
  is_current boolean not null default true,
  published_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid not null references public.profiles (id) on delete restrict,
  fact_checked_at timestamptz not null,
  published_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  withdrawal_reason text check (
    withdrawal_reason is null
    or char_length(withdrawal_reason) between 10 and 500
  ),
  publication_idempotency_key uuid not null unique,
  withdrawal_idempotency_key uuid unique,
  created_at timestamptz not null default now(),
  unique (slug, publication_revision),
  check (
    (state = 'published' and withdrawn_at is null and withdrawal_reason is null)
    or (state = 'withdrawn' and withdrawn_at is not null
      and withdrawal_reason is not null)
  )
);

create unique index featured_farmer_publications_current_slug_idx
  on public.featured_farmer_publications (slug) where is_current;

create table public.featured_farmer_events (
  id uuid primary key default gen_random_uuid(),
  research_id uuid not null
    references public.featured_farmer_research (id) on delete restrict,
  actor_id uuid references public.profiles (id) on delete restrict,
  event_type text not null check (event_type in (
    'research_created', 'source_added', 'source_decided', 'youtube_searched',
    'draft_saved', 'social_confirmed', 'social_removed', 'published', 'withdrawn'
  )),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object' and octet_length(details::text) <= 8192
  ),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create table public.featured_farmer_youtube_searches (
  id uuid primary key default gen_random_uuid(),
  research_id uuid not null
    references public.featured_farmer_research (id) on delete cascade,
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

create index featured_farmer_research_retention_idx
  on public.featured_farmer_research (retention_expires_at);
create index featured_farmer_sources_research_idx
  on public.featured_farmer_sources (research_id, decision, created_at);
create index featured_farmer_sources_retention_idx
  on public.featured_farmer_sources (retention_expires_at);
create index featured_farmer_claims_draft_idx
  on public.featured_farmer_claims (draft_id, display_order);
create index featured_farmer_youtube_quota_idx
  on public.featured_farmer_youtube_searches (requested_by, created_at desc);

create trigger featured_farmer_research_set_updated_at
before update on public.featured_farmer_research
for each row execute function public.known_farmer_set_updated_at();
create trigger featured_farmer_sources_set_updated_at
before update on public.featured_farmer_sources
for each row execute function public.known_farmer_set_updated_at();
create trigger featured_farmer_drafts_set_updated_at
before update on public.featured_farmer_drafts
for each row execute function public.known_farmer_set_updated_at();
create trigger featured_farmer_claims_set_updated_at
before update on public.featured_farmer_claims
for each row execute function public.known_farmer_set_updated_at();
create trigger featured_farmer_media_set_updated_at
before update on public.featured_farmer_media
for each row execute function public.known_farmer_set_updated_at();

create or replace function public.refresh_featured_farmer_readiness(
  research_id_input uuid
)
returns table(ready boolean, blockers text[], revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  research public.featured_farmer_research%rowtype;
  draft public.featured_farmer_drafts%rowtype;
  professional_domains integer := 0;
  authoritative_sources integer := 0;
  approved_claims integer := 0;
  uncited_claims integer := 0;
  social_links integer := 0;
  media_unapproved integer := 0;
  reasons text[] := '{}'::text[];
  is_ready boolean := false;
begin
  select item.* into research
  from public.featured_farmer_research item
  where item.id = research_id_input
  for update;
  if not found then
    raise exception 'Featured Farmer research not found'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  select item.* into draft
  from public.featured_farmer_drafts item
  where item.research_id = research.id
  for update;
  if not found then
    return query select false, array['Draft is required']::text[], research.revision;
    return;
  end if;

  select count(distinct source.publisher_host) into professional_domains
  from public.featured_farmer_sources source
  where source.research_id = research.id and source.decision = 'selected'
    and source.source_type = 'website'
    and source.retention_expires_at > now()
    and source.source_quality in (
      'official_record', 'institutional_reference', 'independent_reporting',
      'first_party'
    );
  select count(*) into authoritative_sources
  from public.featured_farmer_sources source
  where source.research_id = research.id and source.decision = 'selected'
    and source.retention_expires_at > now()
    and source.source_quality in (
      'official_record', 'institutional_reference', 'independent_reporting'
    );
  select count(*) into approved_claims
  from public.featured_farmer_claims claim
  where claim.draft_id = draft.id and claim.review_state = 'approved';
  select count(*) into uncited_claims
  from public.featured_farmer_claims claim
  where claim.draft_id = draft.id and claim.review_state = 'approved'
    and not exists (
      select 1
      from public.featured_farmer_claim_sources link
      join public.featured_farmer_sources source on source.id = link.source_id
      where link.claim_id = claim.id and source.research_id = research.id
        and source.decision = 'selected'
        and source.retention_expires_at > now()
    );
  select count(*) into social_links
  from public.featured_farmer_social_links social
  join public.featured_farmer_sources source on source.id = social.source_id
  where social.draft_id = draft.id and source.research_id = research.id
    and source.decision = 'selected'
    and source.subject_association = 'owned_social_profile'
    and source.source_quality = 'owned_social_profile'
    and source.source_type = social.platform
    and source.source_url = social.profile_url
    and public.is_supported_owned_social_profile_url(
      source.source_type, source.source_url
    );
  select count(*) into media_unapproved
  from public.featured_farmer_media media
  where media.draft_id = draft.id and (
    media.approved_at is null or media.approved_by is null
  );

  if professional_domains < 2 then
    reasons := array_append(reasons, 'TWO_PROFESSIONAL_DOMAINS_REQUIRED');
  end if;
  if authoritative_sources < 1 then
    reasons := array_append(reasons, 'AUTHORITATIVE_SOURCE_REQUIRED');
  end if;
  if approved_claims < 2 then
    reasons := array_append(reasons, 'TWO_SIGNIFICANCE_CLAIMS_REQUIRED');
  end if;
  if uncited_claims > 0 then
    reasons := array_append(reasons, 'EVERY_CLAIM_REQUIRES_SELECTED_SOURCE');
  end if;
  if social_links < 1 then
    reasons := array_append(reasons, 'OWNED_SOCIAL_REQUIRED');
  end if;
  if jsonb_array_length(draft.story_sections) < 3 then
    reasons := array_append(reasons, 'THREE_STORY_SECTIONS_REQUIRED');
  end if;
  if media_unapproved > 0 then
    reasons := array_append(reasons, 'MEDIA_RIGHTS_REQUIRED');
  end if;
  is_ready := cardinality(reasons) = 0;

  update public.featured_farmer_drafts current
  set state = case when is_ready then 'review_ready' else 'drafting' end,
      revision = current.revision + 1
  where current.id = draft.id;
  update public.featured_farmer_research current
  set state = case when is_ready then 'review_ready' else 'drafting' end,
      revision = current.revision + 1
  where current.id = research.id;
  return query select is_ready, reasons, research.revision + 1;
end;
$$;

create or replace function public.create_featured_farmer_research(
  research_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, research_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing public.featured_farmer_research%rowtype;
  created public.featured_farmer_research%rowtype;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if idempotency_key_input is null
    or char_length(btrim(research_input ->> 'fullName')) not between 2 and 100
    or char_length(btrim(research_input ->> 'significanceHypothesis'))
      not between 20 and 800
    or char_length(research_input ->> 'preferredLocale') not between 2 and 20
    or jsonb_typeof(research_input -> 'queryFingerprints') <> 'object'
    or not (research_input -> 'queryFingerprints') ?& array[
      'identity', 'significance', 'institutions', 'social', 'current'
    ]
  then
    raise exception 'Invalid Featured Farmer research'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select item.* into existing
  from public.featured_farmer_research item
  where item.creation_idempotency_key = idempotency_key_input
  for update;
  if found then
    if existing.created_by <> actor_id
      or existing.subject_name <> btrim(research_input ->> 'fullName')
    then
      raise exception 'Featured Farmer research idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id, existing.revision;
    return;
  end if;
  insert into public.featured_farmer_research (
    created_by, subject_name, district_hint, state_hint, farming_hint,
    significance_hypothesis, preferred_locale, query_fingerprints,
    creation_idempotency_key
  ) values (
    actor_id, btrim(research_input ->> 'fullName'),
    nullif(btrim(research_input ->> 'districtHint'), ''),
    nullif(btrim(research_input ->> 'stateHint'), ''),
    nullif(btrim(research_input ->> 'farmingHint'), ''),
    btrim(research_input ->> 'significanceHypothesis'),
    research_input ->> 'preferredLocale',
    research_input -> 'queryFingerprints', idempotency_key_input
  ) returning * into created;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    created.id, actor_id, 'research_created', '{}'::jsonb,
    idempotency_key_input
  );
  return query select 'CREATED', created.id, created.revision;
end;
$$;

create or replace function public.save_featured_farmer_source(
  source_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, source_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  research public.featured_farmer_research%rowtype;
  existing public.featured_farmer_sources%rowtype;
  created public.featured_farmer_sources%rowtype;
  method_value text := source_input ->> 'discoveryMethod';
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  select item.* into research
  from public.featured_farmer_research item
  where item.id = (source_input ->> 'researchId')::uuid
    and item.created_by = actor_id and item.retention_expires_at > now()
  for update;
  if not found or research.state in ('published', 'expired') then
    raise exception 'Featured Farmer research unavailable'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  if idempotency_key_input is null
    or char_length(source_input ->> 'sourceUrl') not between 8 and 2048
    or source_input ->> 'sourceUrl' !~ '^https://'
    or char_length(source_input ->> 'publisherHost') not between 3 and 253
    or char_length(source_input ->> 'publisherName') not between 2 and 160
    or char_length(source_input ->> 'sourceTitle') not between 2 and 240
    or char_length(source_input ->> 'sourceExcerpt') not between 20 and 8000
    or source_input ->> 'sourceHash' !~ '^[0-9a-f]{64}$'
    or source_input ->> 'sourceType' not in (
      'website', 'youtube', 'instagram', 'facebook', 'linkedin', 'other_social'
    )
    or source_input ->> 'sourceQuality' not in (
      'official_record', 'institutional_reference', 'independent_reporting',
      'first_party', 'owned_social_profile', 'third_party_coverage'
    )
    or source_input ->> 'subjectAssociation' not in (
      'professional_reference', 'owned_social_profile', 'third_party_coverage'
    )
    or method_value not in ('manual_google_review', 'operator_supplied')
    or not (
      (method_value = 'manual_google_review'
        and source_input ->> 'providerQueryHash' ~ '^[0-9a-f]{64}$'
        and exists (
          select 1
          from jsonb_each_text(research.query_fingerprints) query_item
          where query_item.value = source_input ->> 'providerQueryHash'
        )
        and source_input ->> 'usageRightsBasis' = 'operator_selected_destination')
      or (method_value = 'operator_supplied'
        and source_input ->> 'providerQueryHash' is null
        and source_input ->> 'usageRightsBasis' = 'operator_supplied')
    )
    or (
      (source_input ->> 'subjectAssociation' = 'owned_social_profile') <>
      (source_input ->> 'sourceQuality' = 'owned_social_profile')
    )
    or (
      source_input ->> 'subjectAssociation' = 'owned_social_profile'
      and not public.is_supported_owned_social_profile_url(
        source_input ->> 'sourceType', source_input ->> 'sourceUrl'
      )
    )
    or (source_input ->> 'collectedAt')::timestamptz
      not between now() - interval '24 hours' and now() + interval '5 minutes'
  then
    raise exception 'Invalid Featured Farmer source'
      using errcode = '22023', detail = 'INVALID_SOURCE';
  end if;
  select item.* into existing
  from public.featured_farmer_sources item
  where item.creation_idempotency_key = idempotency_key_input
     or (item.research_id = research.id
       and item.source_hash = source_input ->> 'sourceHash')
  order by item.created_at limit 1 for update;
  if found then
    if existing.research_id <> research.id
      or existing.source_hash <> source_input ->> 'sourceHash'
    then
      raise exception 'Featured Farmer source idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id, existing.revision;
    return;
  end if;
  insert into public.featured_farmer_sources (
    research_id, source_url, publisher_host, publisher_name, source_title,
    source_published_at, source_type, source_excerpt, source_hash,
    discovery_method, source_quality, subject_association, provider_query_hash,
    usage_rights_basis, collected_at, retention_expires_at,
    creation_idempotency_key
  ) values (
    research.id, source_input ->> 'sourceUrl', source_input ->> 'publisherHost',
    source_input ->> 'publisherName', source_input ->> 'sourceTitle',
    nullif(source_input ->> 'sourcePublishedAt', '')::date,
    source_input ->> 'sourceType', source_input ->> 'sourceExcerpt',
    source_input ->> 'sourceHash', method_value,
    source_input ->> 'sourceQuality', source_input ->> 'subjectAssociation',
    source_input ->> 'providerQueryHash', source_input ->> 'usageRightsBasis',
    (source_input ->> 'collectedAt')::timestamptz,
    least((source_input ->> 'collectedAt')::timestamptz + interval '365 days',
      research.retention_expires_at), idempotency_key_input
  ) returning * into created;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    research.id, actor_id, 'source_added',
    jsonb_build_object('sourceId', created.id), idempotency_key_input
  );
  return query select 'CREATED', created.id, created.revision;
end;
$$;

create or replace function public.decide_featured_farmer_source(
  source_id_input uuid,
  decision_input text,
  source_quality_input text,
  subject_association_input text,
  expected_revision_input integer,
  idempotency_key_input uuid
)
returns table(code text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  source public.featured_farmer_sources%rowtype;
  research public.featured_farmer_research%rowtype;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  select item.* into source from public.featured_farmer_sources item
  where item.id = source_id_input for update;
  select item.* into research from public.featured_farmer_research item
  where item.id = source.research_id and item.created_by = actor_id for update;
  if source.id is null or research.id is null or research.state in ('published', 'expired') then
    raise exception 'Featured Farmer source unavailable'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  if source.decision_idempotency_key = idempotency_key_input then
    return query select 'IDEMPOTENT_REPLAY', source.revision;
    return;
  end if;
  if source.revision <> expected_revision_input then
    raise exception 'Featured Farmer source changed'
      using errcode = '40001', detail = 'CONFLICT';
  end if;
  if decision_input not in ('selected', 'rejected')
    or source_quality_input not in (
      'official_record', 'institutional_reference', 'independent_reporting',
      'first_party', 'owned_social_profile', 'third_party_coverage'
    )
    or subject_association_input not in (
      'professional_reference', 'owned_social_profile', 'third_party_coverage'
    )
    or ((subject_association_input = 'owned_social_profile') <>
      (source_quality_input = 'owned_social_profile'))
    or (subject_association_input = 'owned_social_profile'
      and not public.is_supported_owned_social_profile_url(
        source.source_type, source.source_url
      ))
  then
    raise exception 'Invalid Featured Farmer source decision'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  update public.featured_farmer_sources item
  set decision = decision_input, source_quality = source_quality_input,
      subject_association = subject_association_input, reviewed_by = actor_id,
      reviewed_at = now(), decision_idempotency_key = idempotency_key_input,
      revision = item.revision + 1
  where item.id = source.id;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    research.id, actor_id, 'source_decided',
    jsonb_build_object('sourceId', source.id, 'decision', decision_input),
    idempotency_key_input
  );
  if exists (select 1 from public.featured_farmer_drafts draft
    where draft.research_id = research.id) then
    perform public.refresh_featured_farmer_readiness(research.id);
  end if;
  return query select 'UPDATED', source.revision + 1;
end;
$$;

create or replace function public.save_featured_farmer_draft(
  draft_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, draft_id uuid, ready boolean, blockers text[], revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  research public.featured_farmer_research%rowtype;
  draft public.featured_farmer_drafts%rowtype;
  claim_item jsonb;
  claim_row public.featured_farmer_claims%rowtype;
  source_id_value uuid;
  claim_order integer := 0;
  readiness record;
  expected_revision integer;
  media_input jsonb := draft_input -> 'media';
  section_item jsonb;
  category_value text;
  limitation_value text;
  claim_key_value text;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  select item.* into research from public.featured_farmer_research item
  where item.id = (draft_input ->> 'researchId')::uuid
    and item.created_by = actor_id and item.retention_expires_at > now()
  for update;
  if not found or research.state in ('published', 'expired') then
    raise exception 'Featured Farmer research unavailable'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  if idempotency_key_input is null
    or draft_input ->> 'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(draft_input ->> 'headline') not between 8 and 180
    or char_length(draft_input ->> 'deck') not between 20 and 360
    or char_length(draft_input ->> 'whyFeatured') not between 40 and 900
    or jsonb_typeof(draft_input -> 'sections') <> 'array'
    or jsonb_array_length(draft_input -> 'sections') not between 3 and 7
    or jsonb_typeof(draft_input -> 'claims') <> 'array'
    or jsonb_array_length(draft_input -> 'claims') not between 2 and 24
    or jsonb_typeof(draft_input -> 'categorySlugs') <> 'array'
    or jsonb_array_length(draft_input -> 'categorySlugs') > 8
    or jsonb_typeof(draft_input -> 'limitations') <> 'array'
    or jsonb_array_length(draft_input -> 'limitations') not between 1 and 8
  then
    raise exception 'Invalid Featured Farmer draft'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select item.* into draft from public.featured_farmer_drafts item
  where item.research_id = research.id for update;
  if found and draft.last_save_idempotency_key = idempotency_key_input then
    return query select 'IDEMPOTENT_REPLAY', draft.id,
      draft.state = 'review_ready', '{}'::text[], draft.revision;
    return;
  end if;
  expected_revision := nullif(draft_input ->> 'expectedRevision', '')::integer;
  if found and (expected_revision is null or draft.revision <> expected_revision) then
    raise exception 'Featured Farmer draft changed'
      using errcode = '40001', detail = 'CONFLICT';
  end if;
  if found then
    update public.featured_farmer_drafts item
    set slug = draft_input ->> 'slug', headline = draft_input ->> 'headline',
        deck = draft_input ->> 'deck', why_featured = draft_input ->> 'whyFeatured',
        story_sections = draft_input -> 'sections',
        category_slugs = array(select jsonb_array_elements_text(
          draft_input -> 'categorySlugs')),
        limitations = array(select jsonb_array_elements_text(
          draft_input -> 'limitations')),
        state = 'drafting', last_save_idempotency_key = idempotency_key_input,
        reviewer_id = null, reviewed_at = null,
        revision = item.revision + 1
    where item.id = draft.id returning * into draft;
  else
    insert into public.featured_farmer_drafts (
      research_id, slug, headline, deck, why_featured, story_sections,
      category_slugs, limitations, last_save_idempotency_key
    ) values (
      research.id, draft_input ->> 'slug', draft_input ->> 'headline',
      draft_input ->> 'deck', draft_input ->> 'whyFeatured',
      draft_input -> 'sections',
      array(select jsonb_array_elements_text(draft_input -> 'categorySlugs')),
      array(select jsonb_array_elements_text(draft_input -> 'limitations')),
      idempotency_key_input
    ) returning * into draft;
  end if;
  delete from public.featured_farmer_claims claim where claim.draft_id = draft.id;
  for claim_item in select value from jsonb_array_elements(draft_input -> 'claims')
  loop
    if claim_item ->> 'claimKey' !~ '^[a-z][a-z0-9_]{1,59}$'
      or claim_item ->> 'claimType' not in (
        'significance', 'impact', 'award', 'innovation', 'community',
        'knowledge_sharing', 'ecological_stewardship', 'leadership'
      )
      or char_length(claim_item ->> 'statement') not between 10 and 700
      or jsonb_typeof(claim_item -> 'sourceIds') <> 'array'
      or jsonb_array_length(claim_item -> 'sourceIds') not between 1 and 8
    then
      raise exception 'Invalid Featured Farmer claim'
        using errcode = '22023', detail = 'INVALID_INPUT';
    end if;
    insert into public.featured_farmer_claims (
      draft_id, claim_key, claim_type, statement, display_label, display_value,
      display_context, display_order, review_state
    ) values (
      draft.id, claim_item ->> 'claimKey', claim_item ->> 'claimType',
      claim_item ->> 'statement', nullif(claim_item ->> 'displayLabel', ''),
      nullif(claim_item ->> 'displayValue', ''),
      nullif(claim_item ->> 'displayContext', ''), claim_order, 'approved'
    ) returning * into claim_row;
    for source_id_value in
      select value::uuid
      from jsonb_array_elements_text(claim_item -> 'sourceIds') item(value)
    loop
      if not exists (
        select 1 from public.featured_farmer_sources source
        where source.id = source_id_value and source.research_id = research.id
          and source.decision = 'selected' and source.retention_expires_at > now()
      ) then
        raise exception 'Claim source is unavailable'
          using errcode = '22023', detail = 'EVIDENCE_REQUIRED';
      end if;
      insert into public.featured_farmer_claim_sources (claim_id, source_id)
      values (claim_row.id, source_id_value);
    end loop;
    claim_order := claim_order + 1;
  end loop;

  for section_item in select value
    from jsonb_array_elements(draft_input -> 'sections')
  loop
    if section_item ->> 'kind' not in (
      'origin', 'work', 'impact', 'community', 'lessons'
    )
      or char_length(section_item ->> 'heading') not between 2 and 120
      or char_length(section_item ->> 'body') not between 40 and 2500
      or jsonb_typeof(section_item -> 'claimKeys') <> 'array'
      or jsonb_array_length(section_item -> 'claimKeys') not between 1 and 12
    then
      raise exception 'Invalid Featured Farmer story section'
        using errcode = '22023', detail = 'INVALID_INPUT';
    end if;
    for claim_key_value in select value
      from jsonb_array_elements_text(section_item -> 'claimKeys') item(value)
    loop
      if not exists (
        select 1 from public.featured_farmer_claims claim
        where claim.draft_id = draft.id and claim.claim_key = claim_key_value
          and claim.review_state = 'approved'
      ) then
        raise exception 'Story section references an unavailable claim'
          using errcode = '22023', detail = 'EVIDENCE_REQUIRED';
      end if;
    end loop;
  end loop;
  for category_value in select value
    from jsonb_array_elements_text(draft_input -> 'categorySlugs') item(value)
  loop
    if not exists (
      select 1 from public.agriculture_categories category
      where category.slug = category_value and category.selectable
        and category.status = 'active'
    ) then
      raise exception 'Invalid Featured Farmer category'
        using errcode = '22023', detail = 'INVALID_INPUT';
    end if;
  end loop;
  for limitation_value in select value
    from jsonb_array_elements_text(draft_input -> 'limitations') item(value)
  loop
    if char_length(limitation_value) not between 5 and 300 then
      raise exception 'Invalid Featured Farmer limitation'
        using errcode = '22023', detail = 'INVALID_INPUT';
    end if;
  end loop;

  if media_input is null or media_input = 'null'::jsonb then
    delete from public.featured_farmer_media media where media.draft_id = draft.id;
  else
    if char_length(media_input ->> 'assetUrl') not between 1 and 2048
      or char_length(media_input ->> 'altText') not between 5 and 240
      or char_length(media_input ->> 'credit') not between 2 and 180
      or media_input ->> 'rightsBasis' not in (
        'subject_permission', 'publisher_licence', 'farmerbook_owned',
        'open_licence'
      )
      or char_length(media_input ->> 'rightsReference') not between 5 and 500
    then
      raise exception 'Invalid Featured Farmer media rights'
        using errcode = '22023', detail = 'INVALID_INPUT';
    end if;
    insert into public.featured_farmer_media (
      draft_id, asset_url, alt_text, credit, rights_basis, rights_reference,
      approved_by, approved_at
    ) values (
      draft.id, media_input ->> 'assetUrl', media_input ->> 'altText',
      media_input ->> 'credit', media_input ->> 'rightsBasis',
      media_input ->> 'rightsReference', actor_id, now()
    ) on conflict (draft_id) do update set
      asset_url = excluded.asset_url, alt_text = excluded.alt_text,
      credit = excluded.credit, rights_basis = excluded.rights_basis,
      rights_reference = excluded.rights_reference,
      approved_by = excluded.approved_by, approved_at = excluded.approved_at;
  end if;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    research.id, actor_id, 'draft_saved',
    jsonb_build_object('draftId', draft.id), idempotency_key_input
  );
  select * into readiness
  from public.refresh_featured_farmer_readiness(research.id);
  return query select case when readiness.ready then 'REVIEW_READY' else 'SAVED' end,
    draft.id, readiness.ready, readiness.blockers, readiness.revision;
end;
$$;

create or replace function public.confirm_featured_farmer_social(
  source_id_input uuid,
  platform_input text,
  ownership_basis_input text,
  display_order_input integer,
  idempotency_key_input uuid
)
returns table(code text, ready boolean, blockers text[], revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  source public.featured_farmer_sources%rowtype;
  research public.featured_farmer_research%rowtype;
  draft public.featured_farmer_drafts%rowtype;
  existing public.featured_farmer_social_links%rowtype;
  readiness record;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  select item.* into source from public.featured_farmer_sources item
  where item.id = source_id_input for update;
  select item.* into research from public.featured_farmer_research item
  where item.id = source.research_id and item.created_by = actor_id for update;
  select item.* into draft from public.featured_farmer_drafts item
  where item.research_id = research.id for update;
  if source.id is null or research.id is null or draft.id is null
    or source.decision <> 'selected'
    or source.subject_association <> 'owned_social_profile'
    or source.source_quality <> 'owned_social_profile'
    or source.source_type <> platform_input
    or platform_input not in ('youtube', 'instagram', 'facebook', 'linkedin')
    or not public.is_supported_owned_social_profile_url(
      source.source_type, source.source_url
    )
    or char_length(ownership_basis_input) not between 10 and 500
    or display_order_input not between 0 and 20
  then
    raise exception 'Invalid Featured Farmer owned social account'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select item.* into existing from public.featured_farmer_social_links item
  where item.creation_idempotency_key = idempotency_key_input;
  if found then
    return query select 'IDEMPOTENT_REPLAY', draft.state = 'review_ready',
      '{}'::text[], research.revision;
    return;
  end if;
  insert into public.featured_farmer_social_links (
    draft_id, source_id, platform, profile_url, ownership_basis, display_order,
    confirmed_by, creation_idempotency_key
  ) values (
    draft.id, source.id, platform_input, source.source_url,
    ownership_basis_input, display_order_input, actor_id, idempotency_key_input
  ) on conflict (draft_id, platform) do update set
    source_id = excluded.source_id, profile_url = excluded.profile_url,
    ownership_basis = excluded.ownership_basis,
    display_order = excluded.display_order, confirmed_by = excluded.confirmed_by,
    confirmed_at = now(), creation_idempotency_key = excluded.creation_idempotency_key;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    research.id, actor_id, 'social_confirmed',
    jsonb_build_object('sourceId', source.id, 'platform', platform_input),
    idempotency_key_input
  );
  select * into readiness
  from public.refresh_featured_farmer_readiness(research.id);
  return query select 'CONFIRMED', readiness.ready, readiness.blockers,
    readiness.revision;
end;
$$;

create or replace function public.remove_featured_farmer_social(
  research_id_input uuid,
  platform_input text,
  expected_revision_input integer,
  idempotency_key_input uuid
)
returns table(code text, ready boolean, blockers text[], revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  research public.featured_farmer_research%rowtype;
  draft public.featured_farmer_drafts%rowtype;
  readiness record;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if exists (
    select 1 from public.featured_farmer_events event
    where event.idempotency_key = idempotency_key_input
      and event.event_type = 'social_removed'
  ) then
    select item.* into research from public.featured_farmer_research item
    where item.id = research_id_input;
    return query select 'IDEMPOTENT_REPLAY', false, '{}'::text[], research.revision;
    return;
  end if;
  select item.* into research from public.featured_farmer_research item
  where item.id = research_id_input and item.created_by = actor_id for update;
  select item.* into draft from public.featured_farmer_drafts item
  where item.research_id = research.id for update;
  if research.id is null or draft.id is null
    or research.revision <> expected_revision_input
    or platform_input not in ('youtube', 'instagram', 'facebook', 'linkedin')
  then
    raise exception 'Featured Farmer social link changed'
      using errcode = '40001', detail = 'CONFLICT';
  end if;
  delete from public.featured_farmer_social_links social
  where social.draft_id = draft.id and social.platform = platform_input;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    research.id, actor_id, 'social_removed',
    jsonb_build_object('platform', platform_input), idempotency_key_input
  );
  select * into readiness
  from public.refresh_featured_farmer_readiness(research.id);
  return query select 'REMOVED', readiness.ready, readiness.blockers,
    readiness.revision;
end;
$$;

create or replace function public.reserve_featured_farmer_youtube_search(
  research_id_input uuid,
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
  research public.featured_farmer_research%rowtype;
  existing public.featured_farmer_youtube_searches%rowtype;
  created_id uuid;
  project_today integer;
  actor_today integer;
  actor_month integer;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  select item.* into research from public.featured_farmer_research item
  where item.id = research_id_input and item.created_by = actor_id
    and item.retention_expires_at > now()
  for update;
  if not found or query_hash_input !~ '^[0-9a-f]{64}$'
    or idempotency_key_input is null then
    raise exception 'Featured Farmer research unavailable'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select item.* into existing
  from public.featured_farmer_youtube_searches item
  where item.idempotency_key = idempotency_key_input for update;
  if found then
    if existing.research_id <> research.id
      or existing.requested_by <> actor_id
      or existing.query_hash <> query_hash_input
    then
      raise exception 'YouTube search idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id;
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('farmerbook-youtube-search', 0));
  select
    (select count(*) from public.featured_farmer_youtube_searches request
      where request.created_at >= date_trunc('day', now()))
    + (select count(*) from public.known_farmer_youtube_searches request
      where request.created_at >= date_trunc('day', now()))
  into project_today;
  select
    (select count(*) from public.featured_farmer_youtube_searches request
      where request.requested_by = actor_id
        and request.created_at >= date_trunc('day', now()))
    + (select count(*) from public.known_farmer_youtube_searches request
      where request.requested_by = actor_id
        and request.created_at >= date_trunc('day', now()))
  into actor_today;
  select
    (select count(*) from public.featured_farmer_youtube_searches request
      where request.requested_by = actor_id
        and request.created_at >= date_trunc('month', now()))
    + (select count(*) from public.known_farmer_youtube_searches request
      where request.requested_by = actor_id
        and request.created_at >= date_trunc('month', now()))
  into actor_month;
  if project_today >= 50 or actor_today >= 10 or actor_month >= 100 then
    raise exception 'Featured Farmer YouTube quota exceeded'
      using errcode = 'P0001', detail = 'SEARCH_QUOTA_EXCEEDED';
  end if;
  insert into public.featured_farmer_youtube_searches (
    research_id, requested_by, query_hash, idempotency_key
  ) values (
    research.id, actor_id, query_hash_input, idempotency_key_input
  ) returning id into created_id;
  return query select 'RESERVED', created_id;
end;
$$;

create or replace function public.save_featured_farmer_youtube_candidates(
  research_id_input uuid,
  candidates_input jsonb
)
returns table(code text, saved_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  research public.featured_farmer_research%rowtype;
  item jsonb;
  saved integer := 0;
  collected_value timestamptz;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  select candidate.* into research
  from public.featured_farmer_research candidate
  where candidate.id = research_id_input and candidate.retention_expires_at > now()
  for update;
  if not found or jsonb_typeof(candidates_input) <> 'array'
    or jsonb_array_length(candidates_input) not between 1 and 5 then
    raise exception 'Featured Farmer candidates unavailable'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  for item in select value from jsonb_array_elements(candidates_input)
  loop
    collected_value := (item ->> 'collectedAt')::timestamptz;
    if char_length(item ->> 'sourceUrl') not between 8 and 2048
      or item ->> 'sourceUrl' !~ '^https://([^/]+\.)?youtube\.com/'
      or char_length(item ->> 'sourceTitle') not between 2 and 240
      or char_length(item ->> 'sourceExcerpt') not between 20 and 8000
      or item ->> 'sourceHash' !~ '^[0-9a-f]{64}$'
      or item ->> 'providerQueryHash' !~ '^[0-9a-f]{64}$'
      or char_length(item ->> 'providerItemId') not between 1 and 160
      or collected_value > now() + interval '5 minutes'
    then
      raise exception 'Invalid Featured Farmer YouTube candidate'
        using errcode = '22023', detail = 'INVALID_SOURCE';
    end if;
    insert into public.featured_farmer_sources (
      research_id, source_url, publisher_host, publisher_name, source_title,
      source_type, source_excerpt, source_hash, discovery_method,
      source_quality, subject_association, provider_item_id,
      provider_query_hash, usage_rights_basis, collected_at, refresh_due_at,
      retention_expires_at, creation_idempotency_key
    ) values (
      research.id, item ->> 'sourceUrl', 'youtube.com', 'YouTube',
      item ->> 'sourceTitle', 'youtube', item ->> 'sourceExcerpt',
      item ->> 'sourceHash', 'youtube_data_api', 'third_party_coverage',
      'third_party_coverage', item ->> 'providerItemId',
      item ->> 'providerQueryHash', 'youtube_api_terms', collected_value,
      least(collected_value + interval '30 days', research.retention_expires_at),
      least(collected_value + interval '30 days', research.retention_expires_at),
      (item ->> 'idempotencyKey')::uuid
    ) on conflict (research_id, source_hash) do nothing;
    if found then saved := saved + 1; end if;
  end loop;
  return query select case when saved = 0 then 'IDEMPOTENT_REPLAY'
    else 'SAVED' end, saved;
end;
$$;

create or replace function public.complete_featured_farmer_youtube_search(
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
  request public.featured_farmer_youtube_searches%rowtype;
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
  select item.* into request from public.featured_farmer_youtube_searches item
  where item.id = search_id_input and item.requested_by = actor_id for update;
  if not found then
    raise exception 'YouTube search reservation not found'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  if request.state <> 'reserved' then
    return query select 'IDEMPOTENT_REPLAY', request.state;
    return;
  end if;
  if result_count_value not between 0 and 5 then
    raise exception 'Invalid YouTube result count'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if outcome_state = 'succeeded' and failure_code_value is null then
    update public.featured_farmer_youtube_searches item
    set state = 'succeeded', result_count = result_count_value,
        completed_at = now() where item.id = request.id;
  elsif outcome_state = 'failed' and failure_code_value ~ '^[A-Z0-9_]{2,80}$' then
    update public.featured_farmer_youtube_searches item
    set state = 'failed', result_count = result_count_value,
        failure_code = failure_code_value, completed_at = now()
    where item.id = request.id;
  else
    raise exception 'Invalid YouTube outcome'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    request.research_id, actor_id, 'youtube_searched',
    jsonb_build_object('state', outcome_state, 'resultCount', result_count_value),
    request.idempotency_key
  ) on conflict (idempotency_key) do nothing;
  return query select 'RECORDED', outcome_state;
end;
$$;

create or replace function public.publish_featured_farmer(
  research_id_input uuid,
  expected_revision_input integer,
  fact_checked_at_input timestamptz,
  idempotency_key_input uuid
)
returns table(code text, slug text, publication_revision integer, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  research public.featured_farmer_research%rowtype;
  draft public.featured_farmer_drafts%rowtype;
  existing public.featured_farmer_publications%rowtype;
  media_json jsonb;
  claims_json jsonb;
  sources_json jsonb;
  social_json jsonb;
  coverage_json jsonb;
  snapshot_json jsonb;
  next_publication_revision integer;
  readiness record;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('featured_farmer_profiles') then
    raise exception 'Featured Farmer profiles are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  select item.* into existing from public.featured_farmer_publications item
  where item.publication_idempotency_key = idempotency_key_input;
  if found then
    return query select 'IDEMPOTENT_REPLAY', existing.slug,
      existing.publication_revision, expected_revision_input;
    return;
  end if;
  select item.* into research from public.featured_farmer_research item
  where item.id = research_id_input and item.created_by = actor_id for update;
  select item.* into draft from public.featured_farmer_drafts item
  where item.research_id = research.id for update;
  if research.id is null or draft.id is null
    or research.revision <> expected_revision_input
    or fact_checked_at_input < now() - interval '24 hours'
    or fact_checked_at_input > now() + interval '5 minutes'
  then
    raise exception 'Featured Farmer publication conflict'
      using errcode = '40001', detail = 'CONFLICT';
  end if;
  select * into readiness
  from public.refresh_featured_farmer_readiness(research.id);
  select item.* into research from public.featured_farmer_research item
  where item.id = research.id for update;
  select item.* into draft from public.featured_farmer_drafts item
  where item.id = draft.id for update;
  if not readiness.ready or research.state <> 'review_ready'
    or draft.state <> 'review_ready' then
    raise exception 'Featured Farmer story is not review ready'
      using errcode = '22023', detail = 'PUBLICATION_NOT_READY';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', source.id, 'url', source.source_url, 'publisher', source.publisher_name,
    'title', source.source_title, 'publishedAt', source.source_published_at,
    'sourceType', source.source_type, 'quality', source.source_quality,
    'association', source.subject_association
  ) order by source.created_at), '[]'::jsonb) into sources_json
  from public.featured_farmer_sources source
  where source.research_id = research.id and source.decision = 'selected'
    and source.retention_expires_at > now();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', claim.id, 'key', claim.claim_key, 'type', claim.claim_type,
    'statement', claim.statement, 'displayLabel', claim.display_label,
    'displayValue', claim.display_value, 'displayContext', claim.display_context,
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', source.id, 'url', source.source_url,
        'publisher', source.publisher_name, 'title', source.source_title,
        'publishedAt', source.source_published_at
      ) order by source.created_at), '[]'::jsonb)
      from public.featured_farmer_claim_sources link
      join public.featured_farmer_sources source on source.id = link.source_id
      where link.claim_id = claim.id and source.decision = 'selected'
    )
  ) order by claim.display_order), '[]'::jsonb) into claims_json
  from public.featured_farmer_claims claim
  where claim.draft_id = draft.id and claim.review_state = 'approved';

  select coalesce(jsonb_agg(jsonb_build_object(
    'platform', social.platform, 'url', social.profile_url
  ) order by social.display_order), '[]'::jsonb) into social_json
  from public.featured_farmer_social_links social
  where social.draft_id = draft.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'url', source.source_url, 'publisher', source.publisher_name,
    'title', source.source_title, 'sourceType', source.source_type
  ) order by source.created_at), '[]'::jsonb) into coverage_json
  from public.featured_farmer_sources source
  where source.research_id = research.id and source.decision = 'selected'
    and source.subject_association = 'third_party_coverage';

  select case when media.id is null then null else jsonb_build_object(
    'assetUrl', media.asset_url, 'altText', media.alt_text,
    'credit', media.credit, 'rightsBasis', media.rights_basis
  ) end into media_json
  from (select 1) seed
  left join public.featured_farmer_media media on media.draft_id = draft.id;

  snapshot_json := jsonb_build_object(
    'fullName', research.subject_name, 'district', research.district_hint,
    'state', research.state_hint, 'locale', research.preferred_locale,
    'headline', draft.headline, 'deck', draft.deck,
    'whyFeatured', draft.why_featured, 'sections', draft.story_sections,
    'categorySlugs', to_jsonb(draft.category_slugs),
    'limitations', to_jsonb(draft.limitations), 'claims', claims_json,
    'sources', sources_json, 'socialLinks', social_json,
    'coverage', coverage_json, 'media', media_json,
    'editorialDisclosure', 'FarmerBook editorial profile; not a member or verification claim'
  );
  update public.featured_farmer_publications item set is_current = false
  where item.slug = draft.slug and item.is_current;
  select coalesce(max(item.publication_revision), 0) + 1
  into next_publication_revision
  from public.featured_farmer_publications item where item.slug = draft.slug;
  insert into public.featured_farmer_publications (
    research_id, draft_id, slug, publication_revision, snapshot, state,
    is_current, published_by, reviewed_by, fact_checked_at,
    publication_idempotency_key
  ) values (
    research.id, draft.id, draft.slug, next_publication_revision, snapshot_json,
    'published', true, actor_id, actor_id, fact_checked_at_input,
    idempotency_key_input
  );
  update public.featured_farmer_drafts item
  set state = 'published', reviewer_id = actor_id, reviewed_at = now(),
      revision = item.revision + 1 where item.id = draft.id;
  update public.featured_farmer_research item
  set state = 'published', last_publish_idempotency_key = idempotency_key_input,
      revision = item.revision + 1 where item.id = research.id;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    research.id, actor_id, 'published',
    jsonb_build_object('slug', draft.slug,
      'publicationRevision', next_publication_revision), idempotency_key_input
  );
  return query select 'PUBLISHED', draft.slug, next_publication_revision,
    research.revision + 1;
end;
$$;

create or replace function public.withdraw_featured_farmer(
  research_id_input uuid,
  reason_input text,
  expected_revision_input integer,
  idempotency_key_input uuid
)
returns table(code text, slug text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  research public.featured_farmer_research%rowtype;
  publication public.featured_farmer_publications%rowtype;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  select item.* into research from public.featured_farmer_research item
  where item.id = research_id_input and item.created_by = actor_id for update;
  select item.* into publication from public.featured_farmer_publications item
  where item.research_id = research.id and item.is_current for update;
  if research.id is null or publication.id is null
    or research.revision <> expected_revision_input
    or char_length(reason_input) not between 10 and 500 then
    raise exception 'Featured Farmer withdrawal conflict'
      using errcode = '40001', detail = 'CONFLICT';
  end if;
  if research.last_withdraw_idempotency_key = idempotency_key_input then
    return query select 'IDEMPOTENT_REPLAY', publication.slug, research.revision;
    return;
  end if;
  update public.featured_farmer_publications item
  set state = 'withdrawn', withdrawn_at = now(), withdrawal_reason = reason_input,
      withdrawal_idempotency_key = idempotency_key_input
  where item.id = publication.id;
  update public.featured_farmer_drafts item set state = 'withdrawn',
      revision = item.revision + 1 where item.id = publication.draft_id;
  update public.featured_farmer_research item
  set state = 'withdrawn', last_withdraw_idempotency_key = idempotency_key_input,
      revision = item.revision + 1 where item.id = research.id;
  insert into public.featured_farmer_events (
    research_id, actor_id, event_type, details, idempotency_key
  ) values (
    research.id, actor_id, 'withdrawn',
    jsonb_build_object('slug', publication.slug), idempotency_key_input
  );
  return query select 'WITHDRAWN', publication.slug, research.revision + 1;
end;
$$;

create or replace function public.list_featured_farmer_publications(
  limit_input integer default 24,
  offset_input integer default 0
)
returns table(
  publication_id uuid, slug text, publication_revision integer, snapshot jsonb,
  fact_checked_at timestamptz, published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select item.id, item.slug, item.publication_revision, item.snapshot,
    item.fact_checked_at, item.published_at
  from public.featured_farmer_publications item
  where public.is_ecosystem_release_enabled('featured_farmer_profiles')
    and item.is_current and item.state = 'published'
  order by item.published_at desc
  limit least(greatest(limit_input, 1), 100)
  offset greatest(offset_input, 0);
$$;

create or replace function public.get_featured_farmer_publication(
  slug_input text
)
returns table(
  publication_id uuid, slug text, publication_revision integer, snapshot jsonb,
  fact_checked_at timestamptz, published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select item.id, item.slug, item.publication_revision, item.snapshot,
    item.fact_checked_at, item.published_at
  from public.featured_farmer_publications item
  where public.is_ecosystem_release_enabled('featured_farmer_profiles')
    and item.is_current and item.state = 'published' and item.slug = slug_input
  limit 1;
$$;

alter table public.featured_farmer_research enable row level security;
alter table public.featured_farmer_sources enable row level security;
alter table public.featured_farmer_drafts enable row level security;
alter table public.featured_farmer_claims enable row level security;
alter table public.featured_farmer_claim_sources enable row level security;
alter table public.featured_farmer_social_links enable row level security;
alter table public.featured_farmer_media enable row level security;
alter table public.featured_farmer_publications enable row level security;
alter table public.featured_farmer_events enable row level security;
alter table public.featured_farmer_youtube_searches enable row level security;

revoke all on public.featured_farmer_research,
  public.featured_farmer_sources, public.featured_farmer_drafts,
  public.featured_farmer_claims, public.featured_farmer_claim_sources,
  public.featured_farmer_social_links, public.featured_farmer_media,
  public.featured_farmer_publications, public.featured_farmer_events,
  public.featured_farmer_youtube_searches
from public, anon, authenticated;

revoke all on function public.refresh_featured_farmer_readiness(uuid),
  public.create_featured_farmer_research(jsonb, uuid),
  public.save_featured_farmer_source(jsonb, uuid),
  public.decide_featured_farmer_source(uuid, text, text, text, integer, uuid),
  public.save_featured_farmer_draft(jsonb, uuid),
  public.confirm_featured_farmer_social(uuid, text, text, integer, uuid),
  public.remove_featured_farmer_social(uuid, text, integer, uuid),
  public.reserve_featured_farmer_youtube_search(uuid, text, uuid),
  public.save_featured_farmer_youtube_candidates(uuid, jsonb),
  public.complete_featured_farmer_youtube_search(uuid, jsonb),
  public.publish_featured_farmer(uuid, integer, timestamptz, uuid),
  public.withdraw_featured_farmer(uuid, text, integer, uuid),
  public.list_featured_farmer_publications(integer, integer),
  public.get_featured_farmer_publication(text)
from public, anon, authenticated;

grant execute on function public.create_featured_farmer_research(jsonb, uuid),
  public.save_featured_farmer_source(jsonb, uuid),
  public.decide_featured_farmer_source(uuid, text, text, text, integer, uuid),
  public.save_featured_farmer_draft(jsonb, uuid),
  public.confirm_featured_farmer_social(uuid, text, text, integer, uuid),
  public.remove_featured_farmer_social(uuid, text, integer, uuid),
  public.reserve_featured_farmer_youtube_search(uuid, text, uuid),
  public.complete_featured_farmer_youtube_search(uuid, jsonb),
  public.publish_featured_farmer(uuid, integer, timestamptz, uuid),
  public.withdraw_featured_farmer(uuid, text, integer, uuid)
to authenticated;

grant execute on function public.save_featured_farmer_youtube_candidates(uuid, jsonb)
to service_role;

grant execute on function public.list_featured_farmer_publications(integer, integer),
  public.get_featured_farmer_publication(text)
to anon, authenticated;
