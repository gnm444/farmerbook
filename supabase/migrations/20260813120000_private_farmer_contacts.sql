-- Owner-only Farmer contacts and transient YouTube discovery audit. YouTube
-- result items never enter these tables and cannot be promoted to outreach.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents', 'managed_operations_agents',
      'featured_farmer_profiles', 'private_farmer_contacts'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('private_farmer_contacts', false)
on conflict (control_key) do nothing;

alter table public.outreach_prospects
  drop constraint if exists outreach_prospects_source_type_check;
alter table public.outreach_prospects
  add constraint outreach_prospects_source_type_check check (source_type in (
    'website', 'youtube', 'instagram', 'facebook', 'linkedin',
    'other_social', 'unsupported', 'inbound_form', 'google_lead_form',
    'consented_private_database'
  ));

alter table public.outreach_contact_candidates
  drop constraint if exists outreach_contact_candidates_evidence_origin_check;
alter table public.outreach_contact_candidates
  add constraint outreach_contact_candidates_evidence_origin_check check (
    evidence_origin in (
      'website', 'pasted_description', 'screenshot_ocr', 'inbound_form',
      'google_lead_form', 'consented_private_database'
    )
  );

create table public.farmer_contact_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 100),
  purpose text not null check (
    purpose in ('farmerbook_invitation', 'farmerbook_member_support')
  ),
  creation_idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name),
  unique (id, owner_id)
);

create table public.farmer_contacts (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  display_name_ciphertext text check (
    display_name_ciphertext is null
    or char_length(display_name_ciphertext) between 20 and 1000
  ),
  email_ciphertext text check (
    email_ciphertext is null or char_length(email_ciphertext) between 20 and 2000
  ),
  email_hash text check (email_hash is null or email_hash ~ '^[0-9a-f]{64}$'),
  phone_ciphertext text check (
    phone_ciphertext is null or char_length(phone_ciphertext) between 20 and 1000
  ),
  phone_hash text check (phone_hash is null or phone_hash ~ '^[0-9a-f]{64}$'),
  acquisition_source text not null check (acquisition_source in (
    'farmerbook_interest_form', 'existing_farmerbook_member',
    'partner_consent_campaign', 'manual_consent_import'
  )),
  source_reference text not null check (
    char_length(source_reference) between 2 and 500
  ),
  state text not null check (public.is_india_state_or_union_territory(state)),
  district text not null check (char_length(district) between 2 and 100),
  preferred_locale text not null default 'en-IN'
    references public.supported_locales (locale_code) on delete restrict,
  source_attested boolean not null default false,
  consent_channel text not null check (consent_channel in ('email', 'phone')),
  consent_purpose text not null default 'farmerbook_invitation' check (
    consent_purpose = 'farmerbook_invitation'
  ),
  consent_state text not null default 'pending' check (
    consent_state in ('pending', 'active', 'expired', 'withdrawn')
  ),
  consent_text_version text not null check (
    char_length(consent_text_version) between 5 and 100
  ),
  consent_recorded_at timestamptz not null,
  consent_expires_at timestamptz,
  channel_confirmed_at timestamptz,
  channel_confirmation_reference text check (
    channel_confirmation_reference is null
    or char_length(channel_confirmation_reference) between 8 and 500
  ),
  review_state text not null default 'pending' check (
    review_state in ('pending', 'approved', 'rejected')
  ),
  suppression_state text not null default 'none' check (
    suppression_state in ('none', 'withdrawn', 'administrator', 'privacy_deleted')
  ),
  outreach_prospect_id uuid unique
    references public.outreach_prospects (id) on delete set null,
  last_contacted_at timestamptz,
  privacy_deleted_at timestamptz,
  creation_idempotency_key uuid not null unique,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (list_id, owner_id)
    references public.farmer_contact_lists (id, owner_id) on delete restrict,
  check ((email_ciphertext is null) = (email_hash is null)),
  check ((phone_ciphertext is null) = (phone_hash is null)),
  check (
    privacy_deleted_at is not null
    or email_ciphertext is not null
    or phone_ciphertext is not null
  ),
  check (
    privacy_deleted_at is not null
    or (consent_channel = 'email' and email_ciphertext is not null)
    or (consent_channel = 'phone' and phone_ciphertext is not null)
  ),
  check (
    acquisition_source <> 'manual_consent_import' or source_attested
  ),
  check (
    consent_expires_at is null or consent_expires_at > consent_recorded_at
  ),
  check (
    consent_state <> 'active' or (
      channel_confirmed_at is not null
      and channel_confirmation_reference is not null
      and suppression_state = 'none'
      and privacy_deleted_at is null
      and (consent_expires_at is null or consent_expires_at > channel_confirmed_at)
    )
  ),
  check (
    suppression_state = 'none' or consent_state <> 'active'
  )
);

