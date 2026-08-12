-- Operational controls remain server-side. The default is paused, so applying
-- this migration can never start delivery merely because a release flag is on.

alter table public.outreach_prospects
  add column privacy_deleted_at timestamptz;

create table public.outreach_runtime_controls (
  singleton boolean primary key default true check (singleton),
  delivery_paused boolean not null default true,
  pause_reason text not null default 'Awaiting reviewed provider activation.'
    check (char_length(pause_reason) between 5 and 500),
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
insert into public.outreach_runtime_controls (
  singleton, delivery_paused, pause_reason
) values (
  true, true, 'Awaiting reviewed provider activation.'
) on conflict (singleton) do nothing;

create table public.outreach_admin_events (
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

create trigger outreach_admin_events_are_immutable
before update or delete on public.outreach_admin_events
for each row execute function public.prevent_outreach_event_mutation();

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

create or replace function public.set_outreach_delivery_pause(
  paused_input boolean,
  reason_input text,
  actor_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, delivery_paused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_paused boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if paused_input is null
    or actor_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 5 and 500
    or not exists (
      select 1 from public.profiles profile
      where profile.id = actor_id_input and profile.status = 'active'
    )
  then
    raise exception 'Invalid outreach pause operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if exists (
    select 1 from public.outreach_admin_events event
    where event.idempotency_key = idempotency_key_input
  ) then
    return query
      select 'IDEMPOTENT_REPLAY', control.delivery_paused
      from public.outreach_runtime_controls control where control.singleton;
    return;
  end if;

  update public.outreach_runtime_controls
  set delivery_paused = paused_input,
    pause_reason = btrim(reason_input),
    changed_by = actor_id_input,
    changed_at = now()
  where singleton
  returning outreach_runtime_controls.delivery_paused into current_paused;
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
  prospect_id_input uuid,
  reason_input text,
  actor_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, prospect_status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if prospect_id_input is null
    or actor_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 5 and 500
    or not exists (
      select 1 from public.profiles profile
      where profile.id = actor_id_input and profile.status = 'active'
    )
  then
    raise exception 'Invalid suppression operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if exists (
    select 1 from public.outreach_admin_events event
    where event.idempotency_key = idempotency_key_input
  ) then
    return query
      select 'IDEMPOTENT_REPLAY', prospect.status
      from public.outreach_prospects prospect
      where prospect.id = prospect_id_input;
    return;
  end if;

  perform 1 from public.outreach_prospects prospect
  where prospect.id = prospect_id_input for update;
  if not found then
    raise exception 'Prospect not found'
      using errcode = 'P0002', detail = 'PROSPECT_NOT_FOUND';
  end if;
  insert into public.outreach_suppressions (
    value_hash, reason, actor_id
  )
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
  update public.outreach_contact_candidates
  set private_value = '[withdrawn]'
  where prospect_id = prospect_id_input;
  update public.outreach_prospects
  set status = 'suppressed', consent_withdrawn_at = coalesce(consent_withdrawn_at, now()),
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
  prospect_id_input uuid,
  reason_input text,
  actor_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, prospect_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_origin_value text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if prospect_id_input is null
    or actor_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 5 and 500
    or not exists (
      select 1 from public.profiles profile
      where profile.id = actor_id_input and profile.status = 'active'
    )
  then
    raise exception 'Invalid privacy deletion operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if exists (
    select 1 from public.outreach_admin_events event
    where event.idempotency_key = idempotency_key_input
  ) then
    return query
      select 'IDEMPOTENT_REPLAY', prospect.status
      from public.outreach_prospects prospect
      where prospect.id = prospect_id_input;
    return;
  end if;

  select prospect.application_origin into application_origin_value
  from public.outreach_prospects prospect
  where prospect.id = prospect_id_input
  for update;
  if not found then
    raise exception 'Prospect not found'
      using errcode = 'P0002', detail = 'PROSPECT_NOT_FOUND';
  end if;
  insert into public.outreach_suppressions (
    value_hash, reason, actor_id
  )
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
  where prospect_id = prospect_id_input and state in ('pending', 'processing', 'failed');
  update public.outreach_contact_candidates
  set private_value = '[deleted]',
    source_url = application_origin_value || '/privacy',
    evidence_excerpt = 'Deleted under a privacy request.'
  where prospect_id = prospect_id_input;
  update public.outreach_prospects
  set normalized_source_url = application_origin_value || '/privacy#deleted-' || id::text,
    source_title = null, source_excerpt = null,
    source_hash = encode(extensions.digest(id::text || ':privacy-deleted', 'sha256'), 'hex'),
    business_name = null, operator_context = null, rationale = null,
    introduction_draft = null, category_slugs = '{}', status = 'suppressed',
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
  outbox_id_input uuid,
  reason_input text,
  actor_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, outbox_state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox_record public.outreach_outbox%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if outbox_id_input is null
    or actor_id_input is null
    or idempotency_key_input is null
    or char_length(btrim(reason_input)) not between 5 and 500
    or not exists (
      select 1 from public.profiles profile
      where profile.id = actor_id_input and profile.status = 'active'
    )
  then
    raise exception 'Invalid retry operation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if not public.is_outreach_delivery_available() then
    raise exception 'Outreach delivery is paused'
      using errcode = '42501', detail = 'DELIVERY_PAUSED';
  end if;
  if exists (
    select 1 from public.outreach_admin_events event
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
    raise exception 'Outbox failure not found'
      using errcode = 'P0002', detail = 'OUTBOX_NOT_FOUND';
  end if;
  if outbox_record.state <> 'failed'
    or outbox_record.attempts >= 5
    or outbox_record.expires_at <= now()
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
  delivery_paused boolean,
  pause_reason text,
  pending_count bigint,
  failed_count bigint,
  last_delivered_at timestamptz,
  last_provider_event_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
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
    (select max(provider_event.occurred_at) from public.outreach_provider_events provider_event)
  from public.outreach_runtime_controls control
  where control.singleton;
end;
$$;

create or replace function public.list_outreach_failures(limit_input integer default 25)
returns table(
  id uuid,
  prospect_id uuid,
  business_name text,
  purpose text,
  attempts smallint,
  failure_code text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
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
  history_type text,
  event_type text,
  summary text,
  occurred_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
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
    ) history
    order by history.occurred_at desc;
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

alter table public.outreach_runtime_controls enable row level security;
alter table public.outreach_admin_events enable row level security;
revoke all on table public.outreach_runtime_controls
  from public, anon, authenticated;
revoke all on table public.outreach_admin_events
  from public, anon, authenticated;
grant select, insert, update on public.outreach_runtime_controls to service_role;
grant select, insert on public.outreach_admin_events to service_role;

revoke all on function public.is_outreach_delivery_available()
  from public, anon, authenticated;
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
