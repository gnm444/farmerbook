-- Consent-first autonomous acquisition and onboarding. Public descriptions and
-- contact values are never treated as consent. Introduction/follow-up outbox
-- rows require a current channel- and purpose-matched receipt; the only
-- pre-consent exception is the bounded verified-provider confirmation request.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('outreach_agent', false)
on conflict (control_key) do nothing;

create table public.outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  normalized_source_url text not null
    check (char_length(normalized_source_url) between 8 and 2048),
  application_origin text not null check (char_length(application_origin) between 8 and 300),
  source_type text not null check (source_type in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin',
    'other_social', 'unsupported', 'inbound_form', 'google_lead_form'
  )),
  source_title text check (source_title is null or char_length(source_title) between 1 and 180),
  source_excerpt text check (source_excerpt is null or char_length(source_excerpt) between 1 and 8000),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  business_name text check (business_name is null or char_length(business_name) between 2 and 120),
  operator_context text check (operator_context is null or char_length(operator_context) between 2 and 8000),
  status text not null default 'discovered' check (status in (
    'discovered', 'consent_blocked', 'consent_requested', 'consented',
    'qualified', 'introduction_queued', 'introduced', 'onboarding',
    'joined', 'declined', 'expired', 'withdrawn', 'suppressed'
  )),
  suggested_role text not null default 'unknown' check (suggested_role in (
    'farmer', 'customer', 'wholesaler', 'agri_business', 'unknown'
  )),
  preferred_locale text not null default 'en-IN'
    references public.supported_locales (locale_code),
  category_slugs text[] not null default '{}'
    check (cardinality(category_slugs) <= 8),
  rationale text check (rationale is null or char_length(rationale) between 2 and 600),
  introduction_draft text
    check (introduction_draft is null or char_length(introduction_draft) between 20 and 1500),
  consent_channel text check (consent_channel is null or consent_channel in ('email', 'sms', 'whatsapp')),
  consent_granted_at timestamptz,
  consent_withdrawn_at timestamptz,
  followup_requested boolean not null default false,
  next_action_at timestamptz,
  retention_expires_at timestamptz not null default (now() + interval '90 days'),
  revision integer not null default 0 check (revision >= 0),
  creation_idempotency_key uuid not null unique,
  creation_fingerprint text not null check (creation_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (consent_withdrawn_at is null or consent_granted_at is not null),
  check (retention_expires_at > created_at)
);

create table public.outreach_contact_candidates (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  channel text not null check (channel in ('email', 'phone')),
  private_value text not null check (char_length(private_value) between 5 and 254),
  value_hash text not null check (value_hash ~ '^[0-9a-f]{64}$'),
  source_url text not null check (char_length(source_url) between 8 and 2048),
  evidence_excerpt text not null check (char_length(evidence_excerpt) between 2 and 500),
  evidence_origin text not null check (evidence_origin in (
    'website', 'pasted_description', 'screenshot_ocr', 'inbound_form',
    'google_lead_form'
  )),
  explicitly_for_business_enquiries boolean not null default false,
  business_contact_confirmed boolean not null default false,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (prospect_id, value_hash),
  check (
    (
      business_contact_confirmed
      and confirmed_at is not null
      and (
        confirmed_by is not null
        or evidence_origin in ('inbound_form', 'google_lead_form')
      )
    )
    or (not business_contact_confirmed and confirmed_by is null and confirmed_at is null)
  )
);

