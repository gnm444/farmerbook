-- Verified provider replies and delivery feedback stop automation immediately.
-- Raw reply bodies are classified transiently by the Worker and are not stored.

alter table public.outreach_events
  drop constraint if exists outreach_events_event_type_check;
alter table public.outreach_events
  add constraint outreach_events_event_type_check check (event_type in (
    'prospect_created', 'evidence_recorded', 'consent_blocked',
    'consent_requested', 'consent_granted', 'consent_withdrawn',
    'qualified', 'introduction_queued', 'delivered', 'delivery_failed',
    'followup_queued', 'invitation_issued', 'reply_received', 'opt_out',
    'complaint', 'hard_bounce', 'soft_bounce', 'onboarding_started',
    'joined', 'declined', 'expired', 'suppressed', 'deleted'
  ));

alter table public.outreach_outbox
  drop constraint if exists outreach_outbox_purpose_check;
alter table public.outreach_outbox
  add constraint outreach_outbox_purpose_check check (purpose in (
    'farmerbook_introduction', 'onboarding_followup', 'onboarding_reply',
    'consent_confirmation'
  ));

create table public.outreach_provider_events (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null
    references public.outreach_prospects (id) on delete cascade,
  contact_candidate_id uuid not null
    references public.outreach_contact_candidates (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  event_type text not null check (event_type in (
    'reply', 'declined', 'complaint', 'hard_bounce', 'soft_bounce'
  )),
  provider text not null check (char_length(provider) between 2 and 80),
  provider_event_id text not null check (char_length(provider_event_id) between 1 and 300),
  contact_hash text not null check (contact_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  reply_intent text check (reply_intent is null or reply_intent in (
    'stop', 'interested', 'onboarding_question', 'other'
  )),
  question_code text check (question_code is null or question_code in (
    'what_is_farmerbook', 'how_to_join', 'who_can_join', 'cost',
    'privacy', 'languages'
  )),
  response_requested boolean not null default false,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id),
  check (
    (
      event_type = 'reply'
      and reply_intent is not null
      and (
        (reply_intent = 'onboarding_question' and question_code is not null and response_requested)
        or (reply_intent <> 'onboarding_question' and question_code is null and not response_requested)
      )
    )
    or (
      event_type <> 'reply'
      and reply_intent is null
      and question_code is null
      and not response_requested
    )
  )
);

alter table public.outreach_outbox
  add column inbound_provider_event_id uuid
  references public.outreach_provider_events (id) on delete restrict;
create unique index outreach_outbox_one_inbound_reply_idx
  on public.outreach_outbox (inbound_provider_event_id)
  where purpose = 'onboarding_reply';

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

create or replace function public.validate_outreach_outbox_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.purpose = 'consent_confirmation' then
    if new.consent_id is not null or new.inbound_provider_event_id is not null
      or not exists (
        select 1
        from public.outreach_contact_candidates contact
        where contact.id = new.contact_candidate_id
          and contact.prospect_id = new.prospect_id
          and not exists (
            select 1 from public.outreach_suppressions suppression
            where suppression.value_hash = contact.value_hash
          )
      )
    then
      raise exception 'Consent confirmation target is invalid'
        using errcode = '42501', detail = 'CONSENT_TARGET_INVALID';
    end if;
  elsif new.purpose = 'onboarding_reply' then
    if new.consent_id is not null
      or new.inbound_provider_event_id is null
      or not exists (
        select 1
        from public.outreach_provider_events provider_event
        join public.outreach_contact_candidates contact
          on contact.id = new.contact_candidate_id
        where provider_event.id = new.inbound_provider_event_id
          and provider_event.event_type = 'reply'
          and provider_event.reply_intent = 'onboarding_question'
          and provider_event.response_requested
          and provider_event.question_code is not null
          and provider_event.prospect_id = new.prospect_id
          and provider_event.contact_candidate_id = new.contact_candidate_id
          and provider_event.channel = new.channel
          and provider_event.occurred_at <= now() + interval '5 minutes'
          and provider_event.occurred_at > now() - interval '30 days'
          and not exists (
            select 1 from public.outreach_suppressions suppression
            where suppression.value_hash = contact.value_hash
          )
      )
    then
      raise exception 'A verified inbound question is required'
        using errcode = '42501', detail = 'REPLY_AUTHORIZATION_REQUIRED';
    end if;
  elsif new.inbound_provider_event_id is not null
    or new.consent_id is null
    or not public.has_active_outreach_consent(
      new.prospect_id, new.consent_id, new.channel, new.purpose
    )
  then
    raise exception 'Active consent is required'
      using errcode = '42501', detail = 'CONSENT_REQUIRED';
  end if;
  return new;
end;
$$;

create or replace function public.record_outreach_provider_event(
  prospect_id_input uuid,
  event_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, prospect_status text, response_outbox_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact public.outreach_contact_candidates%rowtype;
  prospect public.outreach_prospects%rowtype;
  existing_event public.outreach_provider_events%rowtype;
  provider_event_id_value uuid;
  response_outbox_id_value uuid;
  event_type_value text := event_input ->> 'eventType';
  reply_intent_value text := nullif(event_input ->> 'replyIntent', '');
  question_code_value text := nullif(event_input ->> 'questionCode', '');
  response_requested_value boolean := coalesce(
    (event_input ->> 'responseRequested')::boolean, false
  );
  occurred_at_value timestamptz := (event_input ->> 'occurredAt')::timestamptz;
  next_status text;
  suppression_reason text;
  audit_event_type text;
  response_message text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if prospect_id_input is null
    or idempotency_key_input is null
    or jsonb_typeof(event_input) <> 'object'
    or event_type_value not in (
      'reply', 'declined', 'complaint', 'hard_bounce', 'soft_bounce'
    )
    or nullif(event_input ->> 'provider', '') is null
    or char_length(event_input ->> 'provider') not between 2 and 80
    or nullif(event_input ->> 'providerEventId', '') is null
    or char_length(event_input ->> 'providerEventId') > 300
    or (event_input ->> 'contactHash') !~ '^[0-9a-f]{64}$'
    or (event_input ->> 'contactCandidateId') is null
    or (event_input ->> 'channel') not in ('email', 'sms', 'whatsapp')
    or occurred_at_value < now() - interval '30 days'
    or occurred_at_value > now() + interval '5 minutes'
    or (
      event_type_value = 'reply'
      and (
        reply_intent_value not in ('stop', 'interested', 'onboarding_question', 'other')
        or (
          reply_intent_value = 'onboarding_question'
          and (
            question_code_value not in (
              'what_is_farmerbook', 'how_to_join', 'who_can_join', 'cost',
              'privacy', 'languages'
            )
            or not response_requested_value
          )
        )
        or (
          reply_intent_value <> 'onboarding_question'
          and (question_code_value is not null or response_requested_value)
        )
      )
    )
    or (
      event_type_value <> 'reply'
      and (
        reply_intent_value is not null
        or question_code_value is not null
        or response_requested_value
      )
    )
  then
    raise exception 'Invalid provider lifecycle event'
      using errcode = '22023', detail = 'INVALID_PROVIDER_EVENT';
  end if;

  select provider_event.* into existing_event
  from public.outreach_provider_events provider_event
  where provider_event.idempotency_key = idempotency_key_input;
  if found then
    return query
      select 'IDEMPOTENT_REPLAY', current_prospect.status,
        response_outbox.id
      from public.outreach_prospects current_prospect
      left join public.outreach_outbox response_outbox
        on response_outbox.inbound_provider_event_id = existing_event.id
      where current_prospect.id = existing_event.prospect_id;
    return;
  end if;

  select candidate.* into contact
  from public.outreach_contact_candidates candidate
  where candidate.id = (event_input ->> 'contactCandidateId')::uuid
    and candidate.prospect_id = prospect_id_input
    and candidate.value_hash = event_input ->> 'contactHash'
    and (
      (candidate.channel = 'email' and event_input ->> 'channel' = 'email')
      or (
        candidate.channel = 'phone'
        and event_input ->> 'channel' in ('sms', 'whatsapp')
      )
    )
  for update;
  if not found then
    raise exception 'Provider event contact not found'
      using errcode = 'P0002', detail = 'CONTACT_NOT_FOUND';
  end if;
  select current_prospect.* into prospect
  from public.outreach_prospects current_prospect
  where current_prospect.id = prospect_id_input
  for update;

  insert into public.outreach_provider_events (
    prospect_id, contact_candidate_id, channel, event_type, provider,
    provider_event_id, contact_hash, occurred_at, reply_intent,
    question_code, response_requested, idempotency_key
  ) values (
    prospect_id_input, contact.id, event_input ->> 'channel', event_type_value,
    left(event_input ->> 'provider', 80),
    left(event_input ->> 'providerEventId', 300), contact.value_hash,
    occurred_at_value, reply_intent_value, question_code_value,
    response_requested_value, idempotency_key_input
  )
  returning id into provider_event_id_value;

  next_status := prospect.status;
  audit_event_type := case event_type_value
    when 'reply' then 'reply_received'
    when 'declined' then 'declined'
    when 'complaint' then 'complaint'
    when 'hard_bounce' then 'hard_bounce'
    else 'soft_bounce'
  end;
  if event_type_value = 'declined' then
    next_status := 'declined';
    suppression_reason := 'declined';
  elsif event_type_value = 'complaint' then
    next_status := 'suppressed';
    suppression_reason := 'complaint';
  elsif event_type_value = 'hard_bounce' then
    next_status := 'suppressed';
    suppression_reason := 'hard_bounce';
  elsif event_type_value = 'reply' and reply_intent_value = 'stop' then
    next_status := 'withdrawn';
    suppression_reason := 'withdrawn';
    audit_event_type := 'opt_out';
  elsif event_type_value = 'reply'
    and prospect.status in ('introduced', 'introduction_queued', 'consented')
  then
    next_status := 'onboarding';
  end if;

  if event_type_value = 'reply' then
    update public.outreach_outbox
    set state = 'cancelled', last_failure_code = 'RECIPIENT_REPLIED'
    where prospect_id = prospect_id_input
      and purpose = 'onboarding_followup'
      and state in ('pending', 'processing');
    update public.outreach_prospects
    set next_action_at = null
    where id = prospect_id_input;
  end if;

  if suppression_reason is not null then
    update public.outreach_consents
    set withdrawn_at = coalesce(withdrawn_at, occurred_at_value),
      withdrawal_reason = coalesce(
        withdrawal_reason,
        'Provider lifecycle event ended outreach permission.'
      )
    where prospect_id = prospect_id_input and withdrawn_at is null;
    insert into public.outreach_suppressions (
      value_hash, reason, source_identity_hash
    ) values (
      contact.value_hash, suppression_reason, null
    ) on conflict (value_hash) do nothing;
    update public.outreach_outbox
    set state = 'cancelled', last_failure_code = upper(event_type_value)
    where prospect_id = prospect_id_input
      and state in ('pending', 'processing');
    update public.outreach_contact_candidates
    set private_value = case
      when suppression_reason = 'hard_bounce' then '[hard_bounce]'
      else '[withdrawn]'
    end
    where id = contact.id;
  end if;

  update public.outreach_prospects
  set status = next_status,
    consent_withdrawn_at = case
      when suppression_reason is not null
        then coalesce(consent_withdrawn_at, occurred_at_value)
      else consent_withdrawn_at
    end,
    next_action_at = case when suppression_reason is not null then null else next_action_at end
  where id = prospect_id_input;

  if event_type_value = 'reply'
    and reply_intent_value = 'onboarding_question'
    and suppression_reason is null
    and prospect.status not in ('withdrawn', 'suppressed', 'declined', 'expired')
    and not exists (
      select 1 from public.outreach_suppressions suppression
      where suppression.value_hash = contact.value_hash
    )
  then
    response_message := case question_code_value
      when 'what_is_farmerbook' then
        'FarmerBook connects farmers, customers, wholesalers and agricultural businesses so they can build profiles and discover relevant produce, services and people. Results are not guaranteed. Reply STOP at any time.'
      when 'how_to_join' then
        'Use the private FarmerBook invitation already sent to create or connect your account, then complete the guided onboarding steps. Reply STOP at any time.'
      when 'who_can_join' then
        'Farmers, customers, wholesalers and agriculture-related businesses can join FarmerBook and choose the role that describes them. Reply STOP at any time.'
      when 'cost' then
        'FarmerBook does not promise income, customers or prices. Any future paid feature will show its price and terms before you choose it. Reply STOP at any time.'
      when 'privacy' then
        prospect.application_origin || '/privacy explains FarmerBook data use, retention and deletion choices. Reply STOP at any time.'
      when 'languages' then
        'FarmerBook supports a 23-language interface. English is source-reviewed; other languages remain visibly Beta until native review. Reply STOP at any time.'
    end;
    insert into public.outreach_outbox (
      prospect_id, contact_candidate_id, consent_id, channel, purpose,
      message_body, expires_at, idempotency_key, inbound_provider_event_id
    ) values (
      prospect_id_input, contact.id, null, event_input ->> 'channel',
      'onboarding_reply', response_message, now() + interval '48 hours',
      gen_random_uuid(), provider_event_id_value
    )
    returning id into response_outbox_id_value;
  end if;

  insert into public.outreach_events (
    prospect_id, event_type, previous_status, new_status, note,
    idempotency_key
  ) values (
    prospect_id_input, audit_event_type, prospect.status, next_status,
    case
      when audit_event_type = 'reply_received'
        then 'A verified provider reply was classified without storing its raw text.'
      else 'A verified provider lifecycle event stopped or updated outreach.'
    end,
    idempotency_key_input
  );

  return query select 'EVENT_RECORDED', next_status, response_outbox_id_value;
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
      else 'CONSENT_OR_REPLY_AUTHORIZATION_ENDED'
    end
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

alter table public.outreach_provider_events enable row level security;
revoke all on table public.outreach_provider_events
  from public, anon, authenticated;
grant select, insert on public.outreach_provider_events to service_role;

revoke all on function public.has_active_outreach_reply_authorization(uuid)
  from public, anon, authenticated;
revoke all on function public.record_outreach_provider_event(uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.record_outreach_provider_event(uuid, jsonb, uuid)
  to service_role;
