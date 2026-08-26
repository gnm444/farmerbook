-- Complete autonomous consented delivery with a just-in-time database
-- authorization, a conservative India-calendar reservation ceiling and a
-- persistent automatic stop. This migration sends nothing and preserves the
-- existing release and runtime-pause state.

alter table public.outreach_runtime_controls
  add column if not exists daily_delivery_limit integer not null default 25
    check (daily_delivery_limit between 1 and 100);

create table if not exists public.outreach_dispatch_checks (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.outreach_outbox (id) on delete set null,
  prospect_id uuid references public.outreach_prospects (id) on delete set null,
  attempt_number smallint not null check (attempt_number between 1 and 5),
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  purpose text not null check (purpose in (
    'farmerbook_introduction', 'onboarding_followup', 'onboarding_reply',
    'consent_confirmation'
  )),
  authorized boolean not null,
  decision_code text not null check (decision_code ~ '^[A-Z0-9_]{2,80}$'),
  india_day date not null,
  created_at timestamptz not null default now()
);

create index if not exists outreach_dispatch_checks_daily_authorized_idx
  on public.outreach_dispatch_checks (india_day, created_at)
  where authorized;
create index if not exists outreach_dispatch_checks_outbox_idx
  on public.outreach_dispatch_checks (outbox_id, created_at desc);

create table if not exists public.outreach_automatic_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type = 'delivery_auto_paused'),
  reason_code text not null check (reason_code ~ '^[A-Z0-9_]{2,80}$'),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

alter table public.outreach_dispatch_checks enable row level security;
alter table public.outreach_automatic_events enable row level security;

drop trigger if exists outreach_dispatch_checks_are_immutable
  on public.outreach_dispatch_checks;
create trigger outreach_dispatch_checks_are_immutable
before update or delete on public.outreach_dispatch_checks
for each row execute function public.prevent_outreach_event_mutation();

drop trigger if exists outreach_automatic_events_are_immutable
  on public.outreach_automatic_events;
create trigger outreach_automatic_events_are_immutable
before update or delete on public.outreach_automatic_events
for each row execute function public.prevent_outreach_event_mutation();

