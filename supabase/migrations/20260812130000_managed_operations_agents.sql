-- Purpose-limited managed operations fleet. The four roles have independent
-- schedules, batch limits and pause state. No table in this migration is
-- directly writable from a browser, and verification triage cannot issue a
-- verification claim.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents', 'managed_operations_agents'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('managed_operations_agents', false)
on conflict (control_key) do nothing;

create table public.managed_operations_agents (
  role text primary key check (role in (
    'outreach_growth', 'profile_drafting', 'verification_triage',
    'operations_supervisor'
  )),
  display_name text not null check (char_length(display_name) between 3 and 80),
  enabled boolean not null default false,
  runtime_state text not null default 'paused' check (runtime_state in (
    'idle', 'running', 'healthy', 'degraded', 'paused'
  )),
  interval_seconds integer not null check (interval_seconds between 300 and 604800),
  max_items_per_run smallint not null check (max_items_per_run between 1 and 25),
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure_code text check (
    last_failure_code is null or last_failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  consecutive_failures smallint not null default 0
    check (consecutive_failures between 0 and 3),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.managed_operations_agents (
  role, display_name, interval_seconds, max_items_per_run
) values
  ('outreach_growth', 'Growth & Outreach', 900, 10),
  ('profile_drafting', 'Farmer Profile Drafting', 3600, 5),
  ('verification_triage', 'Verification Triage', 21600, 10),
  ('operations_supervisor', 'Operations Supervisor', 86400, 25)
on conflict (role) do nothing;

create table public.managed_operations_agent_runs (
  id uuid primary key default gen_random_uuid(),
  role text not null references public.managed_operations_agents (role)
    on delete restrict,
  instance_name text not null
    check (instance_name ~ '^[a-z0-9][a-z0-9-]{2,120}$'),
  trigger_type text not null check (trigger_type in ('scheduled', 'manual')),
  state text not null default 'running' check (state in (
    'running', 'succeeded', 'partial', 'failed', 'skipped'
  )),
  claimed_count integer not null default 0 check (claimed_count between 0 and 100),
  succeeded_count integer not null default 0 check (succeeded_count between 0 and 100),
  failed_count integer not null default 0 check (failed_count between 0 and 100),
  summary jsonb not null default '{}'::jsonb check (
    jsonb_typeof(summary) = 'object'
    and octet_length(summary::text) <= 16384
  ),
  failure_code text check (
    failure_code is null or failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  idempotency_key uuid not null unique,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((state = 'running') = (completed_at is null)),
  check (succeeded_count + failed_count <= claimed_count)
);

create table public.managed_operations_agent_events (
  id uuid primary key default gen_random_uuid(),
  role text not null references public.managed_operations_agents (role)
    on delete restrict,
  run_id uuid references public.managed_operations_agent_runs (id)
    on delete set null,
  actor_id uuid,
  event_type text not null check (event_type in (
    'configured', 'paused', 'run_requested', 'run_started', 'run_completed',
    'run_failed', 'auto_paused'
  )),
  reason text check (reason is null or char_length(reason) between 5 and 500),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object'
    and octet_length(details::text) <= 8192
  ),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create table public.managed_verification_triage (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique
    references public.profile_verification_claims (id) on delete cascade,
  recommendation text not null check (recommendation in (
    'awaiting_provider_receipt', 'ready_for_service_review',
    'manual_review_required', 'reject_incomplete_evidence'
  )),
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  reason_codes text[] not null check (
    cardinality(reason_codes) between 1 and 8
    and reason_codes <@ array[
      'PROVIDER_RECEIPT_MISSING', 'DETERMINISTIC_PROVIDER_RESULT_PRESENT',
      'HUMAN_REVIEW_METHOD', 'EVIDENCE_EXPIRED', 'CLAIM_NOT_PENDING',
      'UNSUPPORTED_METHOD'
    ]::text[]
  ),
  policy_version text not null default 'verification-triage-2026-08-12.1'
    check (char_length(policy_version) between 5 and 80),
  run_id uuid not null references public.managed_operations_agent_runs (id)
    on delete restrict,
  created_at timestamptz not null default now()
);

create index managed_operations_agent_runs_role_started_idx
  on public.managed_operations_agent_runs (role, started_at desc);
create index managed_operations_agent_runs_running_idx
  on public.managed_operations_agent_runs (role, started_at)
  where state = 'running';
create index managed_operations_agent_events_role_created_idx
  on public.managed_operations_agent_events (role, created_at desc);

create trigger managed_operations_agents_set_updated_at
before update on public.managed_operations_agents
for each row execute function public.set_updated_at();

create or replace function public.prevent_managed_operations_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Managed operations audit records are immutable'
    using errcode = '42501', detail = 'AUDIT_IMMUTABLE';
end;
$$;

create or replace function public.request_managed_operations_agent_run(
  role_input text,
  reason_input text,
  idempotency_key_input uuid
)
returns table(code text, role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing public.managed_operations_agent_events%rowtype;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('managed_operations_agents') then
    raise exception 'Managed operations agents are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if role_input not in (
    'outreach_growth', 'profile_drafting', 'verification_triage',
    'operations_supervisor'
  ) or char_length(btrim(reason_input)) not between 5 and 500
    or idempotency_key_input is null
  then
    raise exception 'Invalid managed agent run request'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if not exists (
    select 1 from public.managed_operations_agents agent
    where agent.role = role_input and agent.enabled
  ) then
    raise exception 'Managed agent role is paused'
      using errcode = '42501', detail = 'AGENT_PAUSED';
  end if;
  select event.* into existing
  from public.managed_operations_agent_events event
  where event.idempotency_key = idempotency_key_input
  for update;
  if found then
    if existing.role <> role_input or existing.event_type <> 'run_requested' then
      raise exception 'Managed run request idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', role_input;
    return;
  end if;
  insert into public.managed_operations_agent_events (
    role, actor_id, event_type, reason, idempotency_key
  ) values (
    role_input, actor_id, 'run_requested', btrim(reason_input),
    idempotency_key_input
  );
  return query select 'RUN_REQUESTED', role_input;
end;
$$;

create trigger managed_operations_agent_events_are_immutable
before update or delete on public.managed_operations_agent_events
for each row execute function public.prevent_managed_operations_audit_mutation();
create trigger managed_verification_triage_is_immutable
before update or delete on public.managed_verification_triage
for each row execute function public.prevent_managed_operations_audit_mutation();

create or replace function public.configure_managed_operations_agent(
  role_input text,
  enabled_input boolean,
  interval_seconds_input integer,
  max_items_per_run_input integer,
  reason_input text,
  idempotency_key_input uuid
)
returns table(code text, role text, enabled boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing public.managed_operations_agent_events%rowtype;
  desired_event text := case when enabled_input then 'configured' else 'paused' end;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if role_input not in (
    'outreach_growth', 'profile_drafting', 'verification_triage',
    'operations_supervisor'
  ) or enabled_input is null
    or interval_seconds_input not between 300 and 604800
    or max_items_per_run_input not between 1 and 25
    or char_length(btrim(reason_input)) not between 5 and 500
    or idempotency_key_input is null
  then
    raise exception 'Invalid managed agent configuration'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if enabled_input
    and not public.is_ecosystem_release_enabled('managed_operations_agents')
  then
    raise exception 'Managed operations agents are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;

  select event.* into existing
  from public.managed_operations_agent_events event
  where event.idempotency_key = idempotency_key_input
  for update;
  if found then
    if existing.role <> role_input or existing.event_type <> desired_event then
      raise exception 'Managed agent command idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', role_input, enabled_input;
    return;
  end if;

  update public.managed_operations_agents agent
  set enabled = enabled_input,
      runtime_state = case when enabled_input then 'idle' else 'paused' end,
      interval_seconds = interval_seconds_input,
      max_items_per_run = max_items_per_run_input,
      consecutive_failures = case when enabled_input then 0 else agent.consecutive_failures end,
      last_failure_code = case when enabled_input then null else agent.last_failure_code end,
      updated_by = actor_id
  where agent.role = role_input;
  if not found then
    raise exception 'Managed agent role not found'
      using errcode = 'P0002', detail = 'AGENT_NOT_FOUND';
  end if;

  insert into public.managed_operations_agent_events (
    role, actor_id, event_type, reason, details, idempotency_key
  ) values (
    role_input, actor_id, desired_event, btrim(reason_input),
    jsonb_build_object(
      'enabled', enabled_input,
      'intervalSeconds', interval_seconds_input,
      'maxItemsPerRun', max_items_per_run_input
    ),
    idempotency_key_input
  );
  return query select case when enabled_input then 'CONFIGURED' else 'PAUSED' end,
    role_input, enabled_input;
end;
$$;

create or replace function public.begin_managed_operations_agent_run(
  role_input text,
  instance_name_input text,
  trigger_type_input text,
  idempotency_key_input uuid
)
returns table(code text, run_id uuid, max_items_per_run integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  agent public.managed_operations_agents%rowtype;
  prior public.managed_operations_agent_runs%rowtype;
  created_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('managed_operations_agents') then
    raise exception 'Managed operations agents are disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if instance_name_input !~ '^[a-z0-9][a-z0-9-]{2,120}$'
    or trigger_type_input not in ('scheduled', 'manual')
    or idempotency_key_input is null
  then
    raise exception 'Invalid managed agent run'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select run.* into prior
  from public.managed_operations_agent_runs run
  where run.idempotency_key = idempotency_key_input
  for update;
  if found then
    if prior.role <> role_input
      or prior.instance_name <> instance_name_input
      or prior.trigger_type <> trigger_type_input
    then
      raise exception 'Managed run idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    select configured.* into agent
    from public.managed_operations_agents configured
    where configured.role = role_input;
    return query select 'IDEMPOTENT_REPLAY', prior.id,
      agent.max_items_per_run::integer;
    return;
  end if;

  select configured.* into agent
  from public.managed_operations_agents configured
  where configured.role = role_input
  for update;
  if not found then
    raise exception 'Managed agent role not found'
      using errcode = 'P0002', detail = 'AGENT_NOT_FOUND';
  end if;
  if not agent.enabled then
    raise exception 'Managed agent role is paused'
      using errcode = '42501', detail = 'AGENT_PAUSED';
  end if;

  if exists (
    select 1 from public.managed_operations_agent_runs active
    where active.role = role_input and active.state = 'running'
      and active.started_at > now() - interval '15 minutes'
  ) then
    insert into public.managed_operations_agent_runs (
      role, instance_name, trigger_type, state, summary, idempotency_key,
      completed_at
    ) values (
      role_input, instance_name_input, trigger_type_input, 'skipped',
      '{"reason":"RUN_ALREADY_ACTIVE"}'::jsonb, idempotency_key_input, now()
    ) returning id into created_id;
    return query select 'SKIPPED_BUSY', created_id,
      agent.max_items_per_run::integer;
    return;
  end if;

  insert into public.managed_operations_agent_runs (
    role, instance_name, trigger_type, idempotency_key
  ) values (
    role_input, instance_name_input, trigger_type_input, idempotency_key_input
  ) returning id into created_id;
  update public.managed_operations_agents current
  set runtime_state = 'running', last_run_at = now()
  where current.role = role_input;
  insert into public.managed_operations_agent_events (
    role, run_id, event_type, details, idempotency_key
  ) values (
    role_input, created_id, 'run_started',
    jsonb_build_object('trigger', trigger_type_input),
    gen_random_uuid()
  );
  return query select 'STARTED', created_id, agent.max_items_per_run::integer;
end;
$$;

create or replace function public.finish_managed_operations_agent_run(
  run_id_input uuid,
  outcome_input jsonb
)
returns table(code text, state text, agent_enabled boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run public.managed_operations_agent_runs%rowtype;
  agent public.managed_operations_agents%rowtype;
  outcome_state text := outcome_input ->> 'state';
  claimed_value integer;
  succeeded_value integer;
  failed_value integer;
  failure_code_value text := nullif(outcome_input ->> 'failureCode', '');
  summary_value jsonb := coalesce(outcome_input -> 'summary', '{}'::jsonb);
  new_failures integer;
  keep_enabled boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if run_id_input is null or jsonb_typeof(outcome_input) <> 'object'
    or outcome_state not in ('succeeded', 'partial', 'failed', 'skipped')
    or jsonb_typeof(summary_value) <> 'object'
    or octet_length(summary_value::text) > 16384
  then
    raise exception 'Invalid managed agent run outcome'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  begin
    claimed_value := coalesce((outcome_input ->> 'claimed')::integer, 0);
    succeeded_value := coalesce((outcome_input ->> 'succeeded')::integer, 0);
    failed_value := coalesce((outcome_input ->> 'failed')::integer, 0);
  exception when others then
    raise exception 'Invalid managed agent run counts'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end;
  if claimed_value not between 0 and 100
    or succeeded_value not between 0 and claimed_value
    or failed_value not between 0 and claimed_value
    or succeeded_value + failed_value > claimed_value
    or (failure_code_value is not null
      and failure_code_value !~ '^[A-Z0-9_]{2,80}$')
  then
    raise exception 'Invalid managed agent run outcome'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select current.* into run
  from public.managed_operations_agent_runs current
  where current.id = run_id_input
  for update;
  if not found then
    raise exception 'Managed agent run not found'
      using errcode = 'P0002', detail = 'RUN_NOT_FOUND';
  end if;
  select configured.* into agent
  from public.managed_operations_agents configured
  where configured.role = run.role
  for update;
  if run.state <> 'running' then
    return query select 'IDEMPOTENT_REPLAY', run.state, agent.enabled;
    return;
  end if;

  new_failures := case
    when outcome_state in ('failed', 'partial') then least(agent.consecutive_failures + 1, 3)
    else 0
  end;
  keep_enabled := agent.enabled and new_failures < 3;
  update public.managed_operations_agent_runs current
  set state = outcome_state,
      claimed_count = claimed_value,
      succeeded_count = succeeded_value,
      failed_count = failed_value,
      summary = summary_value,
      failure_code = failure_code_value,
      completed_at = now()
  where current.id = run.id;
  update public.managed_operations_agents current
  set enabled = keep_enabled,
      runtime_state = case
        when not keep_enabled then 'paused'
        when outcome_state in ('failed', 'partial') then 'degraded'
        else 'healthy'
      end,
      last_success_at = case
        when outcome_state = 'succeeded' then now() else current.last_success_at
      end,
      last_failure_at = case
        when outcome_state in ('failed', 'partial') then now()
        else current.last_failure_at
      end,
      last_failure_code = case
        when outcome_state in ('failed', 'partial')
          then coalesce(failure_code_value, 'PARTIAL_RUN')
        else null
      end,
      consecutive_failures = new_failures
  where current.role = run.role;
  insert into public.managed_operations_agent_events (
    role, run_id, event_type, details, idempotency_key
  ) values (
    run.role, run.id,
    case when outcome_state = 'failed' then 'run_failed' else 'run_completed' end,
    jsonb_build_object(
      'state', outcome_state, 'claimed', claimed_value,
      'succeeded', succeeded_value, 'failed', failed_value
    ),
    gen_random_uuid()
  );
  if agent.enabled and not keep_enabled then
    insert into public.managed_operations_agent_events (
      role, run_id, event_type, reason, details, idempotency_key
    ) values (
      run.role, run.id, 'auto_paused',
      'Automatically paused after three consecutive unsuccessful runs.',
      jsonb_build_object('consecutiveFailures', new_failures),
      gen_random_uuid()
    );
  end if;
  return query select 'RECORDED', outcome_state, keep_enabled;
end;
$$;

create or replace function public.record_managed_verification_triage(
  run_id_input uuid,
  claim_id_input uuid,
  recommendation_input text,
  risk_level_input text,
  reason_codes_input text[]
)
returns table(code text, triage_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if recommendation_input not in (
    'awaiting_provider_receipt', 'ready_for_service_review',
    'manual_review_required', 'reject_incomplete_evidence'
  ) or risk_level_input not in ('low', 'medium', 'high')
    or cardinality(reason_codes_input) not between 1 and 8
    or not reason_codes_input <@ array[
      'PROVIDER_RECEIPT_MISSING', 'DETERMINISTIC_PROVIDER_RESULT_PRESENT',
      'HUMAN_REVIEW_METHOD', 'EVIDENCE_EXPIRED', 'CLAIM_NOT_PENDING',
      'UNSUPPORTED_METHOD'
    ]::text[]
    or not exists (
      select 1 from public.managed_operations_agent_runs run
      where run.id = run_id_input and run.role = 'verification_triage'
    )
    or not exists (
      select 1 from public.profile_verification_claims claim
      where claim.id = claim_id_input and claim.state = 'pending'
    )
  then
    raise exception 'Invalid verification triage recommendation'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  insert into public.managed_verification_triage (
    claim_id, recommendation, risk_level, reason_codes, run_id
  ) values (
    claim_id_input, recommendation_input, risk_level_input,
    reason_codes_input, run_id_input
  ) on conflict (claim_id) do nothing
  returning id into created_id;
  if created_id is null then
    select triage.id into created_id
    from public.managed_verification_triage triage
    where triage.claim_id = claim_id_input;
    return query select 'IDEMPOTENT_REPLAY', created_id;
    return;
  end if;
  return query select 'RECORDED', created_id;
end;
$$;

create or replace function public.managed_operations_agent_dashboard()
returns table(
  role text,
  display_name text,
  enabled boolean,
  runtime_state text,
  interval_seconds integer,
  max_items_per_run integer,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure_code text,
  consecutive_failures integer,
  runs_last_24_hours bigint,
  successes_last_24_hours bigint,
  failures_last_24_hours bigint
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
    select agent.role, agent.display_name, agent.enabled,
      agent.runtime_state, agent.interval_seconds,
      agent.max_items_per_run::integer, agent.last_run_at,
      agent.last_success_at, agent.last_failure_at,
      agent.last_failure_code, agent.consecutive_failures::integer,
      count(run.id) filter (
        where run.started_at >= now() - interval '24 hours'
      ),
      count(run.id) filter (
        where run.started_at >= now() - interval '24 hours'
          and run.state = 'succeeded'
      ),
      count(run.id) filter (
        where run.started_at >= now() - interval '24 hours'
          and run.state in ('failed', 'partial')
      )
    from public.managed_operations_agents agent
    left join public.managed_operations_agent_runs run on run.role = agent.role
    group by agent.role, agent.display_name, agent.enabled,
      agent.runtime_state, agent.interval_seconds, agent.max_items_per_run,
      agent.last_run_at, agent.last_success_at, agent.last_failure_at,
      agent.last_failure_code, agent.consecutive_failures
    order by agent.role;
end;
$$;

create or replace function public.list_managed_operations_agent_runs(
  limit_input integer default 40
)
returns table(
  id uuid,
  role text,
  trigger_type text,
  state text,
  claimed_count integer,
  succeeded_count integer,
  failed_count integer,
  failure_code text,
  started_at timestamptz,
  completed_at timestamptz
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
  if limit_input not between 1 and 100 then
    raise exception 'Invalid run list limit'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  return query
    select run.id, run.role, run.trigger_type, run.state,
      run.claimed_count, run.succeeded_count, run.failed_count,
      run.failure_code, run.started_at, run.completed_at
    from public.managed_operations_agent_runs run
    order by run.started_at desc
    limit limit_input;
end;
$$;

alter table public.managed_operations_agents enable row level security;
alter table public.managed_operations_agent_runs enable row level security;
alter table public.managed_operations_agent_events enable row level security;
alter table public.managed_verification_triage enable row level security;

create policy managed_operations_agents_service_only
on public.managed_operations_agents for all to service_role
using (true) with check (true);
create policy managed_operations_agent_runs_service_only
on public.managed_operations_agent_runs for all to service_role
using (true) with check (true);
create policy managed_operations_agent_events_service_only
on public.managed_operations_agent_events for all to service_role
using (true) with check (true);
create policy managed_verification_triage_service_only
on public.managed_verification_triage for all to service_role
using (true) with check (true);

revoke all on table public.managed_operations_agents,
  public.managed_operations_agent_runs,
  public.managed_operations_agent_events,
  public.managed_verification_triage from public, anon, authenticated;
grant select, insert, update on public.managed_operations_agents to service_role;
grant select, insert, update on public.managed_operations_agent_runs to service_role;
grant select, insert on public.managed_operations_agent_events to service_role;
grant select, insert on public.managed_verification_triage to service_role;

revoke all on function public.configure_managed_operations_agent(
  text, boolean, integer, integer, text, uuid
) from public, anon, authenticated;
grant execute on function public.configure_managed_operations_agent(
  text, boolean, integer, integer, text, uuid
) to authenticated;
revoke all on function public.begin_managed_operations_agent_run(
  text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.begin_managed_operations_agent_run(
  text, text, text, uuid
) to service_role;
revoke all on function public.request_managed_operations_agent_run(
  text, text, uuid
) from public, anon, authenticated;
grant execute on function public.request_managed_operations_agent_run(
  text, text, uuid
) to authenticated;
revoke all on function public.finish_managed_operations_agent_run(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.finish_managed_operations_agent_run(uuid, jsonb)
  to service_role;
revoke all on function public.record_managed_verification_triage(
  uuid, uuid, text, text, text[]
) from public, anon, authenticated;
grant execute on function public.record_managed_verification_triage(
  uuid, uuid, text, text, text[]
) to service_role;
revoke all on function public.managed_operations_agent_dashboard()
  from public, anon, authenticated;
grant execute on function public.managed_operations_agent_dashboard()
  to authenticated;
revoke all on function public.list_managed_operations_agent_runs(integer)
  from public, anon, authenticated;
grant execute on function public.list_managed_operations_agent_runs(integer)
  to authenticated;