create table public.outreach_consents (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  contact_candidate_id uuid not null
    references public.outreach_contact_candidates (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  purpose text not null check (purpose in (
    'farmerbook_introduction', 'onboarding_followup'
  )),
  statement_version text not null check (char_length(statement_version) between 3 and 80),
  statement_text text not null check (char_length(statement_text) between 20 and 2000),
  capture_method text not null check (capture_method in (
    'farmerbook_form', 'google_lead_form', 'registered_dca', 'double_opt_in',
    'verified_provider'
  )),
  provider text not null check (char_length(provider) between 2 and 80),
  provider_receipt_id text not null check (char_length(provider_receipt_id) between 1 and 300),
  granted_at timestamptz not null,
  expires_at timestamptz not null,
  withdrawn_at timestamptz,
  withdrawal_reason text check (
    withdrawal_reason is null or char_length(withdrawal_reason) between 2 and 500
  ),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  check (expires_at > granted_at),
  check (withdrawn_at is null or withdrawn_at >= granted_at),
  unique (prospect_id, channel, purpose, provider_receipt_id)
);

create table public.outreach_outbox (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  contact_candidate_id uuid not null
    references public.outreach_contact_candidates (id) on delete cascade,
  consent_id uuid references public.outreach_consents (id) on delete restrict,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  purpose text not null check (purpose in (
    'farmerbook_introduction', 'onboarding_followup', 'consent_confirmation'
  )),
  message_body text not null check (char_length(message_body) between 20 and 2000),
  state text not null default 'pending' check (state in (
    'pending', 'processing', 'delivered', 'cancelled', 'failed'
  )),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  not_before timestamptz not null default now(),
  expires_at timestamptz not null,
  locked_at timestamptz,
  delivered_at timestamptz,
  provider text,
  provider_receipt_id text,
  last_failure_code text check (
    last_failure_code is null or last_failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (delivered_at is null or state = 'delivered'),
  check (
    (provider_receipt_id is null and delivered_at is null)
    or provider is not null
  ),
  unique (consent_id, purpose)
);

create table public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  actor_id uuid,
  event_type text not null check (event_type in (
    'prospect_created', 'evidence_recorded', 'consent_blocked',
    'consent_requested', 'consent_granted', 'consent_withdrawn',
    'qualified', 'introduction_queued', 'delivered', 'delivery_failed',
    'followup_queued', 'onboarding_started', 'joined', 'declined', 'expired', 'suppressed',
    'deleted'
  )),
  previous_status text,
  new_status text,
  note text check (note is null or char_length(note) between 2 and 500),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create table public.outreach_suppressions (
  value_hash text primary key check (value_hash ~ '^[0-9a-f]{64}$'),
  source_identity_hash text check (
    source_identity_hash is null or source_identity_hash ~ '^[0-9a-f]{64}$'
  ),
  reason text not null check (reason in (
    'withdrawn', 'declined', 'complaint', 'hard_bounce', 'administrator'
  )),
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table public.outreach_agent_runs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.outreach_prospects (id) on delete set null,
  run_type text not null check (run_type in ('ocr', 'qualification', 'drafting', 'delivery')),
  model text check (model is null or char_length(model) between 2 and 160),
  prompt_version text check (prompt_version is null or char_length(prompt_version) between 2 and 80),
  status text not null check (status in ('succeeded', 'failed', 'fallback')),
  failure_code text check (failure_code is null or failure_code ~ '^[A-Z0-9_]{2,80}$'),
  input_units integer check (input_units is null or input_units >= 0),
  output_units integer check (output_units is null or output_units >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now()
);

create index outreach_prospects_status_next_action_idx
  on public.outreach_prospects (status, next_action_at)
  where status in ('consented', 'qualified', 'introduction_queued', 'onboarding');
create index outreach_prospects_retention_idx
  on public.outreach_prospects (retention_expires_at);
create unique index outreach_prospects_external_source_url_idx
  on public.outreach_prospects (normalized_source_url)
  where source_type in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin',
    'other_social', 'unsupported'
  );
create index outreach_contact_value_hash_idx
  on public.outreach_contact_candidates (value_hash);
create index outreach_consents_active_idx
  on public.outreach_consents (prospect_id, channel, purpose, expires_at)
  where withdrawn_at is null;
create index outreach_outbox_claim_idx
  on public.outreach_outbox (not_before, created_at)
  where state = 'pending';
create index outreach_events_prospect_created_idx
  on public.outreach_events (prospect_id, created_at desc);

create or replace function public.outreach_set_updated_at_and_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_table_name = 'outreach_prospects' then
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;

create trigger outreach_prospects_set_updated_at_and_revision
before update on public.outreach_prospects
for each row execute function public.outreach_set_updated_at_and_revision();
create trigger outreach_outbox_set_updated_at
before update on public.outreach_outbox
for each row execute function public.set_updated_at();

create or replace function public.prevent_outreach_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Outreach audit events are immutable' using errcode = '42501';
end;
$$;

create trigger outreach_events_are_immutable
before update or delete on public.outreach_events
for each row execute function public.prevent_outreach_event_mutation();

create or replace function public.sha256_normalized_contact(value_input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(extensions.digest(lower(regexp_replace(btrim(value_input), '[[:space:]-]+', '', 'g')), 'sha256'), 'hex');
$$;

create or replace function public.has_active_outreach_consent(
  prospect_id_input uuid,
  consent_id_input uuid,
  channel_input text,
  purpose_input text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.outreach_consents consent
    where consent.id = consent_id_input
      and consent.prospect_id = prospect_id_input
      and consent.channel = channel_input
      and consent.purpose = purpose_input
      and consent.granted_at <= now()
      and consent.expires_at > now()
      and consent.withdrawn_at is null
      and not exists (
        select 1
        from public.outreach_contact_candidates contact
        join public.outreach_suppressions suppression
          on suppression.value_hash = contact.value_hash
        where contact.id = consent.contact_candidate_id
      )
  );
$$;

create or replace function public.validate_outreach_outbox_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.purpose = 'consent_confirmation' then
    if new.consent_id is not null or not exists (
      select 1
      from public.outreach_contact_candidates contact
      where contact.id = new.contact_candidate_id
        and contact.prospect_id = new.prospect_id
        and not exists (
          select 1 from public.outreach_suppressions suppression
          where suppression.value_hash = contact.value_hash
        )
    ) then
      raise exception 'Consent confirmation target is invalid'
        using errcode = '42501', detail = 'CONSENT_TARGET_INVALID';
    end if;
  elsif new.consent_id is null or not public.has_active_outreach_consent(
      new.prospect_id,
      new.consent_id,
      new.channel,
      new.purpose
    ) then
      raise exception 'Active consent is required'
        using errcode = '42501', detail = 'CONSENT_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger outreach_outbox_requires_consent
before insert or update of consent_id, channel, purpose, state
on public.outreach_outbox
for each row when (new.state in ('pending', 'processing', 'delivered'))
execute function public.validate_outreach_outbox_consent();

create or replace function public.create_outreach_prospect(
  prospect_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, prospect_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  created_id uuid;
  existing_record public.outreach_prospects%rowtype;
  source_url_value text := btrim(prospect_input ->> 'sourceUrl');
  source_hash_value text := prospect_input ->> 'sourceHash';
  source_type_value text := prospect_input ->> 'sourceType';
  application_origin_value text := rtrim(prospect_input ->> 'applicationOrigin', '/');
  role_value text := coalesce(prospect_input ->> 'suggestedRole', 'unknown');
  locale_value text := coalesce(prospect_input ->> 'preferredLocale', 'en-IN');
  category_values text[];
  contact_item jsonb;
  run_item jsonb;
  contact_value text;
  contact_hash text;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if idempotency_key_input is null or jsonb_typeof(prospect_input) <> 'object' then
    raise exception 'Invalid prospect input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select prospect.* into existing_record
  from public.outreach_prospects prospect
  where prospect.creation_idempotency_key = idempotency_key_input;
  if found then
    if existing_record.creation_fingerprint <> source_hash_value then
      raise exception 'Idempotency key is bound to another prospect input'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing_record.id, existing_record.revision;
    return;
  end if;

  if source_type_value not in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin',
    'other_social', 'unsupported'
  ) or source_url_value is null or char_length(source_url_value) not between 8 and 2048
    or not (
      application_origin_value ~ '^https://[A-Za-z0-9.-]+(?::443)?$'
      or application_origin_value ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]{2,5})?$'
    )
    or source_hash_value !~ '^[0-9a-f]{64}$'
    or role_value not in ('farmer', 'customer', 'wholesaler', 'agri_business', 'unknown')
    or not exists (
      select 1 from public.supported_locales locale
      where locale.locale_code = locale_value
    )
  then
    raise exception 'Invalid prospect input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select coalesce(array_agg(distinct value), '{}') into category_values
  from jsonb_array_elements_text(coalesce(prospect_input -> 'categorySlugs', '[]'::jsonb)) item(value);
  if cardinality(category_values) > 8 or exists (
    select 1 from unnest(category_values) category_slug
    where not exists (
      select 1 from public.agriculture_categories category
      where category.slug = category_slug and category.active
    )
  ) then
    raise exception 'Invalid agriculture categories'
      using errcode = '22023', detail = 'INVALID_CATEGORIES';
  end if;

  insert into public.outreach_prospects (
    created_by, normalized_source_url, application_origin, source_type, source_title,
    source_excerpt, source_hash, business_name, operator_context, status,
    suggested_role, preferred_locale, category_slugs, rationale,
    introduction_draft, creation_idempotency_key, creation_fingerprint
  ) values (
    actor_id, source_url_value, application_origin_value, source_type_value,
    nullif(btrim(prospect_input ->> 'sourceTitle'), ''),
    nullif(btrim(prospect_input ->> 'sourceExcerpt'), ''),
    source_hash_value,
    nullif(btrim(prospect_input ->> 'businessName'), ''),
    nullif(btrim(prospect_input ->> 'operatorContext'), ''),
    case
      when coalesce((prospect_input ->> 'contactReady')::boolean, false)
        then 'discovered'
      else 'consent_blocked'
    end,
    role_value, locale_value, category_values,
    nullif(btrim(prospect_input ->> 'rationale'), ''),
    nullif(btrim(prospect_input ->> 'introductionDraft'), ''),
    idempotency_key_input, source_hash_value
  )
  on conflict (normalized_source_url) where source_type in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin',
    'other_social', 'unsupported'
  ) do update set
    source_title = excluded.source_title,
    source_excerpt = excluded.source_excerpt,
    source_hash = excluded.source_hash,
    business_name = coalesce(excluded.business_name, public.outreach_prospects.business_name),
    operator_context = excluded.operator_context,
    suggested_role = excluded.suggested_role,
    preferred_locale = excluded.preferred_locale,
    category_slugs = excluded.category_slugs,
    rationale = excluded.rationale,
    introduction_draft = excluded.introduction_draft
  returning id into created_id;

  for contact_item in
    select value
    from jsonb_array_elements(coalesce(prospect_input -> 'contactCandidates', '[]'::jsonb)) item(value)
    limit 8
  loop
    contact_value := btrim(contact_item ->> 'normalizedValue');
    contact_hash := public.sha256_normalized_contact(contact_value);
    if contact_value is null
      or contact_item ->> 'channel' not in ('email', 'phone')
      or char_length(contact_value) not between 5 and 254
      or contact_item ->> 'evidenceOrigin' not in (
        'website', 'pasted_description', 'screenshot_ocr'
      )
      or char_length(btrim(contact_item ->> 'sourceUrl')) not between 8 and 2048
      or char_length(btrim(contact_item ->> 'evidenceExcerpt')) not between 2 and 500
    then
      raise exception 'Invalid contact evidence'
        using errcode = '22023', detail = 'INVALID_CONTACT_EVIDENCE';
    end if;
    if not exists (
      select 1 from public.outreach_suppressions suppression
      where suppression.value_hash = contact_hash
    ) then
      insert into public.outreach_contact_candidates (
        prospect_id, channel, private_value, value_hash, source_url,
        evidence_excerpt, evidence_origin, explicitly_for_business_enquiries
      ) values (
        created_id, contact_item ->> 'channel', contact_value, contact_hash,
        btrim(contact_item ->> 'sourceUrl'),
        btrim(contact_item ->> 'evidenceExcerpt'),
        contact_item ->> 'evidenceOrigin',
        coalesce((contact_item ->> 'explicitlyForBusinessEnquiries')::boolean, false)
      )
      on conflict (prospect_id, value_hash) do update set
        evidence_excerpt = excluded.evidence_excerpt,
        explicitly_for_business_enquiries = excluded.explicitly_for_business_enquiries;
    end if;
  end loop;

  insert into public.outreach_events (
    prospect_id, actor_id, event_type, new_status, idempotency_key
  ) values (
    created_id, actor_id, 'prospect_created',
    (select status from public.outreach_prospects where id = created_id),
    idempotency_key_input
  ) on conflict (idempotency_key) do nothing;

  for run_item in
    select value
    from jsonb_array_elements(coalesce(prospect_input -> 'agentRuns', '[]'::jsonb)) item(value)
    limit 4
  loop
    if run_item ->> 'runType' not in ('ocr', 'qualification', 'drafting')
      or run_item ->> 'status' not in ('succeeded', 'failed', 'fallback')
      or char_length(run_item ->> 'model') not between 2 and 160
      or char_length(run_item ->> 'promptVersion') not between 2 and 80
      or coalesce((run_item ->> 'durationMs')::integer, -1) not between 0 and 600000
      or (
        run_item ->> 'failureCode' is not null
        and run_item ->> 'failureCode' !~ '^[A-Z0-9_]{2,80}$'
      )
    then
      raise exception 'Invalid redacted agent run'
        using errcode = '22023', detail = 'INVALID_AGENT_RUN';
    end if;
    insert into public.outreach_agent_runs (
      prospect_id, run_type, model, prompt_version, status, failure_code,
      duration_ms
    ) values (
      created_id, run_item ->> 'runType', run_item ->> 'model',
      run_item ->> 'promptVersion', run_item ->> 'status',
      nullif(run_item ->> 'failureCode', ''),
      (run_item ->> 'durationMs')::integer
    );
  end loop;

  return query
    select 'CREATED', prospect.id, prospect.revision
    from public.outreach_prospects prospect where prospect.id = created_id;
