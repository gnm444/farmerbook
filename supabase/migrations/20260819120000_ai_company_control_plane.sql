-- FarmerBook AI company control plane. Fifteen company roles read aggregate
-- metrics and create reviewable backlog proposals. They cannot execute a
-- proposal or call an external provider. Both release controls default off.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents', 'managed_operations_agents',
      'featured_farmer_profiles', 'private_farmer_contacts',
      'sourced_farmer_research', 'support_social_pilot', 'ai_company'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('ai_company', false)
on conflict (control_key) do nothing;

alter table public.managed_operations_agents
  drop constraint if exists managed_operations_agents_role_check;
alter table public.managed_operations_agents
  add constraint managed_operations_agents_role_check check (role in (
    'outreach_growth', 'profile_drafting', 'verification_triage',
    'operations_supervisor', 'customer_support', 'social_content',
    'executive_strategy', 'operations_coordinator', 'data_experimentation',
    'governance_risk', 'independent_auditor', 'growth_strategy',
    'farmer_acquisition', 'buyer_acquisition', 'farmer_onboarding',
    'marketplace_matching', 'seo_editorial', 'product_management',
    'engineering_planning', 'qa_reliability', 'support_trust'
  ));

insert into public.managed_operations_agents (
  role, display_name, interval_seconds, max_items_per_run
) values
  ('executive_strategy', 'Executive Strategy', 86400, 1),
  ('operations_coordinator', 'Operations Coordinator', 21600, 1),
  ('data_experimentation', 'Data & Experimentation', 86400, 1),
  ('governance_risk', 'Governance & Risk', 86400, 1),
  ('independent_auditor', 'Independent Agent Auditor', 21600, 1),
  ('growth_strategy', 'Growth Strategy', 86400, 1),
  ('farmer_acquisition', 'Farmer Acquisition', 86400, 1),
  ('buyer_acquisition', 'Buyer & Wholesaler Acquisition', 86400, 1),
  ('farmer_onboarding', 'Farmer Onboarding', 21600, 1),
  ('marketplace_matching', 'Marketplace Matching', 3600, 1),
  ('seo_editorial', 'SEO & Editorial', 86400, 1),
  ('product_management', 'Product Management', 86400, 1),
  ('engineering_planning', 'Engineering Planning', 86400, 1),
  ('qa_reliability', 'QA & Reliability', 21600, 1),
  ('support_trust', 'Support & Trust', 3600, 1)
on conflict (role) do nothing;

