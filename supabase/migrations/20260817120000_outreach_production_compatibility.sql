-- Production compatibility bridge for consent-first FarmerBook outreach.
-- It converges a full local installation and the live sourced-research
-- baseline without replaying unrelated ecosystem migrations. Applying this
-- file cannot send mail: the database release control remains false and the
-- independent delivery control remains paused.

create extension if not exists pgcrypto with schema extensions;

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents', 'managed_operations_agents',
      'featured_farmer_profiles', 'private_farmer_contacts',
      'sourced_farmer_research', 'support_social_pilot'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('outreach_agent', false)
on conflict (control_key) do update set enabled = false;

create table if not exists public.outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  normalized_source_url text not null check (char_length(normalized_source_url) between 8 and 2048),
  application_origin text not null check (char_length(application_origin) between 8 and 300),
  source_type text not null check (source_type in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin',
    'other_social', 'unsupported', 'inbound_form', 'google_lead_form'
  )),
  source_title text,
  source_excerpt text,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  business_name text,
  operator_context text,
  status text not null default 'discovered' check (status in (
    'discovered', 'consent_blocked', 'consent_requested', 'consented',
    'qualified', 'introduction_queued', 'introduced', 'onboarding',
    'joined', 'declined', 'expired', 'withdrawn', 'suppressed'
  )),
  suggested_role text not null default 'unknown' check (suggested_role in (
    'farmer', 'customer', 'wholesaler', 'agri_business', 'unknown'
  )),
  preferred_locale text not null default 'en-IN',
  category_slugs text[] not null default '{}' check (cardinality(category_slugs) <= 8),
  rationale text,
  introduction_draft text check (
    introduction_draft is null or char_length(introduction_draft) between 20 and 1500
  ),
  consent_channel text check (consent_channel is null or consent_channel in ('email', 'sms', 'whatsapp')),
  consent_granted_at timestamptz,
  consent_withdrawn_at timestamptz,
  followup_requested boolean not null default false,
  next_action_at timestamptz,
  retention_expires_at timestamptz not null default (now() + interval '90 days'),
  revision integer not null default 0 check (revision >= 0),
  creation_idempotency_key uuid not null unique,
  creation_fingerprint text not null check (creation_fingerprint ~ '^[0-9a-f]{64}$'),
  privacy_deleted_at timestamptz,
  engagement_type text not null default 'membership' check (engagement_type in ('membership', 'collaboration')),
  contact_name text,
  organization_website text,
  country_code text not null default 'IN' check (country_code ~ '^[A-Z]{2}$'),
  state_region text,
  district_locality text,
  farming_approach text not null default 'general' check (farming_approach in (
    'natural', 'organic', 'regenerative', 'agroecological', 'sustainable',
    'low_input', 'smallholder', 'general'
  )),
  priority_tier smallint not null default 30 check (priority_tier in (10, 20, 30)),
  consent_policy_version text,
  campaign_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outreach_prospects
  add column if not exists engagement_type text not null default 'membership',
  add column if not exists contact_name text,
  add column if not exists organization_website text,
  add column if not exists country_code text not null default 'IN',
  add column if not exists state_region text,
  add column if not exists district_locality text,
  add column if not exists farming_approach text not null default 'general',
  add column if not exists priority_tier smallint not null default 30,
  add column if not exists consent_policy_version text,
  add column if not exists campaign_code text,
  add column if not exists privacy_deleted_at timestamptz;

alter table public.outreach_prospects
  drop constraint if exists outreach_prospects_engagement_type_check,
  drop constraint if exists outreach_prospects_country_code_check,
  drop constraint if exists outreach_prospects_farming_approach_check,
  drop constraint if exists outreach_prospects_priority_tier_check;
alter table public.outreach_prospects
  add constraint outreach_prospects_engagement_type_check
    check (engagement_type in ('membership', 'collaboration')),
  add constraint outreach_prospects_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),
  add constraint outreach_prospects_farming_approach_check check (
    farming_approach in (
      'natural', 'organic', 'regenerative', 'agroecological', 'sustainable',
      'low_input', 'smallholder', 'general'
    )
  ),
  add constraint outreach_prospects_priority_tier_check
    check (priority_tier in (10, 20, 30));

create table if not exists public.outreach_contact_candidates (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  channel text not null check (channel in ('email', 'phone')),
  private_value text not null check (char_length(private_value) between 5 and 254),
  value_hash text not null check (value_hash ~ '^[0-9a-f]{64}$'),
  source_url text not null,
  evidence_excerpt text not null,
  evidence_origin text not null check (evidence_origin in (
    'website', 'pasted_description', 'screenshot_ocr', 'inbound_form',
    'google_lead_form'
  )),
  explicitly_for_business_enquiries boolean not null default false,
  business_contact_confirmed boolean not null default false,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (prospect_id, value_hash)
);