create or replace function public.authorize_outreach_dispatch(
  outbox_id_input uuid
)
returns table(
  authorized boolean,
  code text,
  check_id uuid,
  next_eligible_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox_record public.outreach_outbox%rowtype;
  control_record public.outreach_runtime_controls%rowtype;
  india_day_value date := (now() at time zone 'Asia/Kolkata')::date;
  next_india_day timestamptz := (
    ((now() at time zone 'Asia/Kolkata')::date + 1)::timestamp
      at time zone 'Asia/Kolkata'
  );
  authority_active boolean := false;
  suppressed boolean := false;
  reservations bigint := 0;
  existing_reservation boolean := false;
  decision text;
  decision_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if outbox_id_input is null then
    raise exception 'Outbox id is required'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  -- Serialize daily reservations. A conservative reservation is consumed even
  -- when the provider later fails, so concurrent workers cannot exceed the cap.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('farmerbook-outreach-dispatch', 0)
  );
  select outbox.* into outbox_record
  from public.outreach_outbox outbox
  where outbox.id = outbox_id_input
  for update;
  if not found then
    return query select false, 'OUTBOX_NOT_FOUND', null::uuid, null::timestamptz;
    return;
  end if;
  if outbox_record.state <> 'processing' then
    return query select false, 'OUTBOX_NOT_PROCESSING', null::uuid, null::timestamptz;
    return;
  end if;

  select control.* into control_record
  from public.outreach_runtime_controls control
  where control.singleton
  for update;

  select exists (
    select 1
    from public.outreach_contact_candidates contact
    join public.outreach_suppressions suppression
      on suppression.value_hash = contact.value_hash
    where contact.id = outbox_record.contact_candidate_id
      and contact.prospect_id = outbox_record.prospect_id
  ) into suppressed;

  authority_active := case
    when suppressed then false
    when outbox_record.purpose = 'consent_confirmation' then exists (
      select 1
      from public.outreach_contact_candidates contact
      where contact.id = outbox_record.contact_candidate_id
        and contact.prospect_id = outbox_record.prospect_id
        and contact.channel = outbox_record.channel
    )
    when outbox_record.purpose = 'onboarding_reply' then
      public.has_active_outreach_reply_authorization(outbox_record.id)
    else public.has_active_outreach_consent(
      outbox_record.prospect_id,
      outbox_record.consent_id,
      outbox_record.channel,
      outbox_record.purpose
    )
  end;

  if outbox_record.expires_at <= now() then
    decision := 'OUTBOX_EXPIRED_BEFORE_DISPATCH';
  elsif suppressed then
    decision := 'SUPPRESSED_BEFORE_DISPATCH';
  elsif not authority_active then
    decision := case when outbox_record.purpose = 'onboarding_reply'
      then 'REPLY_AUTHORITY_ENDED_BEFORE_DISPATCH'
      else 'CONSENT_ENDED_BEFORE_DISPATCH' end;
  elsif control_record.singleton is null
    or not public.is_ecosystem_release_enabled('outreach_agent')
    or control_record.delivery_paused
  then
    decision := 'RUNTIME_PAUSED_BEFORE_DISPATCH';
  else
    select exists (
      select 1 from public.outreach_dispatch_checks dispatch_check
      where dispatch_check.outbox_id = outbox_record.id
        and dispatch_check.attempt_number = outbox_record.attempts
        and dispatch_check.authorized
    ) into existing_reservation;
    select count(*) into reservations
    from (
      select dispatch_check.outbox_id, dispatch_check.attempt_number
      from public.outreach_dispatch_checks dispatch_check
      where dispatch_check.india_day = india_day_value
        and dispatch_check.authorized
      group by dispatch_check.outbox_id, dispatch_check.attempt_number
    ) reserved_dispatches;
    decision := case
      when not existing_reservation
        and reservations >= control_record.daily_delivery_limit
        then 'DAILY_DELIVERY_LIMIT_REACHED'
      else 'DISPATCH_AUTHORIZED'
    end;
  end if;

  if decision in (
    'OUTBOX_EXPIRED_BEFORE_DISPATCH',
    'SUPPRESSED_BEFORE_DISPATCH',
    'REPLY_AUTHORITY_ENDED_BEFORE_DISPATCH',
    'CONSENT_ENDED_BEFORE_DISPATCH'
  ) then
    update public.outreach_outbox
    set state = 'cancelled', locked_at = null,
      last_failure_code = decision, updated_at = now()
    where id = outbox_record.id and state = 'processing';
  elsif decision = 'RUNTIME_PAUSED_BEFORE_DISPATCH' then
    update public.outreach_outbox
    set state = 'pending', locked_at = null,
      not_before = greatest(not_before, now() + interval '15 minutes'),
      last_failure_code = decision, updated_at = now()
    where id = outbox_record.id and state = 'processing';
  elsif decision = 'DAILY_DELIVERY_LIMIT_REACHED' then
    update public.outreach_outbox
    set state = 'pending', locked_at = null,
      not_before = greatest(not_before, next_india_day),
      last_failure_code = decision, updated_at = now()
    where id = outbox_record.id and state = 'processing';
  end if;

  insert into public.outreach_dispatch_checks (
    outbox_id, prospect_id, attempt_number, channel, purpose, authorized,
    decision_code, india_day
  ) values (
    outbox_record.id, outbox_record.prospect_id, outbox_record.attempts,
    outbox_record.channel, outbox_record.purpose,
    decision = 'DISPATCH_AUTHORIZED', decision, india_day_value
  ) returning id into decision_id;

  return query select decision = 'DISPATCH_AUTHORIZED', decision, decision_id,
    case when decision = 'DAILY_DELIVERY_LIMIT_REACHED'
      then next_india_day else null::timestamptz end;
end;
$$;