create table public.company_objectives (
  id uuid primary key,
  metric_key text not null unique check (metric_key in (
    'registered_users', 'activated_users', 'monthly_active_users'
  )),
  display_name text not null check (char_length(display_name) between 3 and 80),
  target_value bigint not null check (target_value between 1 and 100000000),
  starts_at timestamptz not null,
  deadline_at timestamptz not null,
  status text not null default 'active' check (status in (
    'active', 'paused', 'completed', 'cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deadline_at > starts_at)
);

insert into public.company_objectives (
  id, metric_key, display_name, target_value, starts_at, deadline_at
) values
  ('00000000-0000-4000-8000-000000001001', 'registered_users',
    'Registered users', 100000, now(), now() + interval '180 days'),
  ('00000000-0000-4000-8000-000000001002', 'activated_users',
    'Activated users', 40000, now(), now() + interval '180 days'),
  ('00000000-0000-4000-8000-000000001003', 'monthly_active_users',
    'Monthly active users', 25000, now(), now() + interval '180 days')
on conflict (id) do nothing;

create table public.company_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.managed_operations_agent_runs(id)
    on delete restrict,
  role text not null references public.managed_operations_agents(role)
    on delete restrict,
  definition_version text not null default 'company-metrics-v1'
    check (definition_version = 'company-metrics-v1'),
  metrics jsonb not null check (
    jsonb_typeof(metrics) = 'object'
    and octet_length(metrics::text) <= 8192
  ),
  idempotency_key uuid not null unique,
  captured_at timestamptz not null default now()
);

create table public.company_agent_proposals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.managed_operations_agent_runs(id)
    on delete restrict,
  snapshot_id uuid not null references public.company_kpi_snapshots(id)
    on delete restrict,
  role text not null references public.managed_operations_agents(role)
    on delete restrict,
  policy_version text not null default 'company-policy-v1'
    check (policy_version = 'company-policy-v1'),
  title text not null check (char_length(title) between 5 and 160),
  summary text not null check (char_length(summary) between 20 and 2000),
  action_kind text not null check (action_kind in (
    'strategic_focus', 'resolve_blocker', 'improve_measurement',
    'review_risk', 'audit_control', 'grow_activation',
    'acquire_farmers', 'acquire_buyers', 'improve_onboarding',
    'improve_liquidity', 'plan_editorial', 'investigate_product',
    'investigate_engineering', 'expand_qa', 'review_support_trust'
  )),
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  evidence jsonb not null check (
    jsonb_typeof(evidence) = 'object'
    and octet_length(evidence::text) <= 4096
  ),
  state text not null default 'pending' check (state in (
    'pending', 'approved', 'rejected', 'escalated', 'obsolete'
  )),
  revision integer not null default 0 check (revision >= 0),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewer_reason text check (
    reviewer_reason is null or char_length(reviewer_reason) between 5 and 1000
  ),
  reviewed_at timestamptz,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (state = 'pending' and reviewed_by is null and reviewer_reason is null
      and reviewed_at is null)
    or
    (state in ('approved', 'rejected', 'escalated', 'obsolete')
      and reviewed_by is not null and reviewer_reason is not null
      and reviewed_at is not null)
  )
);

create table public.company_agent_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.company_agent_proposals(id)
    on delete restrict,
  actor_id uuid references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in (
    'proposal_recorded', 'approved', 'rejected', 'escalated', 'obsolete'
  )),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object'
    and octet_length(details::text) <= 2048
    and details - array[
      'role', 'policyVersion', 'actionKind', 'priority', 'riskLevel',
      'decision', 'reasonSha256', 'previousRevision', 'nextRevision'
    ]::text[] = '{}'::jsonb
  ),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create index company_agent_proposals_state_created_idx
  on public.company_agent_proposals (state, created_at desc);
create index company_agent_proposals_role_created_idx
  on public.company_agent_proposals (role, created_at desc);
create index company_agent_proposal_events_proposal_created_idx
  on public.company_agent_proposal_events (proposal_id, created_at);

create trigger company_objectives_set_updated_at
before update on public.company_objectives
for each row execute function public.set_updated_at();
create trigger company_agent_proposals_set_updated_at
before update on public.company_agent_proposals
for each row execute function public.set_updated_at();

create or replace function public.prevent_company_agent_proposal_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Company Agent proposal events are immutable'
    using errcode = '42501', detail = 'AUDIT_IMMUTABLE';
end;
$$;

create trigger company_agent_proposal_events_are_immutable
before update or delete on public.company_agent_proposal_events
for each row execute function public.prevent_company_agent_proposal_event_mutation();