create table public.farmer_contact_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.farmer_contacts (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  event_type text not null check (event_type in (
    'contact_created', 'consent_confirmed', 'consent_withdrawn',
    'contact_suppressed', 'privacy_deleted', 'email_handoff_prepared',
    'email_delivered'
  )),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object'
    and octet_length(details::text) <= 4096
  ),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.farmer_youtube_discovery_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  query_hash text not null check (query_hash ~ '^[0-9a-f]{64}$'),
  locale text not null references public.supported_locales (locale_code),
  region_code text not null default 'IN' check (region_code = 'IN'),
  state text not null default 'reserved' check (
    state in ('reserved', 'succeeded', 'failed')
  ),
  result_count smallint check (result_count between 0 and 10),
  failure_code text check (
    failure_code is null or failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  idempotency_key uuid not null unique,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  check (
    (state = 'reserved' and result_count is null and failure_code is null
      and completed_at is null)
    or (state = 'succeeded' and result_count is not null
      and failure_code is null and completed_at is not null)
    or (state = 'failed' and result_count = 0
      and failure_code is not null and completed_at is not null)
  )
);

create unique index farmer_contacts_owner_email_hash_idx
  on public.farmer_contacts (owner_id, email_hash)
  where email_hash is not null and privacy_deleted_at is null;
create unique index farmer_contacts_owner_phone_hash_idx
  on public.farmer_contacts (owner_id, phone_hash)
  where phone_hash is not null and privacy_deleted_at is null;
create index farmer_contacts_owner_created_idx
  on public.farmer_contacts (owner_id, created_at desc);
create index farmer_contacts_owner_consent_idx
  on public.farmer_contacts (owner_id, consent_state, suppression_state);
create index farmer_contact_events_contact_created_idx
  on public.farmer_contact_events (contact_id, created_at desc);
create index farmer_youtube_discovery_owner_requested_idx
  on public.farmer_youtube_discovery_runs (owner_id, requested_at desc);

create trigger farmer_contact_lists_set_updated_at
before update on public.farmer_contact_lists
for each row execute function public.set_updated_at();

create or replace function public.private_farmer_contact_set_updated_at()
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

create trigger farmer_contacts_set_updated_at
before update on public.farmer_contacts
for each row execute function public.private_farmer_contact_set_updated_at();

create or replace function public.record_private_farmer_contact_creation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.farmer_contact_events (
    contact_id, owner_id, event_type, details, idempotency_key
  ) values (
    new.id, new.owner_id, 'contact_created',
    jsonb_build_object('acquisitionSource', new.acquisition_source),
    gen_random_uuid()
  );
  return new;
end;
$$;

create trigger farmer_contacts_record_creation
after insert on public.farmer_contacts
for each row execute function public.record_private_farmer_contact_creation();

create or replace function public.prevent_private_farmer_contact_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Private Farmer contact events are immutable'
    using errcode = '42501', detail = 'AUDIT_IMMUTABLE';
end;
$$;

create trigger farmer_contact_events_are_immutable
before update or delete on public.farmer_contact_events
for each row execute function public.prevent_private_farmer_contact_event_mutation();

create or replace function public.sync_private_farmer_contact_suppression()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_id uuid;
  target_owner_id uuid;
  next_suppression text;
  next_event text;
begin
  if old.status is not distinct from new.status
    or new.status not in ('withdrawn', 'suppressed', 'declined', 'expired')
  then
    return new;
  end if;
  next_suppression := case
    when new.status = 'withdrawn' then 'withdrawn'
    else 'administrator'
  end;
  next_event := case
    when new.status = 'withdrawn' then 'consent_withdrawn'
    else 'contact_suppressed'
  end;
  update public.farmer_contacts contact
  set consent_state = 'withdrawn', suppression_state = next_suppression
  where contact.outreach_prospect_id = new.id
    and contact.privacy_deleted_at is null
    and (
      contact.consent_state <> 'withdrawn'
      or contact.suppression_state <> next_suppression
    )
  returning contact.id, contact.owner_id into target_id, target_owner_id;
  if found then
    insert into public.farmer_contact_events (
      contact_id, owner_id, event_type, details, idempotency_key
    ) values (
      target_id, target_owner_id, next_event,
      jsonb_build_object('outreachStatus', new.status), gen_random_uuid()
    );
  end if;
  return new;