create or replace function public.pause_outreach_delivery_automatically(
  reason_code_input text,
  idempotency_key_input uuid
)
returns table(code text, delivery_paused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_reason text := upper(btrim(reason_code_input));
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if normalized_reason !~ '^[A-Z0-9_]{2,80}$'
    or idempotency_key_input is null
  then
    raise exception 'Invalid automatic pause input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('farmerbook-outreach-dispatch', 0)
  );
  if exists (
    select 1 from public.outreach_automatic_events event
    where event.idempotency_key = idempotency_key_input
  ) then
    return query select 'IDEMPOTENT_REPLAY', control.delivery_paused
    from public.outreach_runtime_controls control where control.singleton;
    return;
  end if;

  -- Ended authority must never be restored to pending by a system stop.
  update public.outreach_outbox outbox
  set state = 'cancelled', locked_at = null,
    last_failure_code = case
      when outbox.expires_at <= now() then 'OUTBOX_EXPIRED_BEFORE_DISPATCH'
      else 'AUTHORITY_ENDED_BEFORE_DISPATCH' end,
    updated_at = now()
  where outbox.state = 'processing'
    and (
      outbox.expires_at <= now()
      or exists (
        select 1
        from public.outreach_contact_candidates contact
        join public.outreach_suppressions suppression
          on suppression.value_hash = contact.value_hash
        where contact.id = outbox.contact_candidate_id
          and contact.prospect_id = outbox.prospect_id
      )
      or (
        outbox.purpose = 'onboarding_reply'
        and not public.has_active_outreach_reply_authorization(outbox.id)
      )
      or (
        outbox.purpose not in ('consent_confirmation', 'onboarding_reply')
        and not public.has_active_outreach_consent(
          outbox.prospect_id, outbox.consent_id,
          outbox.channel, outbox.purpose
        )
      )
    );

  update public.outreach_outbox
  set state = 'pending', locked_at = null,
    not_before = greatest(not_before, now() + interval '15 minutes'),
    last_failure_code = 'AUTOMATIC_DELIVERY_PAUSE', updated_at = now()
  where state = 'processing';

  update public.outreach_runtime_controls
  set delivery_paused = true,
    pause_reason = left('Automatic stop: ' || normalized_reason || '.', 500),
    changed_by = null,
    changed_at = now()
  where singleton;
  insert into public.outreach_automatic_events (
    event_type, reason_code, idempotency_key
  ) values (
    'delivery_auto_paused', normalized_reason, idempotency_key_input
  );
  return query select 'DELIVERY_AUTO_PAUSED', true;
end;
$$;

drop function if exists public.outreach_runtime_health();
create function public.outreach_runtime_health()
returns table(
  delivery_paused boolean,
  pause_reason text,
  pending_count bigint,
  failed_count bigint,
  last_delivered_at timestamptz,
  last_provider_event_at timestamptz,
  daily_delivery_limit integer,
  daily_authorized_count bigint,
  last_automatic_stop_code text,
  last_automatic_stop_at timestamptz
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
  return query
  select control.delivery_paused, control.pause_reason,
    (select count(*) from public.outreach_outbox outbox
      where outbox.state = 'pending'),
    (select count(*) from public.outreach_outbox outbox
      where outbox.state = 'failed'),
    (select max(outbox.delivered_at) from public.outreach_outbox outbox),
    (select max(provider_event.occurred_at)
      from public.outreach_provider_events provider_event),
    control.daily_delivery_limit,
    (select count(*) from (
      select dispatch_check.outbox_id, dispatch_check.attempt_number
      from public.outreach_dispatch_checks dispatch_check
      where dispatch_check.authorized
        and dispatch_check.india_day =
          (now() at time zone 'Asia/Kolkata')::date
      group by dispatch_check.outbox_id, dispatch_check.attempt_number
    ) reserved_dispatches),
    (select event.reason_code from public.outreach_automatic_events event
      order by event.created_at desc limit 1),
    (select event.created_at from public.outreach_automatic_events event
      order by event.created_at desc limit 1)
  from public.outreach_runtime_controls control where control.singleton;
end;
$$;

revoke all on table public.outreach_dispatch_checks
  from public, anon, authenticated, service_role;
revoke all on table public.outreach_automatic_events
  from public, anon, authenticated, service_role;

revoke all on function public.authorize_outreach_dispatch(uuid)
  from public, anon, authenticated;
grant execute on function public.authorize_outreach_dispatch(uuid)
  to service_role;
revoke all on function public.pause_outreach_delivery_automatically(text, uuid)
  from public, anon, authenticated;
grant execute on function public.pause_outreach_delivery_automatically(text, uuid)
  to service_role;
revoke all on function public.outreach_runtime_health()
  from public, anon, authenticated;
grant execute on function public.outreach_runtime_health()
  to authenticated;