create or replace function public.collect_ai_company_metrics()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  open_support_cases_value bigint := 0;
  technical_support_cases_value bigint := 0;
  pending_action_proposals_value bigint := 0;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('ai_company') then
    raise exception 'AI company control plane is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  -- The production database intentionally omits the separately gated
  -- support/social pilot. Preserve a zero aggregate until those private tables
  -- exist instead of requiring an unrelated migration for the company fleet.
  if pg_catalog.to_regclass('public.support_cases') is not null then
    execute $query$
      select count(*) from public.support_cases
      where state in ('open', 'proposal_ready', 'escalated')
    $query$ into open_support_cases_value;
    execute $query$
      select count(*) from public.support_cases
      where category = 'technical'
        and state in ('open', 'proposal_ready', 'escalated')
    $query$ into technical_support_cases_value;
  end if;
  if pg_catalog.to_regclass('public.agent_action_proposals') is not null then
    execute $query$
      select count(*) from public.agent_action_proposals where state = 'pending'
    $query$ into pending_action_proposals_value;
  end if;
  return jsonb_build_object(
    'capturedAt', now(),
    'registeredUsers', (select count(*) from public.profiles where status = 'active'),
    'activatedUsers', (select count(*) from public.profiles
      where status = 'active' and onboarding_complete),
    'monthlyActiveUsers', (select count(distinct user_id) from public.product_events
      where user_id is not null and created_at >= now() - interval '30 days'),
    'registeredFarmers', (select count(*) from public.profiles
      where status = 'active' and account_role = 'farmer'),
    'registeredBuyers', (select count(*) from public.profiles
      where status = 'active' and account_role = 'customer'),
    'registeredWholesalers', (select count(*) from public.profiles
      where status = 'active' and account_role = 'wholesaler'),
    'registeredAgriBusinesses', (select count(*) from public.profiles
      where status = 'active' and account_role = 'agri_business'),
    'activePosts', (select count(*) from public.posts where status = 'active'),
    'activeListings', (select count(*) from public.produce_listings where status = 'active'),
    'activeListingsWithoutEnquiries', (select count(*) from public.produce_listings
      where status = 'active' and enquiry_count = 0),
    'marketEnquiries', (select count(*) from public.market_enquiries),
    'wonMarketEnquiries', (select count(*) from public.market_enquiries where status = 'won'),
    'openSupportCases', open_support_cases_value,
    'technicalSupportCases', technical_support_cases_value,
    'pendingReports', (select count(*) from public.reports where status = 'pending'),
    'pendingCompanyProposals', (select count(*) from public.company_agent_proposals
      where state = 'pending'),
    'pendingActionProposals', pending_action_proposals_value,
    'managedRunFailures24h', (select count(*)
      from public.managed_operations_agent_runs
      where started_at >= now() - interval '24 hours'
        and state in ('failed', 'partial'))
  );
end;
$$;

