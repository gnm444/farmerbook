-- Complete the production-compatibility bridge with the security triggers,
-- invitation redemption path, and administrator operations used by the app.
-- This migration remains inert: delivery is still paused and the release
-- control remains disabled by the preceding compatibility migration.

create table if not exists public.outreach_agent_runs (
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

create table if not exists public.outreach_admin_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete restrict,
  prospect_id uuid references public.outreach_prospects (id) on delete set null,
  outbox_id uuid references public.outreach_outbox (id) on delete set null,
  event_type text not null check (event_type in (
    'delivery_paused', 'delivery_resumed', 'prospect_suppressed',
    'privacy_deleted', 'retry_queued'
  )),
  reason text not null check (char_length(reason) between 5 and 500),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.outreach_set_updated_at_and_revision()
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

create or replace function public.outreach_set_outbox_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.prevent_outreach_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Outreach audit events are immutable' using errcode = '42501';
end;
$$;

drop trigger if exists outreach_prospects_set_updated_at_and_revision
  on public.outreach_prospects;
create trigger outreach_prospects_set_updated_at_and_revision
before update on public.outreach_prospects
for each row execute function public.outreach_set_updated_at_and_revision();

drop trigger if exists outreach_outbox_set_updated_at on public.outreach_outbox;
create trigger outreach_outbox_set_updated_at
before update on public.outreach_outbox
for each row execute function public.outreach_set_outbox_updated_at();

drop trigger if exists outreach_events_are_immutable on public.outreach_events;
create trigger outreach_events_are_immutable
before update or delete on public.outreach_events
for each row execute function public.prevent_outreach_event_mutation();

drop trigger if exists outreach_admin_events_are_immutable
  on public.outreach_admin_events;
create trigger outreach_admin_events_are_immutable
before update or delete on public.outreach_admin_events
for each row execute function public.prevent_outreach_event_mutation();

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

drop trigger if exists outreach_outbox_requires_active_consent
  on public.outreach_outbox;
create trigger outreach_outbox_requires_active_consent
before insert or update of prospect_id, contact_candidate_id, consent_id,
  channel, purpose, state, inbound_provider_event_id
on public.outreach_outbox
for each row when (new.state in ('pending', 'processing'))
execute function public.validate_outreach_outbox_consent();

create or replace function public.validate_outreach_invitation(
  token_hash_input text
)
returns table(code text, invitation_expires_at timestamptz)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if token_hash_input !~ '^[0-9a-f]{64}$'
    or not public.is_ecosystem_release_enabled('outreach_agent')
  then
    return query select 'INVALID', null::timestamptz;
    return;
  end if;
  return query
    select 'ACTIVE', invitation.expires_at
    from public.outreach_invitations invitation
    join public.outreach_prospects prospect on prospect.id = invitation.prospect_id
    where invitation.token_hash = token_hash_input
      and prospect.engagement_type = 'membership'
      and invitation.expires_at > now()
      and invitation.redeemed_at is null
      and invitation.revoked_at is null;
  if not found then
    return query select 'INVALID', null::timestamptz;
  end if;
end;
$$;

create or replace function public.redeem_outreach_invitation(
  token_hash_input text,
  profile_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, prospect_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.outreach_invitations%rowtype;
  profile_record public.profiles%rowtype;
  existing_link public.outreach_account_links%rowtype;
  next_status text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if token_hash_input !~ '^[0-9a-f]{64}$'
    or profile_id_input is null or idempotency_key_input is null
  then
    raise exception 'Invalid invitation redemption'
      using errcode = '22023', detail = 'INVALID_INVITATION';
  end if;
  select profile.* into profile_record
  from public.profiles profile
  where profile.id = profile_id_input and profile.status = 'active';
  if not found then
    raise exception 'Active profile not found'
      using errcode = 'P0002', detail = 'PROFILE_NOT_FOUND';
  end if;
  select candidate.* into invitation
  from public.outreach_invitations candidate
  join public.outreach_prospects prospect on prospect.id = candidate.prospect_id
  where candidate.token_hash = token_hash_input
    and prospect.engagement_type = 'membership'
  for update of candidate;
  if not found or invitation.expires_at <= now()
    or invitation.revoked_at is not null
  then
    raise exception 'Invitation is unavailable'
      using errcode = 'P0002', detail = 'INVITATION_UNAVAILABLE';
  end if;
  if invitation.redeemed_at is not null then
    if invitation.redeemed_by = profile_id_input then
      return query
        select 'IDEMPOTENT_REPLAY', prospect.status
        from public.outreach_prospects prospect
        where prospect.id = invitation.prospect_id;
      return;
    end if;
    raise exception 'Invitation was already used'
      using errcode = '22023', detail = 'INVITATION_ALREADY_USED';
  end if;
  select link.* into existing_link
  from public.outreach_account_links link
  where link.prospect_id = invitation.prospect_id
     or link.profile_id = profile_id_input
  limit 1;
  if found then
    if existing_link.prospect_id = invitation.prospect_id
      and existing_link.profile_id = profile_id_input
    then
      return query
        select 'IDEMPOTENT_REPLAY', prospect.status
        from public.outreach_prospects prospect
        where prospect.id = invitation.prospect_id;
      return;
    end if;
    raise exception 'Invitation conflicts with an existing account link'
      using errcode = '22023', detail = 'ACCOUNT_LINK_CONFLICT';
  end if;
  update public.outreach_invitations
  set redeemed_by = profile_id_input, redeemed_at = now()
  where id = invitation.id;
  update public.outreach_invitations
  set revoked_at = coalesce(revoked_at, now())
  where prospect_id = invitation.prospect_id
    and id <> invitation.id and redeemed_at is null;
  next_status := case when profile_record.onboarding_complete
    then 'joined' else 'onboarding' end;
  insert into public.outreach_account_links (
    prospect_id, profile_id, invitation_id, joined_at
  ) values (
    invitation.prospect_id, profile_id_input, invitation.id,
    case when profile_record.onboarding_complete then now() else null end
  );
  update public.outreach_prospects
  set status = next_status, next_action_at = null
  where id = invitation.prospect_id
    and status not in ('withdrawn', 'suppressed', 'declined', 'expired');
  update public.outreach_outbox
  set state = 'cancelled', last_failure_code = 'ACCOUNT_LINKED'
  where prospect_id = invitation.prospect_id
    and purpose = 'onboarding_followup'
    and state in ('pending', 'processing');
  insert into public.outreach_events (
    prospect_id, actor_id, event_type, new_status, note, idempotency_key
  ) values (
    invitation.prospect_id, profile_id_input,
    case when profile_record.onboarding_complete then 'joined'
      else 'onboarding_started' end,
    next_status, 'A signed invitation was redeemed by an authenticated account.',
    idempotency_key_input
  ) on conflict (idempotency_key) do nothing;
  return query select 'INVITATION_REDEEMED', next_status;
end;
$$;

create or replace function public.sync_outreach_join_on_profile_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.onboarding_complete and not old.onboarding_complete then
    with linked as (
      update public.outreach_account_links link
      set joined_at = coalesce(link.joined_at, now())
      where link.profile_id = new.id returning link.prospect_id
    ), joined as (
      update public.outreach_prospects prospect
      set status = 'joined', next_action_at = null
      where prospect.id in (select linked.prospect_id from linked)
        and prospect.status not in ('withdrawn', 'suppressed', 'declined', 'expired')
      returning prospect.id
    )
    insert into public.outreach_events (
      prospect_id, actor_id, event_type, new_status, note, idempotency_key
    )
    select joined.id, new.id, 'joined', 'joined',
      'The linked account completed FarmerBook onboarding.', gen_random_uuid()
    from joined;
  end if;
  return new;
end;
$$;

create or replace function public.revoke_outreach_invitations_on_terminal_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('withdrawn', 'suppressed', 'declined', 'expired')
    and new.status is distinct from old.status
  then
    update public.outreach_invitations invitation
    set revoked_at = coalesce(invitation.revoked_at, now())
    where invitation.prospect_id = new.id and invitation.redeemed_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_outreach_join_after_profile_completion
  on public.profiles;
create trigger sync_outreach_join_after_profile_completion
after update of onboarding_complete on public.profiles
for each row execute function public.sync_outreach_join_on_profile_completion();

drop trigger if exists revoke_outreach_invitations_after_terminal_status
  on public.outreach_prospects;
create trigger revoke_outreach_invitations_after_terminal_status
after update of status on public.outreach_prospects
for each row execute function public.revoke_outreach_invitations_on_terminal_status();

create or replace function public.list_outreach_prospects(limit_input integer default 50)
returns table(
  id uuid, source_url text, source_type text, business_name text, status text,
  suggested_role text, preferred_locale text, category_slugs text[],
  introduction_draft text, consent_channel text,
  consent_granted_at timestamptz, consent_withdrawn_at timestamptz,
  retention_expires_at timestamptz, revision integer,
  created_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer set search_path = ''
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
  order by prospect.priority_tier, prospect.created_at desc
  limit least(greatest(coalesce(limit_input, 50), 1), 100);
end;
$$;

create or replace function public.outreach_dashboard_summary()
returns table(status text, prospect_count bigint)
language plpgsql stable security definer set search_path = ''
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
  return query select prospect.status, count(*)
  from public.outreach_prospects prospect group by prospect.status;
end;
$$;

create or replace function public.set_outreach_delivery_pause(
  paused_input boolean, reason_input text, actor_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, delivery_paused boolean)
language plpgsql security definer set search_path = ''
as $$
declare current_paused boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if paused_input is null or actor_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 5 and 500
    or not exists (select 1 from public.profiles profile
      where profile.id = actor_id_input and profile.status = 'active')
  then
    raise exception 'Invalid outreach pause operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if exists (select 1 from public.outreach_admin_events event
    where event.idempotency_key = idempotency_key_input)
  then
    return query select 'IDEMPOTENT_REPLAY', control.delivery_paused
    from public.outreach_runtime_controls control where control.singleton;
    return;
  end if;
  update public.outreach_runtime_controls
  set delivery_paused = paused_input, pause_reason = btrim(reason_input),
    changed_by = actor_id_input, changed_at = now()
  where singleton returning outreach_runtime_controls.delivery_paused
  into current_paused;
  insert into public.outreach_admin_events (
    actor_id, event_type, reason, idempotency_key
  ) values (
    actor_id_input,
    case when paused_input then 'delivery_paused' else 'delivery_resumed' end,
    btrim(reason_input), idempotency_key_input
  );
  return query select 'PAUSE_STATE_UPDATED', current_paused;
end;
$$;

create or replace function public.admin_suppress_outreach_prospect(
  prospect_id_input uuid, reason_input text, actor_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, prospect_status text)
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if prospect_id_input is null or actor_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 5 and 500
    or not exists (select 1 from public.profiles profile
      where profile.id = actor_id_input and profile.status = 'active')
  then
    raise exception 'Invalid suppression operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if exists (select 1 from public.outreach_admin_events event
    where event.idempotency_key = idempotency_key_input)
  then
    return query select 'IDEMPOTENT_REPLAY', prospect.status
    from public.outreach_prospects prospect where prospect.id = prospect_id_input;
    return;
  end if;
  perform 1 from public.outreach_prospects prospect
  where prospect.id = prospect_id_input for update;
  if not found then
    raise exception 'Prospect not found'
      using errcode = 'P0002', detail = 'PROSPECT_NOT_FOUND';
  end if;
  insert into public.outreach_suppressions (value_hash, reason, actor_id)
  select contact.value_hash, 'administrator', actor_id_input
  from public.outreach_contact_candidates contact
  where contact.prospect_id = prospect_id_input
  on conflict (value_hash) do nothing;
  update public.outreach_consents
  set withdrawn_at = coalesce(withdrawn_at, now()),
    withdrawal_reason = coalesce(withdrawal_reason, btrim(reason_input))
  where prospect_id = prospect_id_input and withdrawn_at is null;
  update public.outreach_outbox
  set state = 'cancelled', last_failure_code = 'ADMINISTRATOR_SUPPRESSED'
  where prospect_id = prospect_id_input and state in ('pending', 'processing');
  update public.outreach_contact_candidates set private_value = '[withdrawn]'
  where prospect_id = prospect_id_input;
  update public.outreach_prospects
  set status = 'suppressed',
    consent_withdrawn_at = coalesce(consent_withdrawn_at, now()),
    next_action_at = null, introduction_draft = null
  where id = prospect_id_input;
  insert into public.outreach_admin_events (
    actor_id, prospect_id, event_type, reason, idempotency_key
  ) values (
    actor_id_input, prospect_id_input, 'prospect_suppressed',
    btrim(reason_input), idempotency_key_input
  );
  insert into public.outreach_events (
    prospect_id, actor_id, event_type, new_status, note, idempotency_key
  ) values (
    prospect_id_input, actor_id_input, 'suppressed', 'suppressed',
    'An administrator suppressed this prospect.', gen_random_uuid()
  );
  return query select 'PROSPECT_SUPPRESSED', 'suppressed';
end;
$$;

create or replace function public.admin_privacy_delete_outreach_prospect(
  prospect_id_input uuid, reason_input text, actor_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, prospect_status text)
language plpgsql security definer set search_path = ''
as $$
declare application_origin_value text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if prospect_id_input is null or actor_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 5 and 500
    or not exists (select 1 from public.profiles profile
      where profile.id = actor_id_input and profile.status = 'active')
  then
    raise exception 'Invalid privacy deletion operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if exists (select 1 from public.outreach_admin_events event
    where event.idempotency_key = idempotency_key_input)
  then
    return query select 'IDEMPOTENT_REPLAY', prospect.status
    from public.outreach_prospects prospect where prospect.id = prospect_id_input;
    return;
  end if;
  select prospect.application_origin into application_origin_value
  from public.outreach_prospects prospect
  where prospect.id = prospect_id_input for update;
  if not found then
    raise exception 'Prospect not found'
      using errcode = 'P0002', detail = 'PROSPECT_NOT_FOUND';
  end if;
  insert into public.outreach_suppressions (value_hash, reason, actor_id)
  select contact.value_hash, 'administrator', actor_id_input
  from public.outreach_contact_candidates contact
  where contact.prospect_id = prospect_id_input
  on conflict (value_hash) do nothing;
  update public.outreach_consents
  set withdrawn_at = coalesce(withdrawn_at, now()),
    withdrawal_reason = coalesce(
      withdrawal_reason, 'Data deletion request ended outreach permission.'
    )
  where prospect_id = prospect_id_input and withdrawn_at is null;
  update public.outreach_outbox
  set state = 'cancelled', last_failure_code = 'PRIVACY_DELETED',
    message_body = 'FarmerBook outreach content removed under a privacy request.'
  where prospect_id = prospect_id_input
    and state in ('pending', 'processing', 'failed');
  update public.outreach_contact_candidates
  set private_value = '[deleted]',
    source_url = application_origin_value || '/privacy',
    evidence_excerpt = 'Deleted under a privacy request.'
  where prospect_id = prospect_id_input;
  update public.outreach_prospects
  set normalized_source_url = application_origin_value
      || '/privacy#deleted-' || id::text,
    source_title = null, source_excerpt = null,
    source_hash = encode(extensions.digest(id::text || ':privacy-deleted', 'sha256'), 'hex'),
    business_name = null, operator_context = null, rationale = null,
    introduction_draft = null, category_slugs = '{}', status = 'suppressed',
    contact_name = null, organization_website = null,
    consent_withdrawn_at = coalesce(consent_withdrawn_at, now()),
    next_action_at = null, privacy_deleted_at = now()
  where id = prospect_id_input;
  insert into public.outreach_admin_events (
    actor_id, prospect_id, event_type, reason, idempotency_key
  ) values (
    actor_id_input, prospect_id_input, 'privacy_deleted',
    btrim(reason_input), idempotency_key_input
  );
  insert into public.outreach_events (
    prospect_id, actor_id, event_type, new_status, note, idempotency_key
  ) values (
    prospect_id_input, actor_id_input, 'deleted', 'suppressed',
    'Research and contact content was removed under a privacy request.',
    gen_random_uuid()
  );
  return query select 'PRIVACY_DATA_DELETED', 'suppressed';