end;
$$;

create or replace function public.list_outreach_prospects(limit_input integer default 50)
returns table(
  id uuid,
  source_url text,
  source_type text,
  business_name text,
  status text,
  suggested_role text,
  preferred_locale text,
  category_slugs text[],
  introduction_draft text,
  consent_channel text,
  consent_granted_at timestamptz,
  consent_withdrawn_at timestamptz,
  retention_expires_at timestamptz,
  revision integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  return query
  select prospect.id, prospect.normalized_source_url, prospect.source_type,
    prospect.business_name, prospect.status, prospect.suggested_role,
    prospect.preferred_locale, prospect.category_slugs,
    prospect.introduction_draft, prospect.consent_channel,
    prospect.consent_granted_at, prospect.consent_withdrawn_at,
    prospect.retention_expires_at, prospect.revision,
    prospect.created_at, prospect.updated_at
  from public.outreach_prospects prospect
  order by prospect.created_at desc
  limit least(greatest(coalesce(limit_input, 50), 1), 100);
end;
$$;

create or replace function public.outreach_dashboard_summary()
returns table(status text, prospect_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  return query
    select prospect.status, count(*)
    from public.outreach_prospects prospect
    group by prospect.status;
end;
$$;

create or replace function public.submit_outreach_consent_lead(
  lead_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, prospect_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
  contact_id uuid;
  contact_value text := coalesce(lead_input ->> 'email', lead_input ->> 'phone');
  contact_channel text := lead_input ->> 'preferredChannel';
  contact_hash text;
  source_url_value text := lead_input ->> 'sourceUrl';
  application_origin_value text := rtrim(lead_input ->> 'applicationOrigin', '/');
  fingerprint_value text := lead_input ->> 'inputFingerprint';
  stored_fingerprint text;
  duplicate_prospect_id uuid;
  duplicate_status text;
  existing_lead public.outreach_prospects%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if idempotency_key_input is null
    or jsonb_typeof(lead_input) <> 'object'
    or fingerprint_value !~ '^[0-9a-f]{64}$'
    or char_length(btrim(source_url_value)) not between 8 and 2048
    or char_length(application_origin_value) not between 8 and 300
    or not (
      application_origin_value ~ '^https://[A-Za-z0-9.-]+(?::443)?$'
      or application_origin_value ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]{2,5})?$'
    )
    or coalesce(lead_input ->> 'sourceType', 'inbound_form') not in (
      'inbound_form', 'google_lead_form'
    )
    or char_length(btrim(lead_input ->> 'fullName')) not between 2 and 100
    or lead_input ->> 'role' not in (
      'farmer', 'customer', 'wholesaler', 'agri_business'
    )
    or not public.is_india_state_or_union_territory(lead_input ->> 'state')
    or char_length(btrim(lead_input ->> 'district')) not between 2 and 100
    or not exists (
      select 1 from public.supported_locales locale
      where locale.locale_code = coalesce(lead_input ->> 'preferredLocale', 'en-IN')
        and locale.enabled
    )
    or contact_channel not in ('email', 'sms', 'whatsapp')
    or nullif(btrim(contact_value), '') is null
    or (
      contact_channel = 'email'
      and btrim(contact_value) !~* '^[A-Z0-9._%+''-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    )
    or (
      contact_channel in ('sms', 'whatsapp')
      and btrim(contact_value) !~ '^\+91[6-9][0-9]{9}$'
    )
    or coalesce((lead_input ->> 'introductionConsent')::boolean, false) is not true
    or lead_input ->> 'consentPolicyVersion' <> '2026-08-09.1'
    or char_length(btrim(lead_input ->> 'introductionDraft')) not between 20 and 1500
    or position(
      application_origin_value || '/signup'
      in lead_input ->> 'introductionDraft'
    ) = 0
  then
    raise exception 'Invalid consent lead'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select prospect.* into existing_lead
  from public.outreach_prospects prospect
  where prospect.creation_idempotency_key = idempotency_key_input;
  if found then
    if existing_lead.creation_fingerprint <> fingerprint_value then
      raise exception 'Idempotency key is bound to another consent request'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing_lead.id, existing_lead.status;
    return;
  end if;

  contact_hash := public.sha256_normalized_contact(contact_value);
  if exists (
    select 1 from public.outreach_suppressions suppression
    where suppression.value_hash = contact_hash
  ) then
    raise exception 'Contact is suppressed'
      using errcode = '42501', detail = 'CONTACT_SUPPRESSED';
  end if;

  select prospect.id, prospect.status into duplicate_prospect_id, duplicate_status
  from public.outreach_contact_candidates candidate
  join public.outreach_prospects prospect on prospect.id = candidate.prospect_id
  where candidate.value_hash = contact_hash
    and candidate.evidence_origin in ('inbound_form', 'google_lead_form')
    and prospect.created_at > now() - interval '24 hours'
    and prospect.status not in ('withdrawn', 'suppressed', 'declined', 'expired')
  order by prospect.created_at desc
  limit 1;
  if found then
    return query select 'DUPLICATE_PENDING', duplicate_prospect_id, duplicate_status;
    return;
  end if;

  insert into public.outreach_prospects (
    normalized_source_url, application_origin, source_type, source_hash, business_name,
    operator_context, status, suggested_role, preferred_locale,
    introduction_draft, consent_channel, followup_requested,
    creation_idempotency_key,
    creation_fingerprint
  ) values (
    source_url_value,
    application_origin_value,
    coalesce(lead_input ->> 'sourceType', 'inbound_form'),
    encode(extensions.digest(source_url_value, 'sha256'), 'hex'),
    nullif(btrim(lead_input ->> 'businessName'), ''),
    left(concat_ws(' | ', lead_input ->> 'fullName', lead_input ->> 'state', lead_input ->> 'district'), 8000),
    'consent_requested',
    lead_input ->> 'role',
    coalesce(lead_input ->> 'preferredLocale', 'en-IN'),
    btrim(lead_input ->> 'introductionDraft'),
    contact_channel,
    coalesce((lead_input ->> 'followupConsent')::boolean, false),
    idempotency_key_input,
    fingerprint_value
  )
  on conflict (creation_idempotency_key) do update set
    updated_at = public.outreach_prospects.updated_at
  returning id, creation_fingerprint into created_id, stored_fingerprint;

  if stored_fingerprint <> fingerprint_value then
    raise exception 'Idempotency key is bound to another consent request'
      using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
  end if;

  insert into public.outreach_contact_candidates (
    prospect_id, channel, private_value, value_hash, source_url,
    evidence_excerpt, evidence_origin, explicitly_for_business_enquiries,
    business_contact_confirmed, confirmed_at
  ) values (
    created_id,
    case when contact_channel = 'email' then 'email' else 'phone' end,
    contact_value, contact_hash, source_url_value,
    'Contact supplied directly through a FarmerBook consent form.',
    coalesce(lead_input ->> 'sourceType', 'inbound_form'),
    true, true, now()
  )
  on conflict (prospect_id, value_hash) do update set
    private_value = excluded.private_value
  returning id into contact_id;

  insert into public.outreach_events (
    prospect_id, event_type, new_status, note, idempotency_key
  ) values (
    created_id, 'consent_requested', 'consent_requested',
    'Consent form received; verified confirmation is still required.',
    idempotency_key_input
  ) on conflict (idempotency_key) do nothing;

  insert into public.outreach_outbox (
    prospect_id, contact_candidate_id, channel, purpose, message_body,
    expires_at, idempotency_key
  ) values (
    created_id, contact_id, contact_channel, 'consent_confirmation',
    'FarmerBook received your request. Confirm through the verified provider before FarmerBook sends an introduction.',
    now() + interval '48 hours', idempotency_key_input
  ) on conflict (idempotency_key) do nothing;

  return query select 'CONSENT_PENDING', created_id, 'consent_requested';
end;
$$;

create or replace function public.record_verified_outreach_consent(
  prospect_id_input uuid,
  receipt_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, consent_id uuid, outbox_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact public.outreach_contact_candidates%rowtype;
  created_consent_id uuid;
  created_outbox_id uuid;
  purpose_value text := coalesce(receipt_input ->> 'purpose', 'farmerbook_introduction');
  channel_value text := receipt_input ->> 'channel';
  granted_value timestamptz := (receipt_input ->> 'grantedAt')::timestamptz;
  expires_value timestamptz := (receipt_input ->> 'expiresAt')::timestamptz;
  previous_status_value text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  select candidate.* into contact
  from public.outreach_contact_candidates candidate
  where candidate.prospect_id = prospect_id_input
    and candidate.id = (receipt_input ->> 'contactCandidateId')::uuid
    and candidate.value_hash = receipt_input ->> 'contactHash'
  for update;
  if not found then
    raise exception 'Prospect contact not found'
      using errcode = 'P0002', detail = 'CONTACT_NOT_FOUND';
  end if;
  if channel_value not in ('email', 'sms', 'whatsapp')
    or purpose_value not in ('farmerbook_introduction', 'onboarding_followup')
    or granted_value is null
    or granted_value < now() - interval '30 days'
    or granted_value > now() + interval '5 minutes'
    or expires_value <= greatest(granted_value, now())
    or expires_value > granted_value + interval '365 days'
    or nullif(receipt_input ->> 'providerReceiptId', '') is null
    or not (
      (contact.channel = 'email' and channel_value = 'email')
      or (contact.channel = 'phone' and channel_value in ('sms', 'whatsapp'))
    )
  then
    raise exception 'Invalid consent receipt'
      using errcode = '22023', detail = 'INVALID_CONSENT_RECEIPT';
  end if;
  if exists (
    select 1 from public.outreach_suppressions suppression
    where suppression.value_hash = contact.value_hash
  ) then
    raise exception 'Contact is suppressed'
      using errcode = '42501', detail = 'CONTACT_SUPPRESSED';
  end if;

  select consent.id, outbox.id into created_consent_id, created_outbox_id
  from public.outreach_consents consent
  left join public.outreach_outbox outbox
    on outbox.consent_id = consent.id and outbox.purpose = consent.purpose
  where consent.prospect_id = prospect_id_input
    and consent.contact_candidate_id = contact.id
    and consent.channel = channel_value
    and consent.purpose = purpose_value
    and consent.withdrawn_at is null
    and consent.expires_at > now()
  order by consent.granted_at desc
  limit 1;
  if found then
    return query select 'CONSENT_ALREADY_ACTIVE', created_consent_id, created_outbox_id;
    return;
  end if;

  insert into public.outreach_consents (
    prospect_id, contact_candidate_id, channel, purpose,
    statement_version, statement_text, capture_method, provider,
    provider_receipt_id, granted_at, expires_at, idempotency_key
  ) values (
    prospect_id_input, contact.id, channel_value, purpose_value,
    receipt_input ->> 'statementVersion', receipt_input ->> 'statementText',
    receipt_input ->> 'captureMethod', receipt_input ->> 'provider',
    receipt_input ->> 'providerReceiptId', granted_value, expires_value,
    idempotency_key_input
  )
  on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning id into created_consent_id;

  select prospect.status into previous_status_value
  from public.outreach_prospects prospect
  where prospect.id = prospect_id_input;

  update public.outreach_prospects
  set status = case
        when purpose_value = 'farmerbook_introduction' then 'consented'
        else status
      end,
    consent_channel = channel_value,
    consent_granted_at = granted_value, consent_withdrawn_at = null,
    next_action_at = now()
  where id = prospect_id_input;

  if purpose_value = 'farmerbook_introduction' then
    insert into public.outreach_outbox (
      prospect_id, contact_candidate_id, consent_id, channel, purpose, message_body,
      expires_at, idempotency_key
    )
    select prospect.id, contact.id, created_consent_id, channel_value, purpose_value,
      prospect.introduction_draft, least(expires_value, now() + interval '7 days'),
      gen_random_uuid()
    from public.outreach_prospects prospect
    where prospect.id = prospect_id_input
      and prospect.introduction_draft is not null
    on conflict on constraint outreach_outbox_consent_id_purpose_key
    do update set consent_id = excluded.consent_id
    returning id into created_outbox_id;

    if created_outbox_id is not null then
      update public.outreach_prospects
      set status = 'introduction_queued'
      where id = prospect_id_input;
    end if;
  end if;

  insert into public.outreach_events (
    prospect_id, event_type, previous_status, new_status,
    note, idempotency_key
  ) values (
    prospect_id_input, 'consent_granted', previous_status_value,
    case
      when purpose_value = 'onboarding_followup' then previous_status_value
      when created_outbox_id is null then 'consented'
      else 'introduction_queued'
    end,
    'Verified provider consent receipt recorded.', idempotency_key_input
  ) on conflict (idempotency_key) do nothing;

  return query select 'CONSENT_RECORDED', created_consent_id, created_outbox_id;
end;
$$;

create or replace function public.withdraw_outreach_consent(
  prospect_id_input uuid,
  reason_input text,
  idempotency_key_input uuid
)
returns table(code text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if coalesce((select auth.role()), '') <> 'service_role'
    and (actor_id is null or not public.is_admin()) then
    raise exception 'Outreach withdrawal access denied'
      using errcode = '42501', detail = 'FORBIDDEN';
  end if;
  if idempotency_key_input is null or char_length(btrim(reason_input)) not between 2 and 500 then
    raise exception 'Invalid withdrawal'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  update public.outreach_consents
  set withdrawn_at = coalesce(withdrawn_at, now()),
    withdrawal_reason = coalesce(withdrawal_reason, btrim(reason_input))
  where prospect_id = prospect_id_input and withdrawn_at is null;

  insert into public.outreach_suppressions (value_hash, reason, actor_id)
  select contact.value_hash, 'withdrawn', actor_id
  from public.outreach_contact_candidates contact
  where contact.prospect_id = prospect_id_input
  on conflict (value_hash) do nothing;

  update public.outreach_outbox
  set state = 'cancelled', last_failure_code = 'CONSENT_WITHDRAWN'
  where prospect_id = prospect_id_input and state in ('pending', 'processing');

  update public.outreach_prospects
  set status = 'withdrawn', consent_withdrawn_at = coalesce(consent_withdrawn_at, now()),
    next_action_at = null, introduction_draft = null
  where id = prospect_id_input;

  update public.outreach_contact_candidates
  set private_value = '[withdrawn]'
  where prospect_id = prospect_id_input;

  insert into public.outreach_events (
    prospect_id, actor_id, event_type, new_status, note, idempotency_key
  ) values (
    prospect_id_input, actor_id, 'consent_withdrawn', 'withdrawn',
    btrim(reason_input), idempotency_key_input
  ) on conflict (idempotency_key) do nothing;

  return query select 'WITHDRAWN', 'withdrawn';
end;
$$;

create or replace function public.claim_outreach_outbox(limit_input integer default 10)
returns setof public.outreach_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    return;
  end if;
  update public.outreach_outbox outbox
  set state = 'cancelled',
    last_failure_code = case
      when outbox.expires_at <= now() then 'OUTBOX_EXPIRED'
      else 'CONSENT_EXPIRED_OR_WITHDRAWN'
    end
  where outbox.state = 'pending'
    and (
      outbox.expires_at <= now()
      or (
        outbox.purpose <> 'consent_confirmation'
        and not public.has_active_outreach_consent(
          outbox.prospect_id, outbox.consent_id, outbox.channel, outbox.purpose
        )
      )
    );
  return query
  with candidates as (
    select outbox.id
    from public.outreach_outbox outbox
    where outbox.state = 'pending'
      and outbox.not_before <= now()
      and outbox.expires_at > now()
      and outbox.attempts < 5
    order by outbox.not_before, outbox.created_at
    for update skip locked
    limit least(greatest(coalesce(limit_input, 10), 1), 25)
  )
  update public.outreach_outbox outbox
  set state = 'processing', attempts = outbox.attempts + 1, locked_at = now()
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

create or replace function public.schedule_due_outreach_followups(
  limit_input integer default 25
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  scheduled_count integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    return 0;
  end if;
  with candidates as (
    select prospect.id as prospect_id, prospect.application_origin,
      consent.id as consent_id, consent.contact_candidate_id,
      consent.channel, consent.expires_at
    from public.outreach_prospects prospect
    join public.outreach_consents consent
      on consent.prospect_id = prospect.id
      and consent.purpose = 'onboarding_followup'
      and consent.withdrawn_at is null
      and consent.granted_at <= now()
      and consent.expires_at > now()
    where prospect.status = 'introduced'
      and prospect.followup_requested
      and prospect.next_action_at <= now()
      and not exists (
        select 1 from public.outreach_outbox existing
        where existing.consent_id = consent.id
          and existing.purpose = 'onboarding_followup'
      )
      and not exists (
        select 1 from public.outreach_suppressions suppression
        join public.outreach_contact_candidates contact
          on contact.value_hash = suppression.value_hash
        where contact.id = consent.contact_candidate_id
      )
    order by prospect.next_action_at
    for update of prospect skip locked
    limit least(greatest(coalesce(limit_input, 25), 1), 100)
  ), inserted as (
    insert into public.outreach_outbox (
      prospect_id, contact_candidate_id, consent_id, channel, purpose,
      message_body, expires_at, idempotency_key
    )
    select candidate.prospect_id, candidate.contact_candidate_id,
      candidate.consent_id, candidate.channel, 'onboarding_followup',
      concat(
        'You asked FarmerBook for onboarding help. Create or continue your account at ',
        candidate.application_origin,
        '/signup. You can withdraw consent at any time.'
      ),
      least(candidate.expires_at, now() + interval '7 days'),
      gen_random_uuid()
    from candidates candidate
    on conflict on constraint outreach_outbox_consent_id_purpose_key do nothing
    returning prospect_id, idempotency_key
  ), events as (
    insert into public.outreach_events (
      prospect_id, event_type, previous_status, new_status, note,
      idempotency_key
    )
    select inserted.prospect_id, 'followup_queued', 'introduced', 'introduced',
      'One consented onboarding follow-up was queued.',
      inserted.idempotency_key
    from inserted
    returning prospect_id
  )
  update public.outreach_prospects prospect
  set next_action_at = null
  where prospect.id in (select event.prospect_id from events);
  get diagnostics scheduled_count = row_count;
  return scheduled_count;
end;
$$;

create or replace function public.record_outreach_delivery_result(
  outbox_id_input uuid,
  result_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox_record public.outreach_outbox%rowtype;
  delivered_value boolean := coalesce((result_input ->> 'delivered')::boolean, false);
  retryable_value boolean := coalesce((result_input ->> 'retryable')::boolean, false);
  failure_code_value text := coalesce(nullif(result_input ->> 'failureCode', ''), 'PROVIDER_FAILED');
  occurred_value timestamptz := (result_input ->> 'occurredAt')::timestamptz;
  next_state text;
  next_prospect_status text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if outbox_id_input is null or idempotency_key_input is null
    or jsonb_typeof(result_input) <> 'object'
  then
    raise exception 'Invalid delivery result'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  if exists (
    select 1 from public.outreach_events event
    where event.idempotency_key = idempotency_key_input
  ) then
    return query
      select 'IDEMPOTENT_REPLAY', outbox.state
      from public.outreach_outbox outbox where outbox.id = outbox_id_input;
    return;
  end if;

  select outbox.* into outbox_record
  from public.outreach_outbox outbox
  where outbox.id = outbox_id_input
  for update;
  if not found then
    raise exception 'Outbox delivery not found'
      using errcode = 'P0002', detail = 'OUTBOX_NOT_FOUND';
  end if;
  if outbox_record.state = 'cancelled' then
    return query select 'CANCELLED', 'cancelled';
    return;
  end if;
  if outbox_record.state <> 'processing' then
    raise exception 'Outbox delivery is not processing'
      using errcode = '40001', detail = 'OUTBOX_STATE_CONFLICT';
  end if;

  if delivered_value then
    if nullif(result_input ->> 'provider', '') is null
      or nullif(result_input ->> 'providerReceiptId', '') is null
      or occurred_value is null
      or occurred_value < outbox_record.created_at - interval '5 minutes'
      or occurred_value > now() + interval '5 minutes'
    then
      raise exception 'Provider receipt is required'
        using errcode = '22023', detail = 'INVALID_PROVIDER_RECEIPT';
    end if;
    update public.outreach_outbox
    set state = 'delivered', delivered_at = occurred_value,
        provider = left(result_input ->> 'provider', 80),
        provider_receipt_id = left(result_input ->> 'providerReceiptId', 300),
        last_failure_code = null
    where id = outbox_id_input;
    if outbox_record.purpose = 'farmerbook_introduction' then
      update public.outreach_prospects
      set status = 'introduced',
        next_action_at = case
          when followup_requested then now() + interval '3 days'
          else null
        end
      where id = outbox_record.prospect_id;
      next_prospect_status := 'introduced';
    else
      select prospect.status into next_prospect_status
      from public.outreach_prospects prospect
      where prospect.id = outbox_record.prospect_id;
    end if;
    next_state := 'delivered';
  else
    if failure_code_value !~ '^[A-Z0-9_]{2,80}$' then
      raise exception 'Invalid provider failure code'
        using errcode = '22023', detail = 'INVALID_FAILURE_CODE';
    end if;
    next_state := case
      when retryable_value and outbox_record.attempts < 5 then 'pending'
      else 'failed'
    end;
    update public.outreach_outbox
    set state = next_state,
      not_before = case
        when next_state = 'pending'
          then now() + make_interval(mins => least(60, outbox_record.attempts * 5))
        else not_before
      end,
      locked_at = null,
      last_failure_code = failure_code_value
    where id = outbox_id_input;
    select prospect.status into next_prospect_status
    from public.outreach_prospects prospect
    where prospect.id = outbox_record.prospect_id;
  end if;

  insert into public.outreach_events (
    prospect_id, event_type, new_status, note, idempotency_key
  ) values (
    outbox_record.prospect_id,
    case when delivered_value then 'delivered' else 'delivery_failed' end,
    next_prospect_status,
    case
      when delivered_value then 'Provider delivery receipt recorded.'
      else left(concat('Provider delivery failed: ', failure_code_value), 500)
    end,
    idempotency_key_input
  );

  return query
    select case when delivered_value then 'DELIVERED' else 'FAILURE_RECORDED' end,
      next_state;
end;
$$;

create or replace function public.purge_expired_outreach_research(
  limit_input integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  with expired as (
    select prospect.id
    from public.outreach_prospects prospect
    where prospect.retention_expires_at <= now()
      and prospect.consent_granted_at is null
      and prospect.status in (
        'discovered', 'consent_blocked', 'consent_requested', 'declined',
        'expired', 'withdrawn', 'suppressed'
      )
      and not exists (
        select 1 from public.outreach_consents consent
        where consent.prospect_id = prospect.id
      )
    order by prospect.retention_expires_at
    for update skip locked
    limit least(greatest(coalesce(limit_input, 100), 1), 500)
  )
  delete from public.outreach_prospects prospect
  using expired
  where prospect.id = expired.id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter table public.outreach_prospects enable row level security;
alter table public.outreach_contact_candidates enable row level security;
alter table public.outreach_consents enable row level security;
alter table public.outreach_outbox enable row level security;
alter table public.outreach_events enable row level security;
alter table public.outreach_suppressions enable row level security;
alter table public.outreach_agent_runs enable row level security;

revoke all on table public.outreach_prospects from public, anon, authenticated;
revoke all on table public.outreach_contact_candidates from public, anon, authenticated;
revoke all on table public.outreach_consents from public, anon, authenticated;
revoke all on table public.outreach_outbox from public, anon, authenticated;
revoke all on table public.outreach_events from public, anon, authenticated;
revoke all on table public.outreach_suppressions from public, anon, authenticated;
revoke all on table public.outreach_agent_runs from public, anon, authenticated;

revoke all on function public.outreach_set_updated_at_and_revision() from public, anon, authenticated;
revoke all on function public.prevent_outreach_event_mutation() from public, anon, authenticated;
revoke all on function public.sha256_normalized_contact(text) from public, anon, authenticated;
revoke all on function public.has_active_outreach_consent(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.validate_outreach_outbox_consent() from public, anon, authenticated;

revoke all on function public.create_outreach_prospect(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.create_outreach_prospect(jsonb, uuid) to authenticated;
revoke all on function public.list_outreach_prospects(integer) from public, anon, authenticated;
grant execute on function public.list_outreach_prospects(integer) to authenticated;
revoke all on function public.outreach_dashboard_summary() from public, anon, authenticated;
grant execute on function public.outreach_dashboard_summary() to authenticated;
revoke all on function public.submit_outreach_consent_lead(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.submit_outreach_consent_lead(jsonb, uuid) to service_role;
revoke all on function public.record_verified_outreach_consent(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.record_verified_outreach_consent(uuid, jsonb, uuid) to service_role;
revoke all on function public.withdraw_outreach_consent(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.withdraw_outreach_consent(uuid, text, uuid) to authenticated, service_role;
revoke all on function public.claim_outreach_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_outreach_outbox(integer) to service_role;
revoke all on function public.schedule_due_outreach_followups(integer)
  from public, anon, authenticated;
grant execute on function public.schedule_due_outreach_followups(integer)
  to service_role;
revoke all on function public.record_outreach_delivery_result(uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.record_outreach_delivery_result(uuid, jsonb, uuid)
  to service_role;
revoke all on function public.purge_expired_outreach_research(integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_outreach_research(integer)
  to service_role;

grant select, insert, update, delete on public.outreach_prospects to service_role;
grant select, insert, update, delete on public.outreach_contact_candidates to service_role;
grant select, insert, update, delete on public.outreach_consents to service_role;
grant select, insert, update, delete on public.outreach_outbox to service_role;
grant select, insert on public.outreach_events to service_role;
grant select, insert on public.outreach_suppressions to service_role;
grant select, insert on public.outreach_agent_runs to service_role;