create or replace function public.record_ai_company_snapshot(
  run_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, snapshot_id uuid, metrics jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_record public.managed_operations_agent_runs%rowtype;
  prior public.company_kpi_snapshots%rowtype;
  created_id uuid;
  metrics_value jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if idempotency_key_input is null then
    raise exception 'Invalid company snapshot input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select snapshot.* into prior
  from public.company_kpi_snapshots snapshot
  where snapshot.idempotency_key = idempotency_key_input
  for update;
  if found then
    if prior.run_id <> run_id_input then
      raise exception 'Company snapshot idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', prior.id, prior.metrics;
    return;
  end if;
  select run.* into run_record
  from public.managed_operations_agent_runs run
  where run.id = run_id_input and run.state = 'running'
    and run.role in (
      'executive_strategy', 'operations_coordinator', 'data_experimentation',
      'governance_risk', 'independent_auditor', 'growth_strategy',
      'farmer_acquisition', 'buyer_acquisition', 'farmer_onboarding',
      'marketplace_matching', 'seo_editorial', 'product_management',
      'engineering_planning', 'qa_reliability', 'support_trust'
    )
  for update;
  if not found then
    raise exception 'A running company Agent lease is required'
      using errcode = '42501', detail = 'RUN_REQUIRED';
  end if;
  metrics_value := public.collect_ai_company_metrics();
  insert into public.company_kpi_snapshots (
    run_id, role, metrics, idempotency_key
  ) values (
    run_record.id, run_record.role, metrics_value, idempotency_key_input
  ) returning id into created_id;
  return query select 'RECORDED', created_id, metrics_value;
end;
$$;

create or replace function public.record_ai_company_proposal(
  run_id_input uuid,
  snapshot_id_input uuid,
  title_input text,
  summary_input text,
  action_kind_input text,
  priority_input text,
  risk_level_input text,
  evidence_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, proposal_id uuid, state text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_record public.managed_operations_agent_runs%rowtype;
  snapshot_record public.company_kpi_snapshots%rowtype;
  prior public.company_agent_proposals%rowtype;
  created_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if char_length(btrim(title_input)) not between 5 and 160
    or char_length(btrim(summary_input)) not between 20 and 2000
    or action_kind_input not in (
      'strategic_focus', 'resolve_blocker', 'improve_measurement',
      'review_risk', 'audit_control', 'grow_activation',
      'acquire_farmers', 'acquire_buyers', 'improve_onboarding',
      'improve_liquidity', 'plan_editorial', 'investigate_product',
      'investigate_engineering', 'expand_qa', 'review_support_trust'
    ) or priority_input not in ('low', 'medium', 'high', 'critical')
    or risk_level_input not in ('low', 'medium', 'high')
    or jsonb_typeof(evidence_input) <> 'object'
    or octet_length(evidence_input::text) > 4096
    or idempotency_key_input is null
  then
    raise exception 'Invalid company Agent proposal'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select proposal.* into prior
  from public.company_agent_proposals proposal
  where proposal.idempotency_key = idempotency_key_input
  for update;
  if found then
    if prior.run_id <> run_id_input or prior.snapshot_id <> snapshot_id_input then
      raise exception 'Company proposal idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', prior.id, prior.state, prior.revision;
    return;
  end if;
  select run.* into run_record
  from public.managed_operations_agent_runs run
  where run.id = run_id_input and run.state = 'running'
  for update;
  select snapshot.* into snapshot_record
  from public.company_kpi_snapshots snapshot
  where snapshot.id = snapshot_id_input and snapshot.run_id = run_id_input;
  if run_record.id is null or snapshot_record.id is null
    or run_record.role <> snapshot_record.role
    or not (snapshot_record.metrics @> evidence_input)
  then
    raise exception 'Proposal evidence must belong to the matching company run'
      using errcode = '42501', detail = 'RUN_EVIDENCE_REQUIRED';
  end if;
  insert into public.company_agent_proposals (
    run_id, snapshot_id, role, title, summary, action_kind, priority,
    risk_level, evidence, idempotency_key
  ) values (
    run_record.id, snapshot_record.id, run_record.role, btrim(title_input),
    btrim(summary_input), action_kind_input, priority_input,
    risk_level_input, evidence_input, idempotency_key_input
  ) returning id into created_id;
  insert into public.company_agent_proposal_events (
    proposal_id, event_type, details, idempotency_key
  ) values (
    created_id, 'proposal_recorded', jsonb_build_object(
      'role', run_record.role, 'policyVersion', 'company-policy-v1',
      'actionKind', action_kind_input, 'priority', priority_input,
      'riskLevel', risk_level_input
    ), gen_random_uuid()
  );
  return query select 'RECORDED', created_id, 'pending', 0;
end;
$$;

create or replace function public.review_ai_company_proposal(
  proposal_id_input uuid,
  decision_input text,
  expected_revision_input integer,
  reason_input text,
  idempotency_key_input uuid
)
returns table(code text, proposal_id uuid, state text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  proposal public.company_agent_proposals%rowtype;
  prior_event public.company_agent_proposal_events%rowtype;
  next_revision integer;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('ai_company') then
    raise exception 'AI company control plane is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if decision_input not in ('approved', 'rejected', 'escalated', 'obsolete')
    or expected_revision_input < 0
    or char_length(btrim(reason_input)) not between 5 and 1000
    or idempotency_key_input is null
  then
    raise exception 'Invalid company proposal review'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select event.* into prior_event
  from public.company_agent_proposal_events event
  where event.idempotency_key = idempotency_key_input
  for update;
  if found then
    if prior_event.proposal_id <> proposal_id_input
      or prior_event.event_type <> decision_input
    then
      raise exception 'Company review idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    select current.* into proposal
    from public.company_agent_proposals current
    where current.id = proposal_id_input;
    return query select 'IDEMPOTENT_REPLAY', proposal.id,
      proposal.state, proposal.revision;
    return;
  end if;
  select current.* into proposal
  from public.company_agent_proposals current
  where current.id = proposal_id_input
  for update;
  if not found then
    raise exception 'Company proposal not found'
      using errcode = 'P0002', detail = 'PROPOSAL_NOT_FOUND';
  end if;
  if proposal.state <> 'pending' then
    raise exception 'Company proposal was already reviewed'
      using errcode = '22023', detail = 'ALREADY_REVIEWED';
  end if;
  if proposal.revision <> expected_revision_input then
    raise exception 'Company proposal revision conflict'
      using errcode = '40001', detail = 'REVISION_CONFLICT';
  end if;
  next_revision := proposal.revision + 1;
  update public.company_agent_proposals current
  set state = decision_input,
      revision = next_revision,
      reviewed_by = actor_id,
      reviewer_reason = btrim(reason_input),
      reviewed_at = now()
  where current.id = proposal.id;
  insert into public.company_agent_proposal_events (
    proposal_id, actor_id, event_type, details, idempotency_key
  ) values (
    proposal.id, actor_id, decision_input, jsonb_build_object(
      'decision', decision_input,
      'reasonSha256', pg_catalog.encode(
        extensions.digest(pg_catalog.convert_to(btrim(reason_input), 'UTF8'), 'sha256'),
        'hex'
      ),
      'previousRevision', proposal.revision,
      'nextRevision', next_revision
    ), idempotency_key_input
  );
  return query select upper(decision_input), proposal.id,
    decision_input, next_revision;
end;
$$;

create or replace function public.list_ai_company_objectives()
returns table(
  id uuid, metric_key text, display_name text, target_value bigint,
  starts_at timestamptz, deadline_at timestamptz, status text
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
  return query select objective.id, objective.metric_key,
    objective.display_name, objective.target_value, objective.starts_at,
    objective.deadline_at, objective.status
  from public.company_objectives objective
  order by objective.target_value desc;
end;
$$;

create or replace function public.ai_company_control_status()
returns table(
  managed_operations_enabled boolean,
  ai_company_enabled boolean
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
  return query select
    public.is_ecosystem_release_enabled('managed_operations_agents'),
    public.is_ecosystem_release_enabled('ai_company');
end;
$$;

create or replace function public.ai_company_latest_metrics()
returns table(
  snapshot_id uuid, role text, definition_version text,
  metrics jsonb, captured_at timestamptz
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
  return query select snapshot.id, snapshot.role,
    snapshot.definition_version, snapshot.metrics, snapshot.captured_at
  from public.company_kpi_snapshots snapshot
  order by snapshot.captured_at desc
  limit 1;
end;
$$;

create or replace function public.list_ai_company_proposals(
  limit_input integer default 40
)
returns table(
  id uuid, role text, title text, summary text, action_kind text,
  priority text, risk_level text, evidence jsonb, state text,
  revision integer, reviewer_reason text, created_at timestamptz,
  reviewed_at timestamptz
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
    raise exception 'Invalid company proposal list limit'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  return query select proposal.id, proposal.role, proposal.title,
    proposal.summary, proposal.action_kind, proposal.priority,
    proposal.risk_level, proposal.evidence, proposal.state,
    proposal.revision, proposal.reviewer_reason, proposal.created_at,
    proposal.reviewed_at
  from public.company_agent_proposals proposal
  order by (proposal.state = 'pending') desc, proposal.created_at desc
  limit limit_input;
end;
$$;

-- Replace the six-role command allowlists with a table-backed role check while
-- retaining the independent support/social and AI-company release gates.
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
  if role_input in ('customer_support', 'social_content')
    and not public.is_ecosystem_release_enabled('support_social_pilot')
  then
    raise exception 'Support and social pilot is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if role_input in (
    'executive_strategy', 'operations_coordinator', 'data_experimentation',
    'governance_risk', 'independent_auditor', 'growth_strategy',
    'farmer_acquisition', 'buyer_acquisition', 'farmer_onboarding',
    'marketplace_matching', 'seo_editorial', 'product_management',
    'engineering_planning', 'qa_reliability', 'support_trust'
  ) and not public.is_ecosystem_release_enabled('ai_company')
  then
    raise exception 'AI company control plane is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if not exists (
    select 1 from public.managed_operations_agents agent
    where agent.role = role_input
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
  if not exists (
    select 1 from public.managed_operations_agents agent
    where agent.role = role_input
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
  if enabled_input and role_input in ('customer_support', 'social_content')
    and not public.is_ecosystem_release_enabled('support_social_pilot')
  then
    raise exception 'Support and social pilot is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if enabled_input and role_input in (
    'executive_strategy', 'operations_coordinator', 'data_experimentation',
    'governance_risk', 'independent_auditor', 'growth_strategy',
    'farmer_acquisition', 'buyer_acquisition', 'farmer_onboarding',
    'marketplace_matching', 'seo_editorial', 'product_management',
    'engineering_planning', 'qa_reliability', 'support_trust'
  ) and not public.is_ecosystem_release_enabled('ai_company')
  then
    raise exception 'AI company control plane is disabled'
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
  insert into public.managed_operations_agent_events (
    role, actor_id, event_type, reason, details, idempotency_key
  ) values (
    role_input, actor_id, desired_event, btrim(reason_input),
    jsonb_build_object(
      'enabled', enabled_input,
      'intervalSeconds', interval_seconds_input,
      'maxItemsPerRun', max_items_per_run_input
    ), idempotency_key_input
  );
  return query select case when enabled_input then 'CONFIGURED' else 'PAUSED' end,
    role_input, enabled_input;
end;
$$;

alter table public.company_objectives enable row level security;
alter table public.company_kpi_snapshots enable row level security;
alter table public.company_agent_proposals enable row level security;
alter table public.company_agent_proposal_events enable row level security;

create policy company_objectives_service_read
on public.company_objectives for select to service_role using (true);
create policy company_kpi_snapshots_service_read
on public.company_kpi_snapshots for select to service_role using (true);
create policy company_agent_proposals_service_read
on public.company_agent_proposals for select to service_role using (true);
create policy company_agent_proposal_events_service_read
on public.company_agent_proposal_events for select to service_role using (true);

revoke all on table public.company_objectives,
  public.company_kpi_snapshots,
  public.company_agent_proposals,
  public.company_agent_proposal_events
from public, anon, authenticated, service_role;
grant select on table public.company_objectives,
  public.company_kpi_snapshots,
  public.company_agent_proposals,
  public.company_agent_proposal_events
to service_role;

revoke all on function public.prevent_company_agent_proposal_event_mutation()
from public, anon, authenticated, service_role;
revoke all on function public.collect_ai_company_metrics()
from public, anon, authenticated, service_role;
grant execute on function public.collect_ai_company_metrics() to service_role;
revoke all on function public.record_ai_company_snapshot(uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.record_ai_company_snapshot(uuid, uuid)
to service_role;
revoke all on function public.record_ai_company_proposal(
  uuid, uuid, text, text, text, text, text, jsonb, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.record_ai_company_proposal(
  uuid, uuid, text, text, text, text, text, jsonb, uuid
) to service_role;
revoke all on function public.review_ai_company_proposal(
  uuid, text, integer, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.review_ai_company_proposal(
  uuid, text, integer, text, uuid
) to authenticated;
revoke all on function public.list_ai_company_objectives()
from public, anon, authenticated, service_role;
grant execute on function public.list_ai_company_objectives() to authenticated;
revoke all on function public.ai_company_control_status()
from public, anon, authenticated, service_role;
grant execute on function public.ai_company_control_status() to authenticated;
revoke all on function public.ai_company_latest_metrics()
from public, anon, authenticated, service_role;
grant execute on function public.ai_company_latest_metrics() to authenticated;
revoke all on function public.list_ai_company_proposals(integer)
from public, anon, authenticated, service_role;
grant execute on function public.list_ai_company_proposals(integer) to authenticated;

revoke all on function public.request_managed_operations_agent_run(
  text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.request_managed_operations_agent_run(
  text, text, uuid
) to authenticated;
revoke all on function public.configure_managed_operations_agent(
  text, boolean, integer, integer, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.configure_managed_operations_agent(
  text, boolean, integer, integer, text, uuid
) to authenticated;