end;
$$;

create or replace function public.admin_retry_outreach_failure(
  outbox_id_input uuid, reason_input text, actor_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, outbox_state text)
language plpgsql security definer set search_path = ''
as $$
declare outbox_record public.outreach_outbox%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if outbox_id_input is null or actor_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 5 and 500
    or not exists (select 1 from public.profiles profile
      where profile.id = actor_id_input and profile.status = 'active')
  then
    raise exception 'Invalid retry operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if not public.is_outreach_delivery_available() then
    raise exception 'Outreach delivery is paused'
      using errcode = '42501', detail = 'DELIVERY_PAUSED';
  end if;
  if exists (select 1 from public.outreach_admin_events event
    where event.idempotency_key = idempotency_key_input)
  then
    return query select 'IDEMPOTENT_REPLAY', outbox.state
    from public.outreach_outbox outbox where outbox.id = outbox_id_input;
    return;
  end if;
  select outbox.* into outbox_record from public.outreach_outbox outbox
  where outbox.id = outbox_id_input for update;
  if not found or outbox_record.state <> 'failed'
    or outbox_record.attempts >= 5 or outbox_record.expires_at <= now()
  then
    raise exception 'Outbox failure is not retryable'
      using errcode = '22023', detail = 'NOT_RETRYABLE';
  end if;
  update public.outreach_outbox
  set state = 'pending', not_before = now(), locked_at = null,
    last_failure_code = null
  where id = outbox_id_input;
  insert into public.outreach_admin_events (
    actor_id, prospect_id, outbox_id, event_type, reason, idempotency_key
  ) values (
    actor_id_input, outbox_record.prospect_id, outbox_id_input,
    'retry_queued', btrim(reason_input), idempotency_key_input
  );
  return query select 'RETRY_QUEUED', 'pending';
