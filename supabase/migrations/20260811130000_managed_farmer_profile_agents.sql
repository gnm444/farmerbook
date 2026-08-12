-- Managed Farmer profile research agents. The agent may assemble a private,
-- cited sample from permitted public evidence. It cannot publish or verify the
-- person. A consented invitation holder must approve the sample before it can
-- be linked to an account. All new authorization is behind a private release
-- control which defaults to false.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('profile_research_agents', false)
on conflict (control_key) do nothing;

create table public.managed_profile_samples (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null unique
    references public.outreach_prospects (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  subject_name text not null check (char_length(subject_name) between 2 and 100),
  state text not null default 'draft_ready' check (state in (
    'draft_ready', 'approval_pending', 'approved', 'rejected',
    'expired', 'claimed', 'failed'
  )),
  sample_data jsonb not null check (
    jsonb_typeof(sample_data) = 'object'
    and octet_length(sample_data::text) <= 32768
  ),
  agent_instance_name text not null
    check (agent_instance_name ~ '^[a-z0-9][a-z0-9-]{2,120}$'),
  workflow_id text check (
    workflow_id is null or char_length(workflow_id) between 1 and 160
  ),
  sample_fingerprint text not null check (sample_fingerprint ~ '^[0-9a-f]{64}$'),
  model text not null check (char_length(model) between 2 and 160),
  prompt_version text not null check (char_length(prompt_version) between 2 and 80),
  run_status text not null check (run_status in ('succeeded', 'fallback')),
  failure_code text check (
    failure_code is null or failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  duration_ms integer not null check (duration_ms between 0 and 600000),
  approved_at timestamptz,
  rejected_at timestamptz,
  claimed_profile_id uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  retention_expires_at timestamptz not null default (now() + interval '30 days'),
  creation_idempotency_key uuid not null unique,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (retention_expires_at > created_at),
  check ((approved_at is null) = (state not in ('approved', 'claimed'))),
  check ((rejected_at is null) = (state <> 'rejected')),
  check (
    (claimed_profile_id is null and claimed_at is null)
    or (claimed_profile_id is not null and claimed_at is not null and state = 'claimed')
  )
);

create table public.managed_profile_sample_sources (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null
    references public.managed_profile_samples (id) on delete cascade,
  source_url text not null check (char_length(source_url) between 8 and 2048),
  source_type text not null check (source_type in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin',
    'other_social', 'pasted_description', 'screenshot_ocr'
  )),
  source_title text check (
    source_title is null or char_length(source_title) between 1 and 180
  ),
  source_excerpt text not null
    check (char_length(source_excerpt) between 2 and 8000),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  discovery_provider text check (
    discovery_provider is null or discovery_provider = 'brave_search'
  ),
  provider_query_hash text check (
    provider_query_hash is null or provider_query_hash ~ '^[0-9a-f]{64}$'
  ),
  usage_rights_basis text check (
    usage_rights_basis is null or usage_rights_basis = 'provider_storage_plan'
  ),
  collected_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (sample_id, source_hash),
  check (
    (discovery_provider is null and provider_query_hash is null
      and usage_rights_basis is null)
    or (discovery_provider = 'brave_search'
      and provider_query_hash is not null
      and usage_rights_basis = 'provider_storage_plan')
  )
);

create table public.profile_verification_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  claim_type text not null check (claim_type in (
    'contact', 'farmer_role', 'identity', 'social_presence', 'organization'
  )),
  state text not null check (state in (
    'pending', 'verified', 'rejected', 'expired', 'revoked'
  )),
  method text not null check (method in (
    'email_link', 'phone_otp', 'whatsapp_link', 'social_oauth',
    'government_kyc', 'liveness_match', 'bank_name_match',
    'organization_registry', 'farmer_registry', 'community_vouch',
    'live_interview', 'service_area_evidence', 'transaction_history'
  )),
  provider text not null check (char_length(provider) between 2 and 100),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  provider_receipt_id text check (
    provider_receipt_id is null or char_length(provider_receipt_id) between 1 and 300
  ),
  scope text not null default 'default' check (char_length(scope) between 1 and 120),
  verified_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'verified') = (verified_at is not null)),
  check (expires_at is null or verified_at is null or expires_at > verified_at),
  check ((state = 'revoked') = (revoked_at is not null))
);

create table public.managed_profile_search_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles (id) on delete restrict,
  provider text not null default 'brave_search'
    check (provider = 'brave_search'),
  query_hash text not null check (query_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'reserved'
    check (state in ('reserved', 'succeeded', 'failed')),
  result_count smallint check (result_count between 0 and 5),
  prospect_id uuid references public.outreach_prospects (id) on delete set null,
  sample_id uuid references public.managed_profile_samples (id) on delete set null,
  failure_code text check (
    failure_code is null or failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  idempotency_key uuid not null unique,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (state = 'reserved' and completed_at is null and result_count is null
      and prospect_id is null and sample_id is null and failure_code is null)
    or (state = 'succeeded' and completed_at is not null
      and result_count between 1 and 5 and prospect_id is not null
      and sample_id is not null and failure_code is null)
    or (state = 'failed' and completed_at is not null
      and result_count between 0 and 5 and failure_code is not null
      and prospect_id is null and sample_id is null)
  )
);