create table if not exists public.outreach_consents (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  contact_candidate_id uuid not null references public.outreach_contact_candidates (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  purpose text not null check (purpose in ('farmerbook_introduction', 'onboarding_followup')),
  statement_version text not null,
  statement_text text not null,
  capture_method text not null check (capture_method in (
    'farmerbook_form', 'google_lead_form', 'registered_dca', 'double_opt_in',
    'verified_provider'
  )),
  provider text not null,
  provider_receipt_id text not null,
  granted_at timestamptz not null,
  expires_at timestamptz not null,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  unique (prospect_id, channel, purpose, provider_receipt_id)
);

create table if not exists public.outreach_suppressions (
  value_hash text primary key check (value_hash ~ '^[0-9a-f]{64}$'),
  source_identity_hash text,
  reason text not null check (reason in (
    'withdrawn', 'declined', 'complaint', 'hard_bounce', 'administrator'
  )),
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_provider_events (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  contact_candidate_id uuid not null references public.outreach_contact_candidates (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  event_type text not null check (event_type in ('reply', 'declined', 'complaint', 'hard_bounce', 'soft_bounce')),
  provider text not null,
  provider_event_id text not null,
  contact_hash text not null check (contact_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  reply_intent text,
  question_code text,
  response_requested boolean not null default false,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.outreach_outbox (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  contact_candidate_id uuid not null references public.outreach_contact_candidates (id) on delete cascade,
  consent_id uuid references public.outreach_consents (id) on delete restrict,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  purpose text not null check (purpose in (
    'farmerbook_introduction', 'onboarding_followup', 'onboarding_reply',
    'consent_confirmation'
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
  last_failure_code text,
  idempotency_key uuid not null unique,
  inbound_provider_event_id uuid references public.outreach_provider_events (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consent_id, purpose)
);

alter table public.outreach_outbox
  add column if not exists inbound_provider_event_id uuid
    references public.outreach_provider_events (id) on delete restrict;

create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  actor_id uuid,
  event_type text not null,
  previous_status text,
  new_status text,
  note text,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_runtime_controls (
  singleton boolean primary key default true check (singleton),
  delivery_paused boolean not null default true,
  pause_reason text not null default 'Awaiting reviewed provider activation.',
  changed_by uuid,
  changed_at timestamptz not null default now()
);
insert into public.outreach_runtime_controls (
  singleton, delivery_paused, pause_reason
) values (
  true, true, 'Awaiting reviewed provider activation.'
) on conflict (singleton) do update set
  delivery_paused = true,
  pause_reason = 'Awaiting reviewed provider activation.',
  changed_at = now();

create index if not exists outreach_priority_queue_idx
  on public.outreach_prospects (priority_tier, created_at)
  where status in ('consented', 'introduction_queued');
create index if not exists outreach_outbox_pending_idx
  on public.outreach_outbox (not_before, created_at)
  where state = 'pending';

create or replace function public.sha256_normalized_contact(value_input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(extensions.digest(lower(btrim(value_input)), 'sha256'), 'hex');
$$;

create or replace function public.is_outreach_delivery_available()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_ecosystem_release_enabled('outreach_agent')
    and exists (
      select 1 from public.outreach_runtime_controls control
      where control.singleton and not control.delivery_paused
    );
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
    join public.outreach_contact_candidates contact
      on contact.id = consent.contact_candidate_id
    where consent.id = consent_id_input
      and consent.prospect_id = prospect_id_input
      and consent.channel = channel_input
      and consent.purpose = purpose_input
      and consent.withdrawn_at is null
      and consent.granted_at <= now()
      and consent.expires_at > now()
      and not exists (
        select 1 from public.outreach_suppressions suppression
        where suppression.value_hash = contact.value_hash
      )
  );
$$;

create or replace function public.has_active_outreach_reply_authorization(
  outbox_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.outreach_outbox outbox
    join public.outreach_provider_events provider_event
      on provider_event.id = outbox.inbound_provider_event_id
    join public.outreach_contact_candidates contact
      on contact.id = outbox.contact_candidate_id
    where outbox.id = outbox_id_input
      and outbox.purpose = 'onboarding_reply'
      and outbox.consent_id is null
      and provider_event.event_type = 'reply'
      and provider_event.reply_intent = 'onboarding_question'
      and provider_event.response_requested
      and provider_event.question_code is not null
      and provider_event.prospect_id = outbox.prospect_id
      and provider_event.contact_candidate_id = outbox.contact_candidate_id
      and provider_event.channel = outbox.channel
      and provider_event.occurred_at <= now() + interval '5 minutes'
      and provider_event.occurred_at > now() - interval '30 days'
      and not exists (
        select 1 from public.outreach_suppressions suppression
        where suppression.value_hash = contact.value_hash
      )
  );
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
  existing_lead public.outreach_prospects%rowtype;
  engagement_value text := lead_input ->> 'engagementType';
  contact_channel text := lead_input ->> 'preferredChannel';
  contact_value text := case
    when contact_channel = 'email' then lead_input ->> 'email'
    else lead_input ->> 'phone'
  end;
  contact_hash text;
  approach_value text := lead_input ->> 'farmingApproach';
  priority_value integer := (lead_input ->> 'priorityTier')::integer;
  country_value text := lead_input ->> 'countryCode';
  region_value text := coalesce(lead_input ->> 'region', lead_input ->> 'state');
  locality_value text := coalesce(lead_input ->> 'district', lead_input ->> 'region');
  fingerprint_value text := lead_input ->> 'inputFingerprint';
  source_url_value text := lead_input ->> 'sourceUrl';
  application_origin_value text := rtrim(lead_input ->> 'applicationOrigin', '/');
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
    or engagement_value not in ('membership', 'collaboration')
    or lead_input ->> 'role' not in ('farmer', 'customer', 'wholesaler', 'agri_business')
    or char_length(btrim(lead_input ->> 'fullName')) not between 2 and 100
    or country_value !~ '^[A-Z]{2}$'
    or char_length(btrim(region_value)) not between 2 and 100
    or char_length(btrim(locality_value)) not between 2 and 100
    or (
      engagement_value = 'membership'
      and (
        country_value <> 'IN'
        or lead_input ->> 'state' not in (
          'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh',
          'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
          'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
          'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
          'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
          'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
          'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
          'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
          'Uttarakhand', 'West Bengal'
        )
      )
    )
    or (
      engagement_value = 'collaboration'
      and char_length(btrim(lead_input ->> 'businessName')) not between 2 and 120
    )
    or approach_value not in (
      'natural', 'organic', 'regenerative', 'agroecological', 'sustainable',
      'low_input', 'smallholder', 'general'
    )
    or priority_value <> (case
      when approach_value in ('natural', 'organic', 'regenerative', 'agroecological') then 10
      when approach_value in ('sustainable', 'low_input', 'smallholder') then 20
      else 30
    end)
    or lead_input ->> 'preferredLocale' not in (
      'en-IN', 'as-IN', 'bn-IN', 'brx-IN', 'doi-IN', 'gu-IN', 'hi-IN',
      'kn-IN', 'ks-Arab-IN', 'kok-Deva-IN', 'mai-IN', 'ml-IN',
      'mni-Mtei-IN', 'mr-IN', 'ne-IN', 'or-IN', 'pa-Guru-IN', 'sa-IN',
      'sat-Olck-IN', 'sd-Arab-IN', 'ta-IN', 'te-IN', 'ur-IN'
    )
    or contact_channel <> 'email'
    or btrim(contact_value) !~* '^[A-Z0-9._%+''-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    or coalesce((lead_input ->> 'introductionConsent')::boolean, false) is not true
    or lead_input ->> 'consentPolicyVersion' <> '2026-08-17.1'
    or coalesce(lead_input ->> 'campaignCode', '') not in (
      'direct-join', 'farmer-interest', 'partner-interest', 'google-lead-form'
    )
    or char_length(btrim(source_url_value)) not between 8 and 2048
    or not (
      application_origin_value ~ '^https://[A-Za-z0-9.-]+(?::443)?$'
      or application_origin_value ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]{2,5})?$'
    )
    or char_length(btrim(lead_input ->> 'introductionDraft')) not between 20 and 1500
    or (
      nullif(lead_input ->> 'organizationWebsite', '') is not null
      and lead_input ->> 'organizationWebsite' !~ '^https?://'
    )
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
  if exists (
    select 1
    from public.outreach_contact_candidates candidate
    join public.outreach_prospects prospect on prospect.id = candidate.prospect_id
    where candidate.value_hash = contact_hash
      and prospect.created_at > now() - interval '24 hours'
      and prospect.status not in ('withdrawn', 'suppressed', 'declined', 'expired')
  ) then
    return query
      select 'DUPLICATE_PENDING', prospect.id, prospect.status
      from public.outreach_contact_candidates candidate
      join public.outreach_prospects prospect on prospect.id = candidate.prospect_id
      where candidate.value_hash = contact_hash
      order by prospect.created_at desc limit 1;
    return;
  end if;

  insert into public.outreach_prospects (
    normalized_source_url, application_origin, source_type, source_hash,
    business_name, operator_context, status, suggested_role, preferred_locale,
    introduction_draft, consent_channel, followup_requested,
    creation_idempotency_key, creation_fingerprint, engagement_type,
    contact_name, organization_website, country_code, state_region,
    district_locality, farming_approach, priority_tier,
    consent_policy_version, campaign_code
  ) values (
    source_url_value, application_origin_value,
    coalesce(lead_input ->> 'sourceType', 'inbound_form'),
    encode(extensions.digest(source_url_value, 'sha256'), 'hex'),
    nullif(btrim(lead_input ->> 'businessName'), ''),
    left(concat_ws(' | ', lead_input ->> 'fullName', region_value, locality_value), 8000),
    'consent_requested', lead_input ->> 'role', lead_input ->> 'preferredLocale',
    btrim(lead_input ->> 'introductionDraft'), contact_channel,
    coalesce((lead_input ->> 'followupConsent')::boolean, false),
    idempotency_key_input, fingerprint_value, engagement_value,
    btrim(lead_input ->> 'fullName'),
    nullif(btrim(lead_input ->> 'organizationWebsite'), ''), country_value,
    region_value, locality_value, approach_value, priority_value,
    lead_input ->> 'consentPolicyVersion', lead_input ->> 'campaignCode'
  ) returning id into created_id;

  insert into public.outreach_contact_candidates (
    prospect_id, channel, private_value, value_hash, source_url,
    evidence_excerpt, evidence_origin, explicitly_for_business_enquiries,
    business_contact_confirmed, confirmed_at
  ) values (
    created_id, 'email', btrim(contact_value), contact_hash, source_url_value,
    'Contact supplied directly through a FarmerBook consent form.',
    coalesce(lead_input ->> 'sourceType', 'inbound_form'), true, true, now()
  ) returning id into contact_id;

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
    created_id, contact_id, 'email', 'consent_confirmation',
    'FarmerBook received your request. Confirm by email before FarmerBook sends the requested introduction.',
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
  prospect public.outreach_prospects%rowtype;
  created_consent_id uuid;
  created_outbox_id uuid;
  purpose_value text := receipt_input ->> 'purpose';
  channel_value text := receipt_input ->> 'channel';
  granted_value timestamptz := (receipt_input ->> 'grantedAt')::timestamptz;
  expires_value timestamptz := (receipt_input ->> 'expiresAt')::timestamptz;
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
  select current_prospect.* into prospect
  from public.outreach_prospects current_prospect
  where current_prospect.id = prospect_id_input
  for update;
  if not found or contact.id is null then
    raise exception 'Prospect contact not found'
      using errcode = 'P0002', detail = 'CONTACT_NOT_FOUND';
  end if;
  if channel_value <> 'email'
    or contact.channel <> 'email'
    or purpose_value not in ('farmerbook_introduction', 'onboarding_followup')
    or receipt_input ->> 'engagementType' <> prospect.engagement_type
    or granted_value < now() - interval '30 days'
    or granted_value > now() + interval '5 minutes'
    or expires_value <= greatest(granted_value, now())
    or expires_value > granted_value + interval '365 days'
    or char_length(receipt_input ->> 'statementVersion') not between 3 and 80
    or char_length(receipt_input ->> 'statementText') not between 20 and 2000
    or receipt_input ->> 'captureMethod' <> 'double_opt_in'
    or receipt_input ->> 'provider' <> 'postmark'
    or nullif(receipt_input ->> 'providerReceiptId', '') is null
    or idempotency_key_input is null
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

  select consent.id, pending.id into created_consent_id, created_outbox_id
  from public.outreach_consents consent
  left join public.outreach_outbox pending
    on pending.consent_id = consent.id and pending.purpose = consent.purpose
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
    'double_opt_in', 'postmark', receipt_input ->> 'providerReceiptId',
    granted_value, expires_value, idempotency_key_input
  ) returning id into created_consent_id;

  if purpose_value = 'farmerbook_introduction' then
    insert into public.outreach_outbox (
      prospect_id, contact_candidate_id, consent_id, channel, purpose,
      message_body, expires_at, idempotency_key
    ) values (
      prospect_id_input, contact.id, created_consent_id, 'email',
      'farmerbook_introduction', prospect.introduction_draft,
      least(expires_value, now() + interval '7 days'), gen_random_uuid()
    ) on conflict on constraint outreach_outbox_consent_id_purpose_key
      do update set consent_id = excluded.consent_id
    returning id into created_outbox_id;
    update public.outreach_prospects
    set status = 'introduction_queued', consent_channel = 'email',
      consent_granted_at = granted_value, consent_withdrawn_at = null,
      next_action_at = now(), updated_at = now()
    where id = prospect_id_input;
  end if;

  insert into public.outreach_events (
    prospect_id, event_type, previous_status, new_status, note,
    idempotency_key
  ) values (
    prospect_id_input, 'consent_granted', prospect.status,
    case when purpose_value = 'farmerbook_introduction'
      then 'introduction_queued' else prospect.status end,
    'Verified Postmark double opt-in receipt recorded.', idempotency_key_input
  ) on conflict (idempotency_key) do nothing;
  return query select 'CONSENT_RECORDED', created_consent_id, created_outbox_id;
end;
$$;

create or replace function public.record_verified_email_double_opt_in(
  prospect_id_input uuid,
  receipt_input jsonb,
  introduction_idempotency_key_input uuid,
  followup_idempotency_key_input uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  purposes_value jsonb := receipt_input -> 'requestedPurposes';
  introduction_result record;
  followup_result record;
  record_followup boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role'
    or jsonb_typeof(receipt_input) <> 'object'
    or jsonb_typeof(purposes_value) <> 'array'
    or receipt_input ->> 'engagementType' not in ('membership', 'collaboration')
    or not purposes_value @> '["farmerbook_introduction"]'::jsonb
    or not purposes_value <@ '["farmerbook_introduction","onboarding_followup"]'::jsonb
  then
    raise exception 'Invalid email consent receipt'
      using errcode = '22023', detail = 'INVALID_EMAIL_CONSENT_RECEIPT';
  end if;
  record_followup := purposes_value @> '["onboarding_followup"]'::jsonb;
  select * into introduction_result
  from public.record_verified_outreach_consent(
    prospect_id_input,
    (receipt_input - 'requestedPurposes') || jsonb_build_object(
      'purpose', 'farmerbook_introduction'
    ),
    introduction_idempotency_key_input
  );
  if record_followup then
    select * into followup_result
    from public.record_verified_outreach_consent(
      prospect_id_input,
      (receipt_input - 'requestedPurposes') || jsonb_build_object(
        'purpose', 'onboarding_followup'
      ),
      followup_idempotency_key_input
    );
  end if;
  return jsonb_build_object(
    'code', 'EMAIL_CONSENT_RECORDED',
    'introductionCode', introduction_result.code,
    'introductionConsentId', introduction_result.consent_id,
    'introductionOutboxId', introduction_result.outbox_id,
    'followupCode', case when record_followup then followup_result.code else null end,
    'followupConsentId', case when record_followup then followup_result.consent_id else null end
  );
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
  if not public.is_outreach_delivery_available() then
    return;
  end if;
  update public.outreach_outbox outbox
  set state = 'cancelled',
    last_failure_code = case when outbox.expires_at <= now()
      then 'OUTBOX_EXPIRED' else 'CONSENT_EXPIRED_OR_WITHDRAWN' end,
    updated_at = now()
  where outbox.state = 'pending'
    and (
      outbox.expires_at <= now()
      or (
        outbox.purpose = 'onboarding_reply'
        and not public.has_active_outreach_reply_authorization(outbox.id)
      )
      or (
        outbox.purpose not in ('consent_confirmation', 'onboarding_reply')
        and not public.has_active_outreach_consent(
          outbox.prospect_id, outbox.consent_id, outbox.channel, outbox.purpose
        )
      )
    );
  return query
  with candidates as (
    select outbox.id
    from public.outreach_outbox outbox
    join public.outreach_prospects prospect on prospect.id = outbox.prospect_id
    where outbox.state = 'pending'
      and outbox.not_before <= now()
      and outbox.expires_at > now()
      and outbox.attempts < 5
    order by
      case when outbox.purpose = 'consent_confirmation' then 0 else 1 end,
      case when outbox.purpose = 'farmerbook_introduction'
        then prospect.priority_tier else 30 end,
      outbox.not_before,
      outbox.created_at
    for update of outbox skip locked
    limit least(greatest(coalesce(limit_input, 10), 1), 25)
  )
  update public.outreach_outbox outbox
  set state = 'processing', attempts = outbox.attempts + 1,
    locked_at = now(), updated_at = now()
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
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
  failure_value text := coalesce(nullif(result_input ->> 'failureCode', ''), 'PROVIDER_FAILED');
  next_state text;
begin
  if coalesce((select auth.role()), '') <> 'service_role'
    or idempotency_key_input is null
    or jsonb_typeof(result_input) <> 'object'
  then
    raise exception 'Invalid delivery result'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if exists (
    select 1 from public.outreach_events event
    where event.idempotency_key = idempotency_key_input
  ) then
    return query select 'IDEMPOTENT_REPLAY', current_outbox.state
    from public.outreach_outbox current_outbox where current_outbox.id = outbox_id_input;
    return;
  end if;
  select outbox.* into outbox_record
  from public.outreach_outbox outbox where outbox.id = outbox_id_input for update;
  if not found or outbox_record.state <> 'processing' then
    raise exception 'Outbox delivery is not processing'
      using errcode = '22023', detail = 'INVALID_OUTBOX_STATE';
  end if;
  next_state := case when delivered_value then 'delivered'
    when retryable_value and outbox_record.attempts < 5 then 'pending'
    else 'failed' end;
  update public.outreach_outbox
  set state = next_state,
    delivered_at = case when delivered_value then
      coalesce((result_input ->> 'occurredAt')::timestamptz, now()) else null end,
    provider = case when delivered_value then result_input ->> 'provider' else provider end,
    provider_receipt_id = case when delivered_value
      then result_input ->> 'providerReceiptId' else provider_receipt_id end,
    last_failure_code = case when delivered_value then null else upper(failure_value) end,
    locked_at = null,
    not_before = case when next_state = 'pending' then now() + interval '15 minutes' else not_before end,
    updated_at = now()
  where id = outbox_id_input;
  if delivered_value and outbox_record.purpose = 'farmerbook_introduction' then
    update public.outreach_prospects
    set status = 'introduced',
      next_action_at = case when followup_requested then now() + interval '3 days' else null end,
      updated_at = now()
    where id = outbox_record.prospect_id;
  end if;
  insert into public.outreach_events (
    prospect_id, event_type, previous_status, new_status, note,
    idempotency_key
  ) values (
    outbox_record.prospect_id,
    case when delivered_value then 'delivered' else 'delivery_failed' end,
    null, null,
    case when delivered_value then 'Provider delivery receipt recorded.'
      else 'Provider delivery failure recorded without recipient content.' end,
    idempotency_key_input
  );
  return query select case when delivered_value then 'DELIVERED' else 'FAILED' end, next_state;
end;
$$;

create table if not exists public.outreach_invitations (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  source_outbox_id uuid not null unique references public.outreach_outbox (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_account_links (
  prospect_id uuid primary key references public.outreach_prospects (id) on delete cascade,
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  invitation_id uuid not null unique references public.outreach_invitations (id) on delete restrict,
  linked_at timestamptz not null default now(),
  joined_at timestamptz
);

create or replace function public.prepare_outreach_invitation(
  outbox_id_input uuid,
  token_input text,
  expires_at_input timestamptz,
  idempotency_key_input uuid
)
returns table(code text, invitation_id uuid, message_body text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox_record public.outreach_outbox%rowtype;
  prospect_record public.outreach_prospects%rowtype;
  created_id uuid;
  token_hash_value text;
  message_value text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  select outbox.* into outbox_record
  from public.outreach_outbox outbox where outbox.id = outbox_id_input for update;
  select prospect.* into prospect_record
  from public.outreach_prospects prospect where prospect.id = outbox_record.prospect_id;
  if not found
    or prospect_record.engagement_type <> 'membership'
    or outbox_record.state <> 'processing'
    or outbox_record.purpose not in ('farmerbook_introduction', 'onboarding_followup')
    or token_input !~ '^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$'
    or expires_at_input <= now()
    or expires_at_input > now() + interval '30 days'
    or not public.has_active_outreach_consent(
      outbox_record.prospect_id, outbox_record.consent_id,
      outbox_record.channel, outbox_record.purpose
    )
  then
    raise exception 'Membership invitation requires a processing consented message'
      using errcode = '42501', detail = 'CONSENT_REQUIRED';
  end if;
  token_hash_value := encode(extensions.digest(token_input, 'sha256'), 'hex');
  select invitation.id into created_id
  from public.outreach_invitations invitation
  where invitation.source_outbox_id = outbox_id_input
     or invitation.idempotency_key = idempotency_key_input;
  if found then
    return query select 'IDEMPOTENT_REPLAY', created_id, outbox_record.message_body;
    return;
  end if;
  message_value := case
    when position(prospect_record.application_origin || '/signup' in outbox_record.message_body) > 0
      then replace(
        outbox_record.message_body,
        prospect_record.application_origin || '/signup',
        prospect_record.application_origin || '/invite/' || token_input
      )
    else left(outbox_record.message_body, 760)
      || ' Use your private FarmerBook invitation: '
      || prospect_record.application_origin || '/invite/' || token_input
  end;
  insert into public.outreach_invitations (
    prospect_id, source_outbox_id, token_hash, expires_at, idempotency_key
  ) values (
    outbox_record.prospect_id, outbox_id_input, token_hash_value,
    expires_at_input, idempotency_key_input
  ) returning id into created_id;
  update public.outreach_outbox set message_body = message_value, updated_at = now()
  where id = outbox_id_input;
  insert into public.outreach_events (
    prospect_id, event_type, new_status, note, idempotency_key
  ) values (
    outbox_record.prospect_id, 'invitation_issued', prospect_record.status,
    'A one-time signed invitation was attached to a consented membership message.',
    idempotency_key_input
  ) on conflict (idempotency_key) do nothing;
  return query select 'INVITATION_PREPARED', created_id, message_value;
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
  if not public.is_outreach_delivery_available() then return 0; end if;
  with candidates as (
    select prospect.id as prospect_id, prospect.application_origin,
      prospect.engagement_type, prospect.priority_tier,
      consent.id as consent_id, consent.contact_candidate_id,
      consent.channel, consent.expires_at
    from public.outreach_prospects prospect
    join public.outreach_consents consent
      on consent.prospect_id = prospect.id
      and consent.purpose = 'onboarding_followup'
      and consent.withdrawn_at is null
      and consent.expires_at > now()
    where prospect.status = 'introduced'
      and prospect.followup_requested
      and prospect.next_action_at <= now()
      and not exists (
        select 1 from public.outreach_outbox existing
        where existing.consent_id = consent.id
          and existing.purpose = 'onboarding_followup'
      )
    order by prospect.priority_tier, prospect.next_action_at
    for update of prospect skip locked
    limit least(greatest(coalesce(limit_input, 25), 1), 100)
  ), inserted as (
    insert into public.outreach_outbox (
      prospect_id, contact_candidate_id, consent_id, channel, purpose,
      message_body, expires_at, idempotency_key
    )
    select candidate.prospect_id, candidate.contact_candidate_id,
      candidate.consent_id, candidate.channel, 'onboarding_followup',
      case when candidate.engagement_type = 'collaboration'
        then 'You separately asked FarmerBook for one collaboration follow-up. Reply if you would like to continue the partnership discussion. You can withdraw consent at any time.'
        else concat(
          'You separately asked FarmerBook for one onboarding follow-up. Continue at ',
          candidate.application_origin,
          '/signup. You can withdraw consent at any time.'
        )
      end,
      least(candidate.expires_at, now() + interval '7 days'), gen_random_uuid()
    from candidates candidate
    on conflict on constraint outreach_outbox_consent_id_purpose_key do nothing
    returning prospect_id
  )
  update public.outreach_prospects prospect set next_action_at = null, updated_at = now()
  where prospect.id in (select inserted.prospect_id from inserted);
  get diagnostics scheduled_count = row_count;
  return scheduled_count;
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
begin
  if coalesce((select auth.role()), '') <> 'service_role'
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 2 and 500
  then
    raise exception 'Invalid withdrawal'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  update public.outreach_consents
  set withdrawn_at = coalesce(withdrawn_at, now()),
    withdrawal_reason = coalesce(withdrawal_reason, btrim(reason_input))
  where prospect_id = prospect_id_input and withdrawn_at is null;
  insert into public.outreach_suppressions (value_hash, reason)
  select contact.value_hash, 'withdrawn'
  from public.outreach_contact_candidates contact
  where contact.prospect_id = prospect_id_input
  on conflict (value_hash) do nothing;
  update public.outreach_outbox
  set state = 'cancelled', last_failure_code = 'CONSENT_WITHDRAWN', updated_at = now()
  where prospect_id = prospect_id_input and state in ('pending', 'processing');
  update public.outreach_prospects
  set status = 'withdrawn', consent_withdrawn_at = coalesce(consent_withdrawn_at, now()),
    next_action_at = null, introduction_draft = null, updated_at = now()
  where id = prospect_id_input;
  update public.outreach_contact_candidates set private_value = '[withdrawn]'
  where prospect_id = prospect_id_input;
  insert into public.outreach_events (
    prospect_id, event_type, new_status, note, idempotency_key
  ) values (
    prospect_id_input, 'consent_withdrawn', 'withdrawn',
    btrim(reason_input), idempotency_key_input
  ) on conflict (idempotency_key) do nothing;
  return query select 'WITHDRAWN', 'withdrawn';
end;
$$;

do $bridge$
begin
  if to_regprocedure(
    'public.record_outreach_provider_event(uuid,jsonb,uuid)'
  ) is null then
    execute $sql$
      create function public.record_outreach_provider_event(
        prospect_id_input uuid,
        event_input jsonb,
        idempotency_key_input uuid
      )
      returns table(code text, prospect_status text, response_outbox_id uuid)
      language plpgsql
      security definer
      set search_path = ''
      as $body$
      declare
        contact public.outreach_contact_candidates%rowtype;
        prospect public.outreach_prospects%rowtype;
        event_type_value text := event_input ->> 'eventType';
        reply_intent_value text := nullif(event_input ->> 'replyIntent', '');
        occurred_value timestamptz := (event_input ->> 'occurredAt')::timestamptz;
        next_status text;
        suppression_reason text;
        audit_type text;
      begin
        if coalesce((select auth.role()), '') <> 'service_role'
          or not public.is_ecosystem_release_enabled('outreach_agent')
        then
          raise exception 'Provider event access denied'
            using errcode = '42501', detail = 'FORBIDDEN';
        end if;
        if idempotency_key_input is null
          or jsonb_typeof(event_input) <> 'object'
          or event_type_value not in (
            'reply', 'declined', 'complaint', 'hard_bounce', 'soft_bounce'
          )
          or event_input ->> 'channel' <> 'email'
          or char_length(event_input ->> 'provider') not between 2 and 80
          or char_length(event_input ->> 'providerEventId') not between 1 and 300
          or (event_input ->> 'contactHash') !~ '^[0-9a-f]{64}$'
          or occurred_value < now() - interval '30 days'
          or occurred_value > now() + interval '5 minutes'
          or (
            event_type_value = 'reply'
            and reply_intent_value not in (
              'stop', 'interested', 'onboarding_question', 'other'
            )
          )
        then
          raise exception 'Invalid provider event'
            using errcode = '22023', detail = 'INVALID_PROVIDER_EVENT';
        end if;
        if exists (
          select 1 from public.outreach_provider_events provider_event
          where provider_event.idempotency_key = idempotency_key_input
        ) then
          return query select 'IDEMPOTENT_REPLAY', current_prospect.status, null::uuid
          from public.outreach_prospects current_prospect
          where current_prospect.id = prospect_id_input;
          return;
        end if;
        select candidate.* into contact
        from public.outreach_contact_candidates candidate
        where candidate.id = (event_input ->> 'contactCandidateId')::uuid
          and candidate.prospect_id = prospect_id_input
          and candidate.value_hash = event_input ->> 'contactHash'
          and candidate.channel = 'email'
        for update;
        select current_prospect.* into prospect
        from public.outreach_prospects current_prospect
        where current_prospect.id = prospect_id_input for update;
        if contact.id is null or prospect.id is null then
          raise exception 'Provider event contact not found'
            using errcode = 'P0002', detail = 'CONTACT_NOT_FOUND';
        end if;
        insert into public.outreach_provider_events (
          prospect_id, contact_candidate_id, channel, event_type, provider,
          provider_event_id, contact_hash, occurred_at, reply_intent,
          question_code, response_requested, idempotency_key
        ) values (
          prospect_id_input, contact.id, 'email', event_type_value,
          event_input ->> 'provider', event_input ->> 'providerEventId',
          contact.value_hash, occurred_value, reply_intent_value,
          nullif(event_input ->> 'questionCode', ''),
          coalesce((event_input ->> 'responseRequested')::boolean, false),
          idempotency_key_input
        );
        next_status := prospect.status;
        audit_type := case event_type_value
          when 'reply' then 'reply_received'
          when 'declined' then 'declined'
          when 'complaint' then 'complaint'
          when 'hard_bounce' then 'hard_bounce'
          else 'soft_bounce'
        end;
        if event_type_value = 'declined' then
          next_status := 'declined'; suppression_reason := 'declined';
        elsif event_type_value = 'complaint' then
          next_status := 'suppressed'; suppression_reason := 'complaint';
        elsif event_type_value = 'hard_bounce' then
          next_status := 'suppressed'; suppression_reason := 'hard_bounce';
        elsif event_type_value = 'reply' and reply_intent_value = 'stop' then
          next_status := 'withdrawn'; suppression_reason := 'withdrawn';
          audit_type := 'opt_out';
        elsif event_type_value = 'reply' then
          next_status := 'onboarding';
        end if;
        if event_type_value = 'reply' then
          update public.outreach_outbox
          set state = 'cancelled', last_failure_code = 'RECIPIENT_REPLIED',
            updated_at = now()
          where prospect_id = prospect_id_input
            and purpose = 'onboarding_followup'
            and state in ('pending', 'processing');
        end if;
        if suppression_reason is not null then
          update public.outreach_consents
          set withdrawn_at = coalesce(withdrawn_at, occurred_value),
            withdrawal_reason = coalesce(
              withdrawal_reason, 'Provider lifecycle event ended permission.'
            )
          where prospect_id = prospect_id_input and withdrawn_at is null;
          insert into public.outreach_suppressions (value_hash, reason)
          values (contact.value_hash, suppression_reason)
          on conflict (value_hash) do nothing;
          update public.outreach_outbox
          set state = 'cancelled', last_failure_code = upper(event_type_value),
            updated_at = now()
          where prospect_id = prospect_id_input
            and state in ('pending', 'processing');
          update public.outreach_contact_candidates
          set private_value = case when suppression_reason = 'hard_bounce'
            then '[hard_bounce]' else '[withdrawn]' end
          where id = contact.id;
        end if;
        update public.outreach_prospects
        set status = next_status,
          consent_withdrawn_at = case when suppression_reason is not null
            then coalesce(consent_withdrawn_at, occurred_value)
            else consent_withdrawn_at end,
          next_action_at = case when event_type_value = 'reply'
            or suppression_reason is not null then null else next_action_at end,
          updated_at = now()
        where id = prospect_id_input;
        insert into public.outreach_events (
          prospect_id, event_type, previous_status, new_status, note,
          idempotency_key
        ) values (
          prospect_id_input, audit_type, prospect.status, next_status,
          'A verified provider lifecycle event was recorded without retaining raw reply text.',
          idempotency_key_input
        );
        return query select 'EVENT_RECORDED', next_status, null::uuid;
      end;
      $body$;
    $sql$;
  end if;
end;
$bridge$;

alter table public.outreach_prospects enable row level security;
alter table public.outreach_contact_candidates enable row level security;
alter table public.outreach_consents enable row level security;
alter table public.outreach_suppressions enable row level security;
alter table public.outreach_provider_events enable row level security;
alter table public.outreach_outbox enable row level security;
alter table public.outreach_events enable row level security;
alter table public.outreach_runtime_controls enable row level security;
alter table public.outreach_invitations enable row level security;
alter table public.outreach_account_links enable row level security;

revoke all on table public.outreach_prospects from public, anon, authenticated;
revoke all on table public.outreach_contact_candidates from public, anon, authenticated;
revoke all on table public.outreach_consents from public, anon, authenticated;
revoke all on table public.outreach_suppressions from public, anon, authenticated;
revoke all on table public.outreach_provider_events from public, anon, authenticated;
revoke all on table public.outreach_outbox from public, anon, authenticated;
revoke all on table public.outreach_events from public, anon, authenticated;
revoke all on table public.outreach_runtime_controls from public, anon, authenticated;
revoke all on table public.outreach_invitations from public, anon, authenticated;
revoke all on table public.outreach_account_links from public, anon, authenticated;

grant select, insert, update on table public.outreach_prospects to service_role;
grant select, insert, update on table public.outreach_contact_candidates to service_role;
grant select, insert, update on table public.outreach_consents to service_role;
grant select, insert on table public.outreach_suppressions to service_role;
grant select, insert on table public.outreach_provider_events to service_role;
grant select, insert, update on table public.outreach_outbox to service_role;
grant select, insert on table public.outreach_events to service_role;
grant select, insert, update on table public.outreach_runtime_controls to service_role;
grant select, insert, update on table public.outreach_invitations to service_role;
grant select, insert, update on table public.outreach_account_links to service_role;

revoke all on function public.submit_outreach_consent_lead(jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.has_active_outreach_reply_authorization(uuid)
  from public, anon, authenticated;
revoke all on function public.record_verified_outreach_consent(uuid, jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.record_verified_email_double_opt_in(uuid, jsonb, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.claim_outreach_outbox(integer)
  from public, anon, authenticated;
revoke all on function public.record_outreach_delivery_result(uuid, jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.prepare_outreach_invitation(uuid, text, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.schedule_due_outreach_followups(integer)
  from public, anon, authenticated;
revoke all on function public.withdraw_outreach_consent(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.record_outreach_provider_event(uuid, jsonb, uuid)
  from public, anon, authenticated;

grant execute on function public.submit_outreach_consent_lead(jsonb, uuid)
  to service_role;
grant execute on function public.record_verified_outreach_consent(uuid, jsonb, uuid)
  to service_role;
grant execute on function public.record_verified_email_double_opt_in(uuid, jsonb, uuid, uuid)
  to service_role;
grant execute on function public.claim_outreach_outbox(integer)
  to service_role;
grant execute on function public.record_outreach_delivery_result(uuid, jsonb, uuid)
  to service_role;
grant execute on function public.prepare_outreach_invitation(uuid, text, timestamptz, uuid)
  to service_role;
grant execute on function public.schedule_due_outreach_followups(integer)
  to service_role;
grant execute on function public.withdraw_outreach_consent(uuid, text, uuid)
  to service_role;
grant execute on function public.record_outreach_provider_event(uuid, jsonb, uuid)
  to service_role;