end;
$$;

create or replace function public.outreach_runtime_health()
returns table(
  delivery_paused boolean, pause_reason text, pending_count bigint,
  failed_count bigint, last_delivered_at timestamptz,
  last_provider_event_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  return query
  select control.delivery_paused, control.pause_reason,
    (select count(*) from public.outreach_outbox outbox where outbox.state = 'pending'),
    (select count(*) from public.outreach_outbox outbox where outbox.state = 'failed'),
    (select max(outbox.delivered_at) from public.outreach_outbox outbox),
    (select max(provider_event.occurred_at)
      from public.outreach_provider_events provider_event)
  from public.outreach_runtime_controls control where control.singleton;
end;
$$;

create or replace function public.list_outreach_failures(limit_input integer default 25)
returns table(
  id uuid, prospect_id uuid, business_name text, purpose text,
  attempts smallint, failure_code text, created_at timestamptz,
  expires_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  return query
  select outbox.id, outbox.prospect_id, prospect.business_name,
    outbox.purpose, outbox.attempts, outbox.last_failure_code,
    outbox.created_at, outbox.expires_at
  from public.outreach_outbox outbox
  join public.outreach_prospects prospect on prospect.id = outbox.prospect_id
  where outbox.state = 'failed'
  order by outbox.updated_at desc
  limit least(greatest(coalesce(limit_input, 25), 1), 100);
end;
$$;

create or replace function public.outreach_prospect_history(prospect_id_input uuid)
returns table(
  history_type text, event_type text, summary text, occurred_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  return query
  select history.history_type, history.event_type, history.summary,
    history.occurred_at
  from (
    select 'audit'::text as history_type, event.event_type,
      coalesce(event.note, 'Outreach state changed.') as summary,
      event.created_at as occurred_at
    from public.outreach_events event
    where event.prospect_id = prospect_id_input
    union all
    select 'consent'::text, consent.purpose,
      concat(consent.capture_method, ' · ', consent.statement_version,
        case when consent.withdrawn_at is null then ' · active receipt'
          else ' · withdrawn receipt' end),
      consent.granted_at
    from public.outreach_consents consent
    where consent.prospect_id = prospect_id_input
    union all
    select 'provider'::text, provider_event.event_type,
      concat('Verified provider event',
        case when provider_event.question_code is null then ''
          else ' · ' || provider_event.question_code end),
      provider_event.occurred_at
    from public.outreach_provider_events provider_event
    where provider_event.prospect_id = prospect_id_input
    union all
    select 'administrator'::text, admin_event.event_type,
      admin_event.reason, admin_event.created_at
    from public.outreach_admin_events admin_event
    where admin_event.prospect_id = prospect_id_input
  ) history order by history.occurred_at desc;
end;
$$;

alter table public.outreach_agent_runs enable row level security;
alter table public.outreach_admin_events enable row level security;
revoke all on table public.outreach_agent_runs from public, anon, authenticated;
revoke all on table public.outreach_admin_events from public, anon, authenticated;
grant select, insert on table public.outreach_agent_runs to service_role;
grant select, insert on table public.outreach_admin_events to service_role;

revoke all on function public.outreach_set_updated_at_and_revision()
  from public, anon, authenticated;
revoke all on function public.outreach_set_outbox_updated_at()
  from public, anon, authenticated;
revoke all on function public.prevent_outreach_event_mutation()
  from public, anon, authenticated;
revoke all on function public.validate_outreach_outbox_consent()
  from public, anon, authenticated;
revoke all on function public.validate_outreach_invitation(text)
  from public, anon, authenticated;
grant execute on function public.validate_outreach_invitation(text) to service_role;
revoke all on function public.redeem_outreach_invitation(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.redeem_outreach_invitation(text, uuid, uuid)
  to service_role;
revoke all on function public.sync_outreach_join_on_profile_completion()
  from public, anon, authenticated;
revoke all on function public.revoke_outreach_invitations_on_terminal_status()
  from public, anon, authenticated;

revoke all on function public.list_outreach_prospects(integer)
  from public, anon, authenticated;
grant execute on function public.list_outreach_prospects(integer) to authenticated;
revoke all on function public.outreach_dashboard_summary()
  from public, anon, authenticated;
grant execute on function public.outreach_dashboard_summary() to authenticated;
revoke all on function public.set_outreach_delivery_pause(boolean, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_outreach_delivery_pause(boolean, text, uuid, uuid)
  to service_role;
revoke all on function public.admin_suppress_outreach_prospect(uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_suppress_outreach_prospect(uuid, text, uuid, uuid)
  to service_role;
revoke all on function public.admin_privacy_delete_outreach_prospect(uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_privacy_delete_outreach_prospect(uuid, text, uuid, uuid)
  to service_role;
revoke all on function public.admin_retry_outreach_failure(uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_retry_outreach_failure(uuid, text, uuid, uuid)
  to service_role;
revoke all on function public.outreach_runtime_health()
  from public, anon, authenticated;
grant execute on function public.outreach_runtime_health() to authenticated;
revoke all on function public.list_outreach_failures(integer)
  from public, anon, authenticated;
grant execute on function public.list_outreach_failures(integer) to authenticated;
revoke all on function public.outreach_prospect_history(uuid)
  from public, anon, authenticated;
grant execute on function public.outreach_prospect_history(uuid) to authenticated;