end;
$$;

create trigger outreach_status_syncs_private_farmer_contact
after update of status on public.outreach_prospects
for each row execute function public.sync_private_farmer_contact_suppression();

create or replace function public.activate_private_farmer_contact_consent(
  outreach_prospect_id_input uuid,
  confirmation_reference_input text,
  confirmed_at_input timestamptz,
  expires_at_input timestamptz,
  idempotency_key_input uuid
)
returns table(code text, contact_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.farmer_contacts%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('private_farmer_contacts') then
    raise exception 'Private Farmer contacts are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if outreach_prospect_id_input is null
    or idempotency_key_input is null
    or confirmed_at_input is null
    or confirmed_at_input < now() - interval '30 days'
    or confirmed_at_input > now() + interval '5 minutes'
    or (expires_at_input is not null and expires_at_input <= confirmed_at_input)
    or char_length(btrim(confirmation_reference_input)) not between 8 and 500
  then
    raise exception 'Invalid contact confirmation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select contact.* into target
  from public.farmer_contacts contact
  where contact.outreach_prospect_id = outreach_prospect_id_input
    and contact.consent_channel = 'email'
    and contact.suppression_state = 'none'
    and contact.privacy_deleted_at is null
  for update;
  if not found then
    return query select 'NO_PRIVATE_CONTACT', null::uuid;
    return;
  end if;
  if exists (
    select 1 from public.farmer_contact_events event
    where event.idempotency_key = idempotency_key_input
      and event.contact_id = target.id
  ) then
    return query select 'IDEMPOTENT_REPLAY', target.id;
    return;
  end if;
  update public.farmer_contacts contact
  set consent_state = 'active', review_state = 'approved',
    channel_confirmed_at = confirmed_at_input,
    channel_confirmation_reference = btrim(confirmation_reference_input),
    consent_expires_at = expires_at_input
  where contact.id = target.id;
  insert into public.farmer_contact_events (
    contact_id, owner_id, event_type, details, idempotency_key
  ) values (
    target.id, target.owner_id, 'consent_confirmed',
    jsonb_build_object('channel', 'email', 'purpose', target.consent_purpose),
    idempotency_key_input
  );
  return query select 'CONSENT_CONFIRMED', target.id;
end;
$$;

create or replace function public.update_private_farmer_contact_state(
  contact_id_input uuid,
  owner_id_input uuid,
  operation_input text,
  reason_input text,
  idempotency_key_input uuid
)
returns table(code text, contact_id uuid, consent_state text, suppression_state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.farmer_contacts%rowtype;
  event_type_value text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('private_farmer_contacts') then
    raise exception 'Private Farmer contacts are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if contact_id_input is null or owner_id_input is null
    or idempotency_key_input is null
    or operation_input not in ('withdraw', 'suppress', 'privacy_delete')
    or char_length(btrim(reason_input)) not between 5 and 500
  then
    raise exception 'Invalid private contact operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select contact.* into target
  from public.farmer_contacts contact
  where contact.id = contact_id_input and contact.owner_id = owner_id_input
  for update;
  if not found then
    raise exception 'Private Farmer contact not found'
      using errcode = 'P0002', detail = 'CONTACT_NOT_FOUND';
  end if;
  if exists (
    select 1 from public.farmer_contact_events event
    where event.idempotency_key = idempotency_key_input
  ) then
    return query select 'IDEMPOTENT_REPLAY', target.id,
      target.consent_state, target.suppression_state;
    return;
  end if;
  if operation_input = 'privacy_delete' then
    update public.farmer_contacts contact
    set display_name_ciphertext = null, email_ciphertext = null,
      email_hash = null, phone_ciphertext = null, phone_hash = null,
      source_reference = '[privacy deleted]', consent_state = 'withdrawn',
      suppression_state = 'privacy_deleted', privacy_deleted_at = now()
    where contact.id = target.id;
    event_type_value := 'privacy_deleted';
  elsif operation_input = 'suppress' then
    update public.farmer_contacts contact
    set consent_state = 'withdrawn', suppression_state = 'administrator'
    where contact.id = target.id;
    event_type_value := 'contact_suppressed';
  else
    update public.farmer_contacts contact
    set consent_state = 'withdrawn', suppression_state = 'withdrawn'
    where contact.id = target.id;
    event_type_value := 'consent_withdrawn';
  end if;
  insert into public.farmer_contact_events (
    contact_id, owner_id, event_type, details, idempotency_key
  ) values (
    target.id, target.owner_id, event_type_value,
    jsonb_build_object('reason', left(btrim(reason_input), 500)),
    idempotency_key_input
  );
  return query
    select upper(operation_input) || '_RECORDED', contact.id,
      contact.consent_state, contact.suppression_state
    from public.farmer_contacts contact where contact.id = target.id;
end;
$$;

create or replace function public.prepare_private_farmer_contact_email(
  contact_id_input uuid,
  owner_id_input uuid,
  email_input text,
  private_email_hash_input text,
  application_origin_input text,
  message_input text,
  idempotency_key_input uuid
)
returns table(code text, contact_id uuid, prospect_id uuid, outbox_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.farmer_contacts%rowtype;
  created_prospect_id uuid;
  created_candidate_id uuid;
  created_consent_id uuid;
  created_outbox_id uuid;
  outreach_email_hash text;
  expires_at_value timestamptz;
  source_url_value text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('private_farmer_contacts')
    or not public.is_ecosystem_release_enabled('outreach_agent')
  then
    raise exception 'Private Farmer email handoff is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if contact_id_input is null or owner_id_input is null
    or idempotency_key_input is null
    or private_email_hash_input !~ '^[0-9a-f]{64}$'
    or btrim(email_input) !~* '^[A-Z0-9._%+''-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    or char_length(btrim(message_input)) not between 20 and 1500
    or not (
      rtrim(application_origin_input, '/') ~ '^https://[A-Za-z0-9.-]+(?::443)?$'
      or rtrim(application_origin_input, '/') ~
        '^http://(localhost|127\.0\.0\.1)(:[0-9]{2,5})?$'
    )
  then
    raise exception 'Invalid private Farmer email handoff'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select contact.* into target
  from public.farmer_contacts contact
  where contact.id = contact_id_input and contact.owner_id = owner_id_input
  for update;
  if not found then
    raise exception 'Private Farmer contact not found'
      using errcode = 'P0002', detail = 'CONTACT_NOT_FOUND';
  end if;
  if target.email_hash is distinct from private_email_hash_input
    or target.email_ciphertext is null
    or target.consent_channel <> 'email'
    or target.consent_purpose <> 'farmerbook_invitation'
    or target.consent_state <> 'active'
    or target.channel_confirmed_at is null
    or target.channel_confirmation_reference is null
    or target.suppression_state <> 'none'
    or target.privacy_deleted_at is not null
    or (target.consent_expires_at is not null and target.consent_expires_at <= now())
  then
    raise exception 'Confirmed active email consent is required'
      using errcode = '42501', detail = 'CONSENT_REQUIRED';
  end if;
  if target.outreach_prospect_id is not null then
    select outbox.id into created_outbox_id
    from public.outreach_outbox outbox
    where outbox.prospect_id = target.outreach_prospect_id
      and outbox.purpose = 'farmerbook_introduction'
    order by outbox.created_at desc limit 1;
    return query select 'ALREADY_PREPARED', target.id,
      target.outreach_prospect_id, created_outbox_id;
    return;
  end if;
  source_url_value := rtrim(application_origin_input, '/') || '/join/farmer-interest';
  expires_at_value := least(
    coalesce(target.consent_expires_at, now() + interval '180 days'),
    now() + interval '365 days'
  );
  outreach_email_hash := public.sha256_normalized_contact(btrim(email_input));

  insert into public.outreach_prospects (
    created_by, normalized_source_url, application_origin, source_type,
    source_hash, operator_context, status, suggested_role, preferred_locale,
    introduction_draft, consent_channel, consent_granted_at,
    creation_idempotency_key, creation_fingerprint
  ) values (
    owner_id_input, source_url_value, rtrim(application_origin_input, '/'),
    'consented_private_database',
    encode(extensions.digest(target.id::text, 'sha256'), 'hex'),
    left(concat_ws(' | ', target.district, target.state,
      'Consent-evidenced private Farmer contact'), 8000),
    'consented', 'farmer', target.preferred_locale, btrim(message_input),
    'email', target.channel_confirmed_at, idempotency_key_input,
    encode(extensions.digest(
      target.id::text || ':' || private_email_hash_input || ':' || message_input,
      'sha256'
    ), 'hex')
  ) returning id into created_prospect_id;

  insert into public.outreach_contact_candidates (
    prospect_id, channel, private_value, value_hash, source_url,
    evidence_excerpt, evidence_origin, explicitly_for_business_enquiries,
    business_contact_confirmed, confirmed_by, confirmed_at
  ) values (
    created_prospect_id, 'email', btrim(email_input), outreach_email_hash,
    source_url_value,
    'The founder administrator recorded purpose-matched consent and independent channel confirmation.',
    'consented_private_database', true, true, owner_id_input,
    target.channel_confirmed_at
  ) returning id into created_candidate_id;

  insert into public.outreach_consents (
    prospect_id, contact_candidate_id, channel, purpose,
    statement_version, statement_text, capture_method, provider,
    provider_receipt_id, granted_at, expires_at, idempotency_key
  ) values (
    created_prospect_id, created_candidate_id, 'email',
    'farmerbook_introduction', target.consent_text_version,
    'I consent to receive a FarmerBook agriculture-network introduction by email and can withdraw at any time.',
    'verified_provider', 'farmerbook-private-contact-database',
    left(target.channel_confirmation_reference, 300),
    target.channel_confirmed_at, expires_at_value, gen_random_uuid()
  ) returning id into created_consent_id;

  insert into public.outreach_outbox (
    prospect_id, contact_candidate_id, consent_id, channel, purpose,
    message_body, expires_at, idempotency_key
  ) values (
    created_prospect_id, created_candidate_id, created_consent_id, 'email',
    'farmerbook_introduction', btrim(message_input),
    least(expires_at_value, now() + interval '7 days'), gen_random_uuid()
  ) returning id into created_outbox_id;

  update public.outreach_prospects prospect
  set status = 'introduction_queued', next_action_at = now()
  where prospect.id = created_prospect_id;
  update public.farmer_contacts contact
  set outreach_prospect_id = created_prospect_id
  where contact.id = target.id;

  insert into public.outreach_events (
    prospect_id, actor_id, event_type, previous_status, new_status,
    note, idempotency_key
  ) values (
    created_prospect_id, owner_id_input, 'introduction_queued',
    'consented', 'introduction_queued',
    'A consent-evidenced private Farmer contact was prepared for the approved provider.',
    gen_random_uuid()
  );
  insert into public.farmer_contact_events (
    contact_id, owner_id, event_type, details, idempotency_key
  ) values (
    target.id, target.owner_id, 'email_handoff_prepared',
    jsonb_build_object('purpose', 'farmerbook_invitation'),
    idempotency_key_input
  );
  return query select 'EMAIL_PREPARED', target.id,
    created_prospect_id, created_outbox_id;
end;
$$;

create or replace function public.reserve_private_farmer_youtube_search(
  owner_id_input uuid,
  query_hash_input text,
  locale_input text,
  idempotency_key_input uuid
)
returns table(code text, search_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.farmer_youtube_discovery_runs%rowtype;
  created_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('private_farmer_contacts') then
    raise exception 'Private Farmer contacts are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if owner_id_input is null or idempotency_key_input is null
    or query_hash_input !~ '^[0-9a-f]{64}$'
    or not exists (
      select 1 from public.profiles profile
      where profile.id = owner_id_input and profile.status = 'active'
    )
    or not exists (
      select 1 from public.supported_locales locale
      where locale.locale_code = locale_input and locale.enabled
    )
  then
    raise exception 'Invalid YouTube discovery reservation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select run.* into existing
  from public.farmer_youtube_discovery_runs run
  where run.idempotency_key = idempotency_key_input;
  if found then
    if existing.owner_id <> owner_id_input
      or existing.query_hash <> query_hash_input
      or existing.locale <> locale_input
    then
      raise exception 'YouTube discovery idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id;
    return;
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended('private-farmer-youtube-discovery', 0)
  );
  if (
    select count(*) from public.farmer_youtube_discovery_runs run
    where run.owner_id = owner_id_input
      and run.requested_at >= date_trunc('day', now())
  ) >= 10 or (
    select count(*) from public.farmer_youtube_discovery_runs run
    where run.owner_id = owner_id_input
      and run.requested_at >= date_trunc('month', now())
  ) >= 100 or (
    select count(*) from public.farmer_youtube_discovery_runs run
    where run.requested_at >= date_trunc('day', now())
  ) >= 100
  then
    raise exception 'Private Farmer YouTube discovery quota exceeded'
      using errcode = '42501', detail = 'SEARCH_QUOTA_EXCEEDED';
  end if;
  insert into public.farmer_youtube_discovery_runs (
    owner_id, query_hash, locale, idempotency_key
  ) values (
    owner_id_input, query_hash_input, locale_input, idempotency_key_input
  ) returning id into created_id;
  return query select 'RESERVED', created_id;
end;
$$;

create or replace function public.complete_private_farmer_youtube_search(
  search_id_input uuid,
  owner_id_input uuid,
  result_count_input integer,
  failure_code_input text
)
returns table(code text, search_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.farmer_youtube_discovery_runs%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  select run.* into target
  from public.farmer_youtube_discovery_runs run
  where run.id = search_id_input and run.owner_id = owner_id_input
  for update;
  if not found then
    raise exception 'YouTube discovery reservation not found'
      using errcode = 'P0002', detail = 'SEARCH_NOT_FOUND';
  end if;
  if target.state <> 'reserved' then
    return query select 'IDEMPOTENT_REPLAY', target.id;
    return;
  end if;
  if result_count_input not between 0 and 10
    or (failure_code_input is not null
      and failure_code_input !~ '^[A-Z0-9_]{2,80}$')
  then
    raise exception 'Invalid YouTube discovery completion'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  update public.farmer_youtube_discovery_runs run
  set state = case when failure_code_input is null then 'succeeded' else 'failed' end,
    result_count = case when failure_code_input is null then result_count_input else 0 end,
    failure_code = failure_code_input,
    completed_at = now()
  where run.id = target.id;
  return query select
    case when failure_code_input is null then 'SUCCEEDED' else 'FAILED' end,
    target.id;
end;
$$;

alter table public.farmer_contact_lists enable row level security;
alter table public.farmer_contacts enable row level security;
alter table public.farmer_contact_events enable row level security;
alter table public.farmer_youtube_discovery_runs enable row level security;

revoke all on table public.farmer_contact_lists,
  public.farmer_contacts,
  public.farmer_contact_events,
  public.farmer_youtube_discovery_runs
from public, anon, authenticated;

revoke all on function public.private_farmer_contact_set_updated_at(),
  public.record_private_farmer_contact_creation(),
  public.prevent_private_farmer_contact_event_mutation(),
  public.sync_private_farmer_contact_suppression(),
  public.activate_private_farmer_contact_consent(
    uuid, text, timestamptz, timestamptz, uuid
  ),
  public.update_private_farmer_contact_state(uuid, uuid, text, text, uuid),
  public.prepare_private_farmer_contact_email(
    uuid, uuid, text, text, text, text, uuid
  ),
  public.reserve_private_farmer_youtube_search(uuid, text, text, uuid),
  public.complete_private_farmer_youtube_search(uuid, uuid, integer, text)
from public, anon, authenticated;

grant select, insert, update, delete on public.farmer_contact_lists to service_role;
grant select, insert, update, delete on public.farmer_contacts to service_role;
grant select, insert on public.farmer_contact_events to service_role;
grant select, insert, update on public.farmer_youtube_discovery_runs to service_role;

grant execute on function public.activate_private_farmer_contact_consent(
  uuid, text, timestamptz, timestamptz, uuid
) to service_role;
grant execute on function public.update_private_farmer_contact_state(
  uuid, uuid, text, text, uuid
) to service_role;
grant execute on function public.prepare_private_farmer_contact_email(
  uuid, uuid, text, text, text, text, uuid
) to service_role;
grant execute on function public.reserve_private_farmer_youtube_search(
  uuid, text, text, uuid
) to service_role;
grant execute on function public.complete_private_farmer_youtube_search(
  uuid, uuid, integer, text
) to service_role;