create unique index profile_verification_claims_current_idx
  on public.profile_verification_claims (profile_id, claim_type, lower(scope))
  where state in ('pending', 'verified');
create index managed_profile_samples_retention_idx
  on public.managed_profile_samples (retention_expires_at)
  where state not in ('claimed', 'rejected', 'expired');
create index profile_verification_claims_profile_idx
  on public.profile_verification_claims (profile_id, state, claim_type);
create index managed_profile_search_requests_quota_idx
  on public.managed_profile_search_requests
    (requested_by, provider, created_at desc);

create or replace function public.managed_profile_sample_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end;
$$;

create trigger managed_profile_samples_set_updated_at
before update on public.managed_profile_samples
for each row execute function public.managed_profile_sample_set_updated_at();
create trigger profile_verification_claims_set_updated_at
before update on public.profile_verification_claims
for each row execute function public.set_updated_at();

create or replace function public.has_current_profile_verification(
  profile_id_input uuid,
  claim_type_input text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_verification_claims claim
    where claim.profile_id = profile_id_input
      and claim.claim_type = claim_type_input
      and claim.state = 'verified'
      and claim.verified_at <= now()
      and (claim.expires_at is null or claim.expires_at > now())
      and claim.revoked_at is null
  );
$$;

create or replace function public.can_profile_message(profile_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user(profile_id_input)
    and (
      not public.is_ecosystem_release_enabled('profile_research_agents')
      or public.has_current_profile_verification(profile_id_input, 'contact')
    );
$$;

create or replace function public.can_profile_publish_produce(profile_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = profile_id_input
      and profile.status = 'active'
      and profile.onboarding_complete
      and profile.account_role in ('farmer', 'wholesaler')
      and (
        not public.is_ecosystem_release_enabled('profile_research_agents')
        or public.has_current_profile_verification(profile.id, 'farmer_role')
      )
  );
$$;

create or replace function public.can_create_rate_limited_post(profile_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user(profile_id_input)
    and (
      not public.is_ecosystem_release_enabled('profile_research_agents')
      or (
        select count(*) < 6
        from public.posts post
        where post.author_id = profile_id_input
          and post.created_at >= now() - interval '1 hour'
      )
    );
$$;

create or replace function public.reserve_managed_profile_search(
  query_hash_input text,
  idempotency_key_input uuid
)
returns table(
  code text,
  search_request_id uuid,
  prospect_id uuid,
  sample_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing public.managed_profile_search_requests%rowtype;
  created_id uuid;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('profile_research_agents')
    or not public.is_ecosystem_release_enabled('outreach_agent')
  then
    raise exception 'Managed profile search is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if query_hash_input !~ '^[0-9a-f]{64}$'
    or idempotency_key_input is null
  then
    raise exception 'Invalid managed profile search reservation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select request.* into existing
  from public.managed_profile_search_requests request
  where request.idempotency_key = idempotency_key_input
  for update;
  if found then
    if existing.query_hash <> query_hash_input
      or existing.requested_by <> actor_id
    then
      raise exception 'Managed profile search idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id,
      existing.prospect_id, existing.sample_id;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('managed-profile-search:brave-search', 0)
  );
  if (
    select count(*) >= 25
    from public.managed_profile_search_requests request
    where request.requested_by = actor_id
      and request.provider = 'brave_search'
      and request.created_at >= date_trunc('day', now())
  ) or (
    select count(*) >= 250
    from public.managed_profile_search_requests request
    where request.requested_by = actor_id
      and request.provider = 'brave_search'
      and request.created_at >= date_trunc('month', now())
  ) then
    raise exception 'Managed profile search quota exceeded'
      using errcode = 'P0001', detail = 'SEARCH_QUOTA_EXCEEDED';
  end if;

  insert into public.managed_profile_search_requests (
    requested_by, query_hash, idempotency_key
  ) values (
    actor_id, query_hash_input, idempotency_key_input
  ) returning id into created_id;
  return query select 'RESERVED', created_id, null::uuid, null::uuid;
end;
$$;

create or replace function public.complete_managed_profile_search(
  search_request_id_input uuid,
  outcome_input jsonb
)
returns table(code text, state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  search_request public.managed_profile_search_requests%rowtype;
  outcome_state text := outcome_input ->> 'state';
  result_count_value integer := coalesce(
    (outcome_input ->> 'resultCount')::integer,
    0
  );
  prospect_id_value uuid;
  sample_id_value uuid;
  failure_code_value text := nullif(outcome_input ->> 'failureCode', '');
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  select candidate.* into search_request
  from public.managed_profile_search_requests candidate
  where candidate.id = search_request_id_input
  for update;
  if not found or search_request.requested_by <> actor_id then
    raise exception 'Managed profile search reservation not found'
      using errcode = 'P0002', detail = 'SEARCH_RESERVATION_NOT_FOUND';
  end if;
  if search_request.state <> 'reserved' then
    return query select 'IDEMPOTENT_REPLAY', search_request.state;
    return;
  end if;
  if outcome_state = 'succeeded' then
    prospect_id_value := (outcome_input ->> 'prospectId')::uuid;
    sample_id_value := (outcome_input ->> 'sampleId')::uuid;
    if result_count_value not between 1 and 5
      or prospect_id_value is null or sample_id_value is null
      or not exists (
        select 1 from public.managed_profile_samples sample
        where sample.id = sample_id_value
          and sample.prospect_id = prospect_id_value
      )
    then
      raise exception 'Invalid managed profile search completion'
        using errcode = '22023', detail = 'INVALID_INPUT';
    end if;
    update public.managed_profile_search_requests current
    set state = 'succeeded', result_count = result_count_value,
      prospect_id = prospect_id_value, sample_id = sample_id_value,
      completed_at = now()
    where current.id = search_request.id;
  elsif outcome_state = 'failed' then
    if result_count_value not between 0 and 5
      or failure_code_value is null
      or failure_code_value !~ '^[A-Z0-9_]{2,80}$'
    then
      raise exception 'Invalid managed profile search failure'
        using errcode = '22023', detail = 'INVALID_INPUT';
    end if;
    update public.managed_profile_search_requests current
    set state = 'failed', result_count = result_count_value,
      failure_code = failure_code_value, completed_at = now()
    where current.id = search_request.id;
  else
    raise exception 'Invalid managed profile search outcome'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  return query select 'RECORDED', outcome_state;
end;
$$;

create or replace function public.save_managed_profile_sample(
  prospect_id_input uuid,
  subject_name_input text,
  sample_data_input jsonb,
  sources_input jsonb,
  agent_instance_name_input text,
  run_input jsonb,
  sample_fingerprint_input text,
  idempotency_key_input uuid
)
returns table(code text, sample_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  prospect public.outreach_prospects%rowtype;
  sample public.managed_profile_samples%rowtype;
  source_item jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('profile_research_agents')
    or not public.is_ecosystem_release_enabled('outreach_agent')
  then
    raise exception 'Managed profile agents are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if prospect_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(subject_name_input)) not between 2 and 100
    or jsonb_typeof(sample_data_input) <> 'object'
    or octet_length(sample_data_input::text) > 32768
    or jsonb_typeof(sources_input) <> 'array'
    or jsonb_array_length(sources_input) not between 1 and 12
    or agent_instance_name_input !~ '^[a-z0-9][a-z0-9-]{2,120}$'
    or sample_fingerprint_input !~ '^[0-9a-f]{64}$'
    or run_input ->> 'status' not in ('succeeded', 'fallback')
    or char_length(run_input ->> 'model') not between 2 and 160
    or char_length(run_input ->> 'promptVersion') not between 2 and 80
    or coalesce((run_input ->> 'durationMs')::integer, -1) not between 0 and 600000
  then
    raise exception 'Invalid managed profile sample'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select candidate.* into prospect
  from public.outreach_prospects candidate
  where candidate.id = prospect_id_input
  for update;
  if not found or prospect.status in (
    'declined', 'expired', 'withdrawn', 'suppressed', 'joined'
  ) then
    raise exception 'Prospect is unavailable'
      using errcode = 'P0002', detail = 'PROSPECT_UNAVAILABLE';
  end if;
  if prospect.suggested_role not in ('farmer', 'unknown') then
    raise exception 'The managed Farmer profile agent requires Farmer evidence'
      using errcode = '22023', detail = 'FARMER_ROLE_REQUIRED';
  end if;

  select existing.* into sample
  from public.managed_profile_samples existing
  where existing.creation_idempotency_key = idempotency_key_input
     or existing.prospect_id = prospect_id_input
  order by existing.created_at
  limit 1;
  if found then
    if sample.sample_fingerprint <> sample_fingerprint_input then
      raise exception 'Managed profile sample idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', sample.id, sample.revision;
    return;
  end if;

  insert into public.managed_profile_samples (
    prospect_id, created_by, subject_name, sample_data,
    agent_instance_name, sample_fingerprint, model, prompt_version,
    run_status, failure_code, duration_ms, creation_idempotency_key
  ) values (
    prospect.id, prospect.created_by, btrim(subject_name_input), sample_data_input,
    agent_instance_name_input, sample_fingerprint_input,
    run_input ->> 'model', run_input ->> 'promptVersion',
    run_input ->> 'status', nullif(run_input ->> 'failureCode', ''),
    (run_input ->> 'durationMs')::integer, idempotency_key_input
  ) returning * into sample;

  for source_item in
    select value from jsonb_array_elements(sources_input) item(value)
  loop
    if char_length(source_item ->> 'sourceUrl') not between 8 and 2048
      or source_item ->> 'sourceType' not in (
        'website', 'youtube', 'instagram', 'facebook', 'linkedin',
        'other_social', 'pasted_description', 'screenshot_ocr'
      )
      or char_length(source_item ->> 'sourceText') not between 2 and 8000
      or source_item ->> 'sourceHash' !~ '^[0-9a-f]{64}$'
      or (source_item ->> 'collectedAt')::timestamptz > now() + interval '5 minutes'
      or not (
        (
          source_item ->> 'discoveryProvider' is null
          and source_item ->> 'providerQueryHash' is null
          and source_item ->> 'usageRightsBasis' is null
        )
        or (
          source_item ->> 'discoveryProvider' = 'brave_search'
          and source_item ->> 'providerQueryHash' ~ '^[0-9a-f]{64}$'
          and source_item ->> 'usageRightsBasis' = 'provider_storage_plan'
        )
      )
    then
      raise exception 'Invalid managed profile source'
        using errcode = '22023', detail = 'INVALID_SOURCE';
    end if;
    insert into public.managed_profile_sample_sources (
      sample_id, source_url, source_type, source_title, source_excerpt,
      source_hash, discovery_provider, provider_query_hash,
      usage_rights_basis, collected_at
    ) values (
      sample.id, source_item ->> 'sourceUrl', source_item ->> 'sourceType',
      nullif(btrim(source_item ->> 'sourceTitle'), ''),
      source_item ->> 'sourceText', source_item ->> 'sourceHash',
      source_item ->> 'discoveryProvider',
      source_item ->> 'providerQueryHash',
      source_item ->> 'usageRightsBasis',
      (source_item ->> 'collectedAt')::timestamptz
    );
  end loop;

  insert into public.outreach_agent_runs (
    prospect_id, run_type, model, prompt_version, status,
    failure_code, duration_ms
  ) values (
    prospect.id, 'drafting', run_input ->> 'model',
    run_input ->> 'promptVersion', run_input ->> 'status',
    nullif(run_input ->> 'failureCode', ''),
    (run_input ->> 'durationMs')::integer
  );
  return query select 'CREATED', sample.id, sample.revision;
end;
$$;

create or replace function public.set_managed_profile_sample_workflow(
  sample_id_input uuid,
  workflow_id_input text,
  sample_fingerprint_input text
)
returns table(code text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare sample public.managed_profile_samples%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  select candidate.* into sample
  from public.managed_profile_samples candidate
  where candidate.id = sample_id_input
  for update;
  if not found or sample.sample_fingerprint <> sample_fingerprint_input
    or char_length(workflow_id_input) not between 1 and 160
  then
    raise exception 'Managed profile sample is unavailable'
      using errcode = 'P0002', detail = 'SAMPLE_UNAVAILABLE';
  end if;
  if sample.workflow_id is not null and sample.workflow_id <> workflow_id_input then
    raise exception 'Managed profile workflow conflict'
      using errcode = '22023', detail = 'WORKFLOW_CONFLICT';
  end if;
  update public.managed_profile_samples
  set workflow_id = workflow_id_input
  where id = sample.id;
  return query select
    case when sample.workflow_id is null then 'WORKFLOW_LINKED'
      else 'IDEMPOTENT_REPLAY' end,
    (select current.revision from public.managed_profile_samples current
      where current.id = sample.id);
end;
$$;

create or replace function public.attach_managed_profile_sample_preview(
  outbox_id_input uuid,
  token_input text
)
returns table(code text, message_body text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.outreach_invitations%rowtype;
  outbox public.outreach_outbox%rowtype;
  sample public.managed_profile_samples%rowtype;
  token_hash_value text;
  invitation_url text;
  preview_url text;
  message_value text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('profile_research_agents') then
    select current.message_body into message_value
    from public.outreach_outbox current where current.id = outbox_id_input;
    return query select 'FEATURE_DISABLED', message_value;
    return;
  end if;
  token_hash_value := encode(extensions.digest(token_input, 'sha256'), 'hex');
  select candidate.* into invitation
  from public.outreach_invitations candidate
  where candidate.source_outbox_id = outbox_id_input
    and candidate.token_hash = token_hash_value
  for update;
  if not found or invitation.expires_at <= now()
    or invitation.revoked_at is not null
  then
    raise exception 'Invitation is unavailable'
      using errcode = 'P0002', detail = 'INVITATION_UNAVAILABLE';
  end if;
  select candidate.* into outbox
  from public.outreach_outbox candidate
  where candidate.id = outbox_id_input
  for update;
  if not found
    or outbox.prospect_id <> invitation.prospect_id
    or outbox.purpose not in ('farmerbook_introduction', 'onboarding_followup')
    or outbox.state <> 'processing'
    or outbox.consent_id is null
    or not public.has_active_outreach_consent(
      outbox.prospect_id,
      outbox.consent_id,
      outbox.channel,
      outbox.purpose
    )
  then
    raise exception 'Active outreach consent is required'
      using errcode = '42501', detail = 'ACTIVE_CONSENT_REQUIRED';
  end if;
  select candidate.* into sample
  from public.managed_profile_samples candidate
  where candidate.prospect_id = invitation.prospect_id
    and candidate.state in ('draft_ready', 'approval_pending')
    and candidate.retention_expires_at > now()
  for update;
  if not found then
    return query select 'NO_SAMPLE', outbox.message_body;
    return;
  end if;
  invitation_url := (select prospect.application_origin
    from public.outreach_prospects prospect where prospect.id = invitation.prospect_id)
    || '/invite/' || token_input;
  preview_url := (select prospect.application_origin
    from public.outreach_prospects prospect where prospect.id = invitation.prospect_id)
    || '/profile-preview/' || token_input;
  message_value := replace(outbox.message_body, invitation_url, preview_url);
  if message_value = outbox.message_body then
    message_value := left(outbox.message_body, 760)
      || ' Review your private FarmerBook profile sample: ' || preview_url;
  end if;
  update public.outreach_outbox set message_body = message_value
  where id = outbox.id;
  update public.managed_profile_samples set state = 'approval_pending'
  where id = sample.id and state = 'draft_ready';
  return query select 'PREVIEW_ATTACHED', message_value;
end;
$$;

create or replace function public.get_managed_profile_sample_preview(
  token_hash_input text
)
returns table(
  sample_id uuid,
  subject_name text,
  sample_data jsonb,
  sample_state text,
  workflow_id text,
  agent_instance_name text,
  invitation_expires_at timestamptz
)
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
  if token_hash_input !~ '^[0-9a-f]{64}$'
    or not public.is_ecosystem_release_enabled('profile_research_agents')
  then
    return;
  end if;
  return query
    select sample.id, sample.subject_name, sample.sample_data, sample.state,
      sample.workflow_id, sample.agent_instance_name, invitation.expires_at
    from public.outreach_invitations invitation
    join public.managed_profile_samples sample
      on sample.prospect_id = invitation.prospect_id
    where invitation.token_hash = token_hash_input
      and invitation.expires_at > now()
      and invitation.redeemed_at is null
      and invitation.revoked_at is null
      and sample.retention_expires_at > now()
      and sample.state in ('approval_pending', 'approved');
end;
$$;

create or replace function public.decide_managed_profile_sample(
  token_hash_input text,
  decision_input text
)
returns table(
  code text,
  sample_id uuid,
  prospect_id uuid,
  workflow_id text,
  agent_instance_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.outreach_invitations%rowtype;
  sample public.managed_profile_samples%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if token_hash_input !~ '^[0-9a-f]{64}$'
    or decision_input not in ('approve', 'reject')
    or not public.is_ecosystem_release_enabled('profile_research_agents')
  then
    raise exception 'Invalid profile sample decision'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select candidate.* into invitation
  from public.outreach_invitations candidate
  where candidate.token_hash = token_hash_input
  for update;
  if not found or invitation.expires_at <= now()
    or invitation.redeemed_at is not null or invitation.revoked_at is not null
  then
    raise exception 'Invitation is unavailable'
      using errcode = 'P0002', detail = 'INVITATION_UNAVAILABLE';
  end if;
  select candidate.* into sample
  from public.managed_profile_samples candidate
  where candidate.prospect_id = invitation.prospect_id
  for update;
  if not found or sample.workflow_id is null
    or sample.retention_expires_at <= now()
  then
    raise exception 'Profile sample is unavailable'
      using errcode = 'P0002', detail = 'SAMPLE_UNAVAILABLE';
  end if;
  if decision_input = 'approve' then
    if sample.state = 'approved' then
      return query select 'IDEMPOTENT_REPLAY', sample.id, sample.prospect_id,
        sample.workflow_id, sample.agent_instance_name;
      return;
    end if;
    if sample.state <> 'approval_pending' then
      raise exception 'Profile sample cannot be approved'
        using errcode = '22023', detail = 'INVALID_STATE';
    end if;
    update public.managed_profile_samples
    set state = 'approved', approved_at = now()
    where id = sample.id;
    return query select 'APPROVED', sample.id, sample.prospect_id,
      sample.workflow_id, sample.agent_instance_name;
  else
    if sample.state = 'rejected' then
      return query select 'IDEMPOTENT_REPLAY', sample.id, sample.prospect_id,
        sample.workflow_id, sample.agent_instance_name;
      return;
    end if;
    if sample.state not in ('approval_pending', 'approved') then
      raise exception 'Profile sample cannot be rejected'
        using errcode = '22023', detail = 'INVALID_STATE';
    end if;
    update public.managed_profile_samples
    set state = 'rejected', approved_at = null, rejected_at = now(),
      sample_data = jsonb_build_object(
        'fullName', subject_name,
        'headline', 'Rejected private sample',
        'bio', 'The invitation holder rejected this draft.',
        'categorySlugs', '[]'::jsonb,
        'socialLinks', '{}'::jsonb,
        'claims', '[]'::jsonb,
        'limitations', jsonb_build_array('Rejected by the invitation holder.')
      )
    where id = sample.id;
    update public.outreach_invitations
    set revoked_at = now() where id = invitation.id;
    return query select 'REJECTED', sample.id, sample.prospect_id,
      sample.workflow_id, sample.agent_instance_name;
  end if;
end;
$$;

create or replace function public.link_approved_sample_after_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel_value text;
  contact_hash_value text;
  sample_data_value jsonb;
begin
  update public.managed_profile_samples sample
  set state = 'claimed', claimed_profile_id = new.profile_id, claimed_at = now()
  where sample.prospect_id = new.prospect_id
    and sample.state = 'approved'
    and sample.retention_expires_at > now()
  returning sample.sample_data into sample_data_value;
  if sample_data_value is not null then
    -- The invitation holder approved these fields, but the profile remains
    -- private and unverified until they finish onboarding. Preserve existing
    -- user-entered values and only copy values compatible with profile limits.
    update public.profiles profile
    set full_name = case
          when char_length(btrim(sample_data_value ->> 'fullName')) between 2 and 80
            then btrim(sample_data_value ->> 'fullName')
          else profile.full_name
        end,
        district = case
          when profile.district = ''
            and char_length(btrim(sample_data_value ->> 'district')) between 2 and 80
            then btrim(sample_data_value ->> 'district')
          else profile.district
        end,
        state = case
          when profile.state = ''
            and char_length(btrim(sample_data_value ->> 'state')) between 2 and 80
            then btrim(sample_data_value ->> 'state')
          else profile.state
        end,
        bio = case
          when profile.bio = ''
            and char_length(btrim(sample_data_value ->> 'bio')) between 2 and 500
            then btrim(sample_data_value ->> 'bio')
          else profile.bio
        end,
        experience_years = case
          when profile.experience_years is null
            and jsonb_typeof(sample_data_value -> 'experienceYears') = 'number'
            and (sample_data_value ->> 'experienceYears')::integer between 0 and 80
            then (sample_data_value ->> 'experienceYears')::integer
          else profile.experience_years
        end,
        farming_method = case
          when profile.account_role = 'farmer'
            and profile.farming_method is null
            and sample_data_value ->> 'farmingMethod' in (
              'organic', 'natural', 'conventional', 'mixed'
            )
            then sample_data_value ->> 'farmingMethod'
          else profile.farming_method
        end,
        website_url = case
          when profile.website_url is null
            and char_length(sample_data_value #>> '{socialLinks,website}') between 8 and 300
            and sample_data_value #>> '{socialLinks,website}' ~ '^https://'
            then sample_data_value #>> '{socialLinks,website}'
          else profile.website_url
        end,
        linkedin_url = case
          when profile.linkedin_url is null
            and char_length(sample_data_value #>> '{socialLinks,linkedin}') between 8 and 300
            and sample_data_value #>> '{socialLinks,linkedin}' ~ '^https://'
            then sample_data_value #>> '{socialLinks,linkedin}'
          else profile.linkedin_url
        end,
        instagram_url = case
          when profile.instagram_url is null
            and char_length(sample_data_value #>> '{socialLinks,instagram}') between 8 and 300
            and sample_data_value #>> '{socialLinks,instagram}' ~ '^https://'
            then sample_data_value #>> '{socialLinks,instagram}'
          else profile.instagram_url
        end,
        facebook_url = case
          when profile.facebook_url is null
            and char_length(sample_data_value #>> '{socialLinks,facebook}') between 8 and 300
            and sample_data_value #>> '{socialLinks,facebook}' ~ '^https://'
            then sample_data_value #>> '{socialLinks,facebook}'
          else profile.facebook_url
        end,
        youtube_url = case
          when profile.youtube_url is null
            and char_length(sample_data_value #>> '{socialLinks,youtube}') between 8 and 300
            and sample_data_value #>> '{socialLinks,youtube}' ~ '^https://'
            then sample_data_value #>> '{socialLinks,youtube}'
          else profile.youtube_url
        end
    where profile.id = new.profile_id;

    select consent.channel, contact.value_hash
      into channel_value, contact_hash_value
    from public.outreach_consents consent
    join public.outreach_contact_candidates contact
      on contact.id = consent.contact_candidate_id
    where consent.prospect_id = new.prospect_id
      and consent.purpose = 'farmerbook_introduction'
      and consent.withdrawn_at is null
      and consent.expires_at > now()
    order by consent.granted_at desc
    limit 1;
    if contact_hash_value is not null then
      insert into public.profile_verification_claims (
        profile_id, claim_type, state, method, provider, evidence_hash,
        scope, verified_at, expires_at
      ) values (
        new.profile_id, 'contact', 'verified',
        case channel_value when 'email' then 'email_link'
          when 'whatsapp' then 'whatsapp_link' else 'phone_otp' end,
        'farmerbook-consented-invitation', contact_hash_value,
        channel_value, now(), now() + interval '1 year'
      ) on conflict (profile_id, claim_type, lower(scope))
        where state in ('pending', 'verified')
      do update set state = 'verified', method = excluded.method,
        provider = excluded.provider, evidence_hash = excluded.evidence_hash,
        verified_at = excluded.verified_at, expires_at = excluded.expires_at,
        revoked_at = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger outreach_account_links_claim_approved_sample
after insert on public.outreach_account_links
for each row execute function public.link_approved_sample_after_invitation();

create or replace function public.get_claimed_managed_profile_sample()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select sample.sample_data
  from public.managed_profile_samples sample
  where sample.claimed_profile_id = (select auth.uid())
    and sample.state = 'claimed'
    and public.is_ecosystem_release_enabled('profile_research_agents')
  order by sample.claimed_at desc
  limit 1;
$$;

create or replace function public.record_profile_verification_claim(
  profile_id_input uuid,
  claim_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare claim_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if profile_id_input is null
    or claim_input ->> 'claimType' not in (
      'contact', 'farmer_role', 'identity', 'social_presence', 'organization'
    )
    or claim_input ->> 'state' not in ('pending', 'verified', 'rejected')
    or claim_input ->> 'method' not in (
      'email_link', 'phone_otp', 'whatsapp_link', 'social_oauth',
      'government_kyc', 'liveness_match', 'bank_name_match',
      'organization_registry', 'farmer_registry', 'community_vouch',
      'live_interview', 'service_area_evidence', 'transaction_history'
    )
    or char_length(claim_input ->> 'provider') not between 2 and 100
    or claim_input ->> 'evidenceHash' !~ '^[0-9a-f]{64}$'
  then
    raise exception 'Invalid verification claim'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  insert into public.profile_verification_claims (
    profile_id, claim_type, state, method, provider, evidence_hash,
    provider_receipt_id, scope, verified_at, expires_at
  ) values (
    profile_id_input, claim_input ->> 'claimType', claim_input ->> 'state',
    claim_input ->> 'method', claim_input ->> 'provider',
    claim_input ->> 'evidenceHash',
    nullif(claim_input ->> 'providerReceiptId', ''),
    coalesce(nullif(claim_input ->> 'scope', ''), 'default'),
    case when claim_input ->> 'state' = 'verified' then now() end,
    case when claim_input ->> 'expiresAt' is not null
      then (claim_input ->> 'expiresAt')::timestamptz end
  ) returning id into claim_id;
  if claim_input ->> 'claimType' = 'identity'
    and claim_input ->> 'state' = 'verified'
  then
    update public.profiles set verification_status = 'verified'
    where id = profile_id_input;
  end if;
  return claim_id;
end;
$$;

-- Enforce the product-owner-approved access levels when the private control is on.
create or replace function public.is_market_seller(user_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_profile_publish_produce(user_id_input);
$$;

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := (select auth.uid());
  low_id uuid;
  high_id uuid;
  result_id uuid;
begin
  if viewer_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', detail = 'AUTHENTICATION_REQUIRED';
  end if;
  if viewer_id = other_user_id then
    raise exception 'A direct conversation requires another participant'
      using errcode = '22023', detail = 'INVALID_RECIPIENT';
  end if;
  if not public.can_profile_message(viewer_id)
    or not public.is_active_user(other_user_id)
    or public.is_blocked(viewer_id, other_user_id)
  then
    raise exception 'Contact verification is required for messaging'
      using errcode = '42501', detail = 'CONTACT_VERIFICATION_REQUIRED';
  end if;
  low_id := least(viewer_id, other_user_id);
  high_id := greatest(viewer_id, other_user_id);
  perform pg_advisory_xact_lock(
    hashtextextended(low_id::text || ':' || high_id::text, 0)
  );
  select pair.conversation_id into result_id
  from public.direct_conversation_pairs pair
  where pair.user_low = low_id and pair.user_high = high_id;
  if result_id is null then
    insert into public.conversations default values returning id into result_id;
    insert into public.direct_conversation_pairs (
      conversation_id, user_low, user_high
    ) values (result_id, low_id, high_id);
    insert into public.conversation_members (conversation_id, user_id)
    values (result_id, viewer_id), (result_id, other_user_id);
  end if;
  return result_id;
end;
$$;

drop policy if exists "active participants create own posts" on public.posts;
create policy "active participants create rate limited own posts"
on public.posts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and public.can_create_rate_limited_post((select auth.uid()))
);

drop policy if exists "members send own messages" on public.messages;
create policy "contact verified members send own messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and public.can_profile_message((select auth.uid()))
  and public.can_access_conversation(conversation_id)
);

drop policy if exists "visitors send unlinked enquiries for active listings"
  on public.market_enquiries;
create policy "visitors send enquiries only before verification rollout"
on public.market_enquiries for insert to anon
with check (
  not public.is_ecosystem_release_enabled('profile_research_agents')
  and buyer_id is null
  and conversation_id is null
  and exists (
    select 1 from public.produce_listings listing
    where listing.id = market_enquiries.listing_id and listing.status = 'active'
  )
);

drop policy if exists "participants send valid marketplace enquiries"
  on public.market_enquiries;
create policy "contact verified participants send marketplace enquiries"
on public.market_enquiries for insert to authenticated
with check (
  (
    not public.is_ecosystem_release_enabled('profile_research_agents')
    and buyer_id is null
    and conversation_id is null
    and exists (
      select 1 from public.produce_listings listing
      where listing.id = market_enquiries.listing_id and listing.status = 'active'
    )
  )
  or (
    buyer_id = (select auth.uid())
    and public.can_profile_message((select auth.uid()))
    and public.is_valid_market_connection(listing_id, buyer_id, conversation_id)
  )
);

create view public.public_profile_verification_claims
with (security_barrier = true) as
select profile_id, claim_type, method, scope, verified_at, expires_at
from public.profile_verification_claims
where state = 'verified'
  and verified_at <= now()
  and (expires_at is null or expires_at > now())
  and revoked_at is null;

alter table public.managed_profile_samples enable row level security;
alter table public.managed_profile_sample_sources enable row level security;
alter table public.managed_profile_search_requests enable row level security;
alter table public.profile_verification_claims enable row level security;

create policy "participants read own verification claims"
on public.profile_verification_claims for select to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());
create policy "service manages profile verification claims"
on public.profile_verification_claims for all to service_role
using (true) with check (true);
create policy "service manages private profile samples"
on public.managed_profile_samples for all to service_role
using (true) with check (true);
create policy "service manages private profile sample sources"
on public.managed_profile_sample_sources for all to service_role
using (true) with check (true);
create policy "service manages private profile search requests"
on public.managed_profile_search_requests for all to service_role
using (true) with check (true);

revoke all on public.managed_profile_samples,
  public.managed_profile_sample_sources,
  public.managed_profile_search_requests,
  public.profile_verification_claims
from public, anon, authenticated;
grant all on public.managed_profile_samples,
  public.managed_profile_sample_sources,
  public.managed_profile_search_requests,
  public.profile_verification_claims
to service_role;
grant select on public.profile_verification_claims to authenticated;
grant select on public.public_profile_verification_claims to anon, authenticated;

revoke all on function public.managed_profile_sample_set_updated_at()
  from public, anon, authenticated;
revoke all on function public.has_current_profile_verification(uuid, text)
  from public, anon, authenticated;
grant execute on function public.has_current_profile_verification(uuid, text)
  to anon, authenticated, service_role;
revoke all on function public.can_profile_message(uuid)
  from public, anon, authenticated;
grant execute on function public.can_profile_message(uuid)
  to anon, authenticated, service_role;
revoke all on function public.can_profile_publish_produce(uuid)
  from public, anon, authenticated;
grant execute on function public.can_profile_publish_produce(uuid)
  to anon, authenticated, service_role;
revoke all on function public.can_create_rate_limited_post(uuid)
  from public, anon, authenticated;
grant execute on function public.can_create_rate_limited_post(uuid)
  to authenticated, service_role;
revoke all on function public.reserve_managed_profile_search(text, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_managed_profile_search(text, uuid)
  to authenticated;
revoke all on function public.complete_managed_profile_search(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_managed_profile_search(uuid, jsonb)
  to authenticated;
revoke all on function public.save_managed_profile_sample(
  uuid, text, jsonb, jsonb, text, jsonb, text, uuid
) from public, anon, authenticated;
grant execute on function public.save_managed_profile_sample(
  uuid, text, jsonb, jsonb, text, jsonb, text, uuid
) to service_role;
revoke all on function public.set_managed_profile_sample_workflow(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_managed_profile_sample_workflow(uuid, text, text)
  to service_role;
revoke all on function public.attach_managed_profile_sample_preview(uuid, text)
  from public, anon, authenticated;
grant execute on function public.attach_managed_profile_sample_preview(uuid, text)
  to service_role;
revoke all on function public.get_managed_profile_sample_preview(text)
  from public, anon, authenticated;
grant execute on function public.get_managed_profile_sample_preview(text)
  to service_role;
revoke all on function public.decide_managed_profile_sample(text, text)
  from public, anon, authenticated;
grant execute on function public.decide_managed_profile_sample(text, text)
  to service_role;
revoke all on function public.link_approved_sample_after_invitation()
  from public, anon, authenticated;
revoke all on function public.get_claimed_managed_profile_sample()
  from public, anon, authenticated;
grant execute on function public.get_claimed_managed_profile_sample()
  to authenticated;
revoke all on function public.record_profile_verification_claim(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_profile_verification_claim(uuid, jsonb)
  to service_role;
revoke all on function public.get_or_create_direct_conversation(uuid)
  from public, anon, authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid)
  to authenticated;
