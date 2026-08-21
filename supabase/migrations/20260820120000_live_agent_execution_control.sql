-- Private, default-off authorization boundary for live agent actions.
-- This migration creates no provider credential and enables no executor.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents', 'managed_operations_agents',
      'featured_farmer_profiles', 'private_farmer_contacts',
      'sourced_farmer_research', 'support_social_pilot', 'ai_company',
      'live_agent_execution'
    )
  );
insert into public.ecosystem_release_controls (control_key, enabled)
values ('live_agent_execution', false)
on conflict (control_key) do nothing;

create table public.live_agent_executor_controls (
  executor text primary key check (executor in (
    'consent_outreach', 'in_app_lifecycle', 'support_reply',
    'owned_site_publish', 'marketplace_recommendation', 'experiment',
    'engineering_pr', 'canary_release'
  )),
  paused boolean not null default true,
  shadow_only boolean not null default true,
  canary_stage smallint not null default 0 check (canary_stage between 0 and 20),
  daily_action_limit integer not null check (daily_action_limit between 0 and 10000),
  monthly_action_limit integer not null check (monthly_action_limit between 0 and 300000),
  daily_spend_limit_paise bigint not null default 0
    check (daily_spend_limit_paise between 0 and 1000000000),
  monthly_spend_limit_paise bigint not null default 0
    check (monthly_spend_limit_paise between 0 and 10000000000),
  lease_seconds integer not null default 60 check (lease_seconds between 15 and 300),
  pause_reason_code text not null default 'DEFAULT_OFF'
    check (pause_reason_code ~ '^[A-Z0-9_]{2,80}$'),
  revision integer not null default 0 check (revision >= 0),
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (monthly_action_limit >= daily_action_limit),
  check (monthly_spend_limit_paise >= daily_spend_limit_paise)
);

insert into public.live_agent_executor_controls (
  executor, daily_action_limit, monthly_action_limit,
  daily_spend_limit_paise, monthly_spend_limit_paise
) values
  ('consent_outreach', 10, 300, 0, 0),
  ('in_app_lifecycle', 50, 1500, 0, 0),
  ('support_reply', 10, 300, 0, 0),
  ('owned_site_publish', 1, 30, 0, 0),
  ('marketplace_recommendation', 50, 1500, 0, 0),
  ('experiment', 10, 300, 0, 0),
  ('engineering_pr', 5, 100, 0, 0),
  ('canary_release', 1, 20, 0, 0)
on conflict (executor) do nothing;

create table public.agent_action_authorizations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.company_agent_proposals(id)
    on delete restrict,
  proposal_revision integer not null check (proposal_revision >= 0),
  proposer_role text not null references public.managed_operations_agents(role)
    on delete restrict,
  proposer_id uuid not null references public.profiles(id) on delete restrict,
  executor text not null references public.live_agent_executor_controls(executor)
    on delete restrict,
  action_type text not null check (action_type ~ '^[a-z0-9_]{3,80}$'),
  target_scope jsonb not null check (
    jsonb_typeof(target_scope) = 'object'
    and target_scope <> '{}'::jsonb
    and octet_length(target_scope::text) <= 4096
    and not target_scope ?| array[
      'email', 'phone', 'name', 'message', 'body', 'token', 'secret', 'password'
    ]::text[]
  ),
  target_scope_sha256 text not null check (target_scope_sha256 ~ '^[0-9a-f]{64}$'),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  approval_tier smallint not null check (approval_tier between 0 and 5),
  required_approvals smallint not null check (required_approvals between 0 and 2),
  state text not null check (state in (
    'pending_approval', 'authorized', 'revoked', 'expired', 'exhausted',
    'paused', 'completed'
  )),
  revision integer not null default 0 check (revision >= 0),
  max_actions integer not null check (max_actions between 1 and 10000),
  max_spend_paise bigint not null check (max_spend_paise between 0 and 1000000000),
  canary_stage smallint not null check (canary_stage between 0 and 20),
  not_before timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete restrict,
  revocation_reason_sha256 text check (
    revocation_reason_sha256 is null or revocation_reason_sha256 ~ '^[0-9a-f]{64}$'
  ),
  policy_version text not null default 'live-action-policy-v1'
    check (policy_version = 'live-action-policy-v1'),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > not_before and expires_at <= created_at + interval '7 days'),
  check (
    (state = 'revoked' and revoked_at is not null and revoked_by is not null
      and revocation_reason_sha256 is not null)
    or
    (state <> 'revoked' and revoked_at is null and revoked_by is null
      and revocation_reason_sha256 is null)
  )
);

create table public.agent_action_approvals (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.agent_action_authorizations(id)
    on delete restrict,
  approver_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  reason_sha256 text not null check (reason_sha256 ~ '^[0-9a-f]{64}$'),
  authorization_revision integer not null check (authorization_revision >= 0),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  unique (authorization_id, approver_id)
);

create table public.agent_action_attempts (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.agent_action_authorizations(id)
    on delete restrict,
  attempt_number integer not null check (attempt_number between 1 and 10000),
  executor text not null references public.live_agent_executor_controls(executor)
    on delete restrict,
  connector text not null,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  target_scope_sha256 text not null check (target_scope_sha256 ~ '^[0-9a-f]{64}$'),
  state text not null default 'prepared' check (state in (
    'prepared', 'dispatched', 'verified', 'unknown', 'failed', 'compensated'
  )),
  lease_token_sha256 text not null check (lease_token_sha256 ~ '^[0-9a-f]{64}$'),
  lease_expires_at timestamptz not null,
  dispatch_authorized_at timestamptz,
  dispatched_at timestamptz,
  receipt_sha256 text check (
    receipt_sha256 is null or receipt_sha256 ~ '^[0-9a-f]{64}$'
  ),
  receipt_metadata jsonb check (
    receipt_metadata is null or (
      jsonb_typeof(receipt_metadata) = 'object'
      and octet_length(receipt_metadata::text) <= 2048
      and receipt_metadata - array[
        'provider', 'providerReceiptSha256', 'statusCode', 'occurredAt',
        'reconciliationCode', 'reasonCode'
      ]::text[] = '{}'::jsonb
    )
  ),
  verifier_identity text check (
    verifier_identity is null or verifier_identity in (
      'independent_auditor', 'action_verifier'
    )
  ),
  verified_at timestamptz,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (authorization_id, attempt_number),
  check (connector = executor),
  check ((state = 'prepared') or dispatch_authorized_at is not null),
  check (
    state in ('prepared', 'unknown', 'failed')
    or (receipt_sha256 is not null and dispatched_at is not null)
  ),
  check ((verified_at is null) = (state not in ('verified', 'failed', 'compensated')))
);

create table public.agent_action_budget_ledger (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.agent_action_authorizations(id)
    on delete restrict,
  attempt_id uuid not null unique references public.agent_action_attempts(id)
    on delete restrict,
  executor text not null references public.live_agent_executor_controls(executor)
    on delete restrict,
  action_count integer not null default 1 check (action_count = 1),
  spend_paise bigint not null check (spend_paise between 0 and 1000000000),
  day_bucket date not null,
  month_bucket date not null,
  reserved_at timestamptz not null default now(),
  check (month_bucket = date_trunc('month', day_bucket)::date)
);

create table public.agent_action_events (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.agent_action_authorizations(id)
    on delete restrict,
  attempt_id uuid references public.agent_action_attempts(id) on delete restrict,
  sequence_number integer not null check (sequence_number >= 1),
  actor_kind text not null check (actor_kind in (
    'planner', 'administrator', 'authorizer', 'executor', 'verifier', 'reconciler'
  )),
  actor_ref text not null check (
    actor_ref ~ '^[a-z0-9_:-]{2,120}$'
  ),
  event_type text not null check (event_type in (
    'authorization_created', 'approval_recorded', 'authorization_rejected',
    'authorization_revoked', 'attempt_prepared', 'dispatch_authorized',
    'receipt_recorded', 'verification_recorded', 'reconciliation_recorded',
    'compensation_recorded', 'executor_paused'
  )),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object'
    and octet_length(details::text) <= 2048
    and details - array[
      'executor', 'actionType', 'riskLevel', 'approvalTier', 'state',
      'decision', 'reasonSha256', 'requestSha256', 'payloadSha256',
      'targetScopeSha256', 'receiptSha256', 'providerReceiptSha256',
      'spendPaise', 'canaryStage', 'verifierIdentity', 'result',
      'previousRevision', 'nextRevision', 'pauseReasonCode'
    ]::text[] = '{}'::jsonb
  ),
  previous_event_hash text check (
    previous_event_hash is null or previous_event_hash ~ '^[0-9a-f]{64}$'
  ),
  event_hash text not null unique check (event_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  unique (authorization_id, sequence_number),
  check (
    (sequence_number = 1 and previous_event_hash is null)
    or (sequence_number > 1 and previous_event_hash is not null)
  )
);

create table public.live_agent_executor_control_events (
  id uuid primary key default gen_random_uuid(),
  executor text not null references public.live_agent_executor_controls(executor)
    on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('paused', 'enabled')),
  reason_sha256 text not null check (reason_sha256 ~ '^[0-9a-f]{64}$'),
  configuration jsonb not null check (
    jsonb_typeof(configuration) = 'object'
    and configuration - array[
      'paused', 'canaryStage', 'dailyActionLimit', 'monthlyActionLimit',
      'dailySpendLimitPaise', 'monthlySpendLimitPaise', 'revision'
    ]::text[] = '{}'::jsonb
  ),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create index agent_action_authorizations_state_expiry_idx
  on public.agent_action_authorizations (state, expires_at);
create index agent_action_authorizations_executor_created_idx
  on public.agent_action_authorizations (executor, created_at desc);
create index agent_action_approvals_authorization_created_idx
  on public.agent_action_approvals (authorization_id, created_at);
create index agent_action_attempts_authorization_created_idx
  on public.agent_action_attempts (authorization_id, created_at desc);
create index agent_action_attempts_state_updated_idx
  on public.agent_action_attempts (state, updated_at);
create index agent_action_budget_executor_day_idx
  on public.agent_action_budget_ledger (executor, day_bucket);
create index agent_action_budget_executor_month_idx
  on public.agent_action_budget_ledger (executor, month_bucket);
create index agent_action_events_authorization_sequence_idx
  on public.agent_action_events (authorization_id, sequence_number);
create index live_agent_executor_control_events_executor_created_idx
  on public.live_agent_executor_control_events (executor, created_at desc);

create trigger live_agent_executor_controls_set_updated_at
before update on public.live_agent_executor_controls
for each row execute function public.set_updated_at();
create trigger agent_action_authorizations_set_updated_at
before update on public.agent_action_authorizations
for each row execute function public.set_updated_at();
create trigger agent_action_attempts_set_updated_at
before update on public.agent_action_attempts
for each row execute function public.set_updated_at();

create or replace function public.prevent_live_agent_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Live agent approval, budget and event ledgers are immutable'
    using errcode = '42501', detail = 'AUDIT_IMMUTABLE';
end;
$$;

create trigger agent_action_approvals_are_immutable
before update or delete on public.agent_action_approvals
for each row execute function public.prevent_live_agent_ledger_mutation();
create trigger agent_action_budget_ledger_is_immutable
before update or delete on public.agent_action_budget_ledger
for each row execute function public.prevent_live_agent_ledger_mutation();
create trigger agent_action_events_are_immutable
before update or delete on public.agent_action_events
for each row execute function public.prevent_live_agent_ledger_mutation();
create trigger live_agent_executor_control_events_are_immutable
before update or delete on public.live_agent_executor_control_events
for each row execute function public.prevent_live_agent_ledger_mutation();

create or replace function public.enforce_live_agent_frozen_contract()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'agent_action_authorizations' then
    if new.proposal_id is distinct from old.proposal_id
      or new.proposal_revision is distinct from old.proposal_revision
      or new.proposer_role is distinct from old.proposer_role
      or new.proposer_id is distinct from old.proposer_id
      or new.executor is distinct from old.executor
      or new.action_type is distinct from old.action_type
      or new.target_scope is distinct from old.target_scope
      or new.target_scope_sha256 is distinct from old.target_scope_sha256
      or new.payload_sha256 is distinct from old.payload_sha256
      or new.risk_level is distinct from old.risk_level
      or new.approval_tier is distinct from old.approval_tier
      or new.required_approvals is distinct from old.required_approvals
      or new.max_actions is distinct from old.max_actions
      or new.max_spend_paise is distinct from old.max_spend_paise
      or new.canary_stage is distinct from old.canary_stage
      or new.not_before is distinct from old.not_before
      or new.expires_at is distinct from old.expires_at
      or new.policy_version is distinct from old.policy_version
      or new.idempotency_key is distinct from old.idempotency_key
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Live action authorization contract is frozen'
        using errcode = '42501', detail = 'AUTHORIZATION_IMMUTABLE';
    end if;
  elsif tg_table_name = 'agent_action_attempts' then
    if new.authorization_id is distinct from old.authorization_id
      or new.attempt_number is distinct from old.attempt_number
      or new.executor is distinct from old.executor
      or new.connector is distinct from old.connector
      or new.request_sha256 is distinct from old.request_sha256
      or new.payload_sha256 is distinct from old.payload_sha256
      or new.target_scope_sha256 is distinct from old.target_scope_sha256
      or new.lease_token_sha256 is distinct from old.lease_token_sha256
      or new.lease_expires_at is distinct from old.lease_expires_at
      or new.idempotency_key is distinct from old.idempotency_key
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Live action attempt contract is frozen'
        using errcode = '42501', detail = 'ATTEMPT_IMMUTABLE';
    end if;
  end if;
  return new;
end;
$$;

create trigger agent_action_authorizations_freeze_contract
before update on public.agent_action_authorizations
for each row execute function public.enforce_live_agent_frozen_contract();
create trigger agent_action_attempts_freeze_contract
before update on public.agent_action_attempts
for each row execute function public.enforce_live_agent_frozen_contract();

create or replace function public.require_live_agent_action_principal(
  expected_principal_input text
)
returns void
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  actual_principal text := coalesce(
    (select auth.jwt()) ->> 'action_principal',
    (select auth.jwt()) -> 'app_metadata' ->> 'action_principal'
  );
begin
  if actual_principal is distinct from expected_principal_input then
    raise exception 'A capability-scoped live-action principal is required'
      using errcode = '42501', detail = 'ACTION_PRINCIPAL_REQUIRED';
  end if;
end;
$$;

create or replace function public.derive_live_agent_action_policy(
  executor_input text,
  action_type_input text
)
returns table(
  risk_level text,
  approval_tier integer,
  required_approvals integer,
  scope_type text,
  maximum_actions integer,
  maximum_spend_paise bigint,
  maximum_canary_stage integer,
  live_eligible boolean
)
language plpgsql
security definer
immutable
set search_path = ''
as $$
begin
  return query
    select policy.risk_level, policy.approval_tier, policy.required_approvals,
      policy.scope_type, policy.maximum_actions, policy.maximum_spend_paise,
      policy.maximum_canary_stage, policy.live_eligible
    from (values
      ('consent_outreach', 'consented_email_dispatch', 'high', 3, 1,
        'consented_recipient', 1, 0::bigint, 1, true),
      ('in_app_lifecycle', 'in_app_lifecycle_message', 'low', 2, 0,
        'member_lifecycle', 1, 0::bigint, 1, true),
      ('support_reply', 'approved_support_reply_send', 'medium', 3, 1,
        'support_case', 1, 0::bigint, 1, true),
      ('owned_site_publish', 'owned_site_article_publish', 'high', 4, 2,
        'owned_site_draft', 1, 0::bigint, 1, true),
      ('marketplace_recommendation', 'marketplace_recommendation_create', 'medium', 2, 0,
        'marketplace_member', 1, 0::bigint, 0, false),
      ('experiment', 'experiment_assignment_create', 'high', 4, 2,
        'experiment_cohort', 100, 0::bigint, 0, false),
      ('engineering_pr', 'engineering_pull_request_create', 'medium', 3, 1,
        'repository_branch', 1, 0::bigint, 0, false),
      ('canary_release', 'canary_release_deploy', 'critical', 4, 2,
        'canary_artifact', 1, 0::bigint, 0, false)
    ) as policy(
      executor, action_type, risk_level, approval_tier, required_approvals,
      scope_type, maximum_actions, maximum_spend_paise,
      maximum_canary_stage, live_eligible
    )
    where policy.executor = executor_input and policy.action_type = action_type_input;
  if not found then
    raise exception 'Action is not in the live-action policy allowlist'
      using errcode = '42501', detail = 'ACTION_PROHIBITED';
  end if;
end;
$$;

create or replace function public.is_valid_live_agent_target_scope(
  executor_input text,
  action_type_input text,
  scope_input jsonb
)
returns boolean
language plpgsql
security definer
immutable
set search_path = ''
as $$
declare
  uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
begin
  if scope_input is null or jsonb_typeof(scope_input) <> 'object' then
    return false;
  end if;
  case executor_input || ':' || action_type_input
    when 'consent_outreach:consented_email_dispatch' then
      return scope_input - array['scopeType', 'consentRecordId', 'recipientHash']::text[] = '{}'::jsonb
        and scope_input ->> 'scopeType' = 'consented_recipient'
        and scope_input ->> 'consentRecordId' ~ uuid_pattern
        and scope_input ->> 'recipientHash' ~ '^[0-9a-f]{64}$';
    when 'in_app_lifecycle:in_app_lifecycle_message' then
      return scope_input - array['scopeType', 'memberId']::text[] = '{}'::jsonb
        and scope_input ->> 'scopeType' = 'member_lifecycle'
        and scope_input ->> 'memberId' ~ uuid_pattern;
    when 'support_reply:approved_support_reply_send' then
      return scope_input - array['scopeType', 'caseId', 'replyProposalId']::text[] = '{}'::jsonb
        and scope_input ->> 'scopeType' = 'support_case'
        and scope_input ->> 'caseId' ~ uuid_pattern
        and scope_input ->> 'replyProposalId' ~ uuid_pattern;
    when 'owned_site_publish:owned_site_article_publish' then
      return scope_input - array['scopeType', 'draftId', 'slug']::text[] = '{}'::jsonb
        and scope_input ->> 'scopeType' = 'owned_site_draft'
        and scope_input ->> 'draftId' ~ uuid_pattern
        and char_length(scope_input ->> 'slug') between 3 and 120
        and scope_input ->> 'slug' ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$';
    when 'marketplace_recommendation:marketplace_recommendation_create' then
      return scope_input - array['scopeType', 'memberId', 'listingIds']::text[] = '{}'::jsonb
        and scope_input ->> 'scopeType' = 'marketplace_member'
        and scope_input ->> 'memberId' ~ uuid_pattern
        and jsonb_typeof(scope_input -> 'listingIds') = 'array'
        and jsonb_array_length(scope_input -> 'listingIds') between 1 and 10
        and not exists (
          select 1 from jsonb_array_elements_text(scope_input -> 'listingIds') item
          where item !~ uuid_pattern
        );
    when 'experiment:experiment_assignment_create' then
      return scope_input - array['scopeType', 'experimentId', 'cohortId']::text[] = '{}'::jsonb
        and scope_input ->> 'scopeType' = 'experiment_cohort'
        and scope_input ->> 'experimentId' ~ uuid_pattern
        and scope_input ->> 'cohortId' ~ uuid_pattern;
    when 'engineering_pr:engineering_pull_request_create' then
      return scope_input - array['scopeType', 'repository', 'branch']::text[] = '{}'::jsonb
        and scope_input ->> 'scopeType' = 'repository_branch'
        and char_length(scope_input ->> 'repository') between 3 and 180
        and scope_input ->> 'repository' ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'
        and char_length(scope_input ->> 'branch') between 3 and 180
        and scope_input ->> 'branch' ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$';
    when 'canary_release:canary_release_deploy' then
      return scope_input - array['scopeType', 'artifactSha256', 'trafficPercent']::text[] = '{}'::jsonb
        and scope_input ->> 'scopeType' = 'canary_artifact'
        and scope_input ->> 'artifactSha256' ~ '^[0-9a-f]{64}$'
        and jsonb_typeof(scope_input -> 'trafficPercent') = 'number'
        and scope_input ->> 'trafficPercent' ~ '^[0-9]+$'
        and (scope_input ->> 'trafficPercent')::integer between 1 and 100;
    else
      return false;
  end case;
end;
$$;

create or replace function public.is_redacted_live_agent_receipt(
  receipt_input jsonb
)
returns boolean
language sql
security definer
immutable
set search_path = ''
as $$
  select receipt_input is not null
    and jsonb_typeof(receipt_input) = 'object'
    and octet_length(receipt_input::text) <= 2048
    and receipt_input - array[
      'provider', 'providerReceiptSha256', 'statusCode', 'occurredAt',
      'reconciliationCode', 'reasonCode'
    ]::text[] = '{}'::jsonb
    and not exists (
      select 1 from jsonb_each(receipt_input) field
      where jsonb_typeof(field.value) in ('object', 'array')
        or octet_length(field.value::text) > 512
    )
    and (
      not receipt_input ? 'providerReceiptSha256'
      or receipt_input ->> 'providerReceiptSha256' ~ '^[0-9a-f]{64}$'
    )
    and (
      not receipt_input ? 'provider'
      or receipt_input ->> 'provider' ~ '^[a-z0-9][a-z0-9_-]{1,79}$'
    )
    and (
      not receipt_input ? 'statusCode'
      or (
        jsonb_typeof(receipt_input -> 'statusCode') = 'number'
        and receipt_input ->> 'statusCode' ~ '^[0-9]{3}$'
        and (receipt_input ->> 'statusCode')::integer between 100 and 599
      )
    )
    and (
      not receipt_input ? 'occurredAt'
      or receipt_input ->> 'occurredAt' ~
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
    )
    and (
      not receipt_input ? 'reconciliationCode'
      or receipt_input ->> 'reconciliationCode' ~ '^[A-Z0-9_]{2,80}$'
    )
    and (
      not receipt_input ? 'reasonCode'
      or receipt_input ->> 'reasonCode' ~ '^[A-Z0-9_]{2,80}$'
    );
$$;

alter table public.agent_action_authorizations
  add constraint agent_action_authorizations_exact_scope_check check (
    public.is_valid_live_agent_target_scope(executor, action_type, target_scope) is true
  );
alter table public.agent_action_attempts
  add constraint agent_action_attempts_redacted_receipt_check check (
    receipt_metadata is null
    or public.is_redacted_live_agent_receipt(receipt_metadata) is true
  );

create or replace function public.append_live_agent_action_event(
  authorization_id_input uuid,
  attempt_id_input uuid,
  actor_kind_input text,
  actor_ref_input text,
  event_type_input text,
  details_input jsonb,
  idempotency_key_input uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  prior public.agent_action_events%rowtype;
  sequence_value integer;
  event_hash_value text;
  created_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(authorization_id_input::text, 20260820)
  );
  select event.* into prior
  from public.agent_action_events event
  where event.authorization_id = authorization_id_input
  order by event.sequence_number desc
  limit 1;
  sequence_value := coalesce(prior.sequence_number, 0) + 1;
  event_hash_value := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    authorization_id_input::text || '|' || sequence_value::text || '|'
    || coalesce(prior.event_hash, '') || '|' || actor_kind_input || '|'
    || actor_ref_input || '|' || event_type_input || '|'
    || coalesce(details_input, '{}'::jsonb)::text || '|'
    || idempotency_key_input::text,
    'UTF8'
  ), 'sha256'), 'hex');
  insert into public.agent_action_events (
    authorization_id, attempt_id, sequence_number, actor_kind, actor_ref,
    event_type, details, previous_event_hash, event_hash, idempotency_key
  ) values (
    authorization_id_input, attempt_id_input, sequence_value, actor_kind_input,
    actor_ref_input, event_type_input, coalesce(details_input, '{}'::jsonb),
    prior.event_hash, event_hash_value, idempotency_key_input
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.create_live_agent_action_authorization(
  proposal_id_input uuid,
  executor_input text,
  action_type_input text,
  target_scope_input jsonb,
  payload_sha256_input text,
  max_actions_input integer,
  max_spend_paise_input bigint,
  canary_stage_input integer,
  not_before_input timestamptz,
  expires_at_input timestamptz,
  proposer_id_input uuid,
  idempotency_key_input uuid
)
returns table(
  code text,
  authorization_id uuid,
  approval_tier integer,
  risk_level text,
  state text,
  revision integer,
  required_approvals integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  proposal public.company_agent_proposals%rowtype;
  control public.live_agent_executor_controls%rowtype;
  existing public.agent_action_authorizations%rowtype;
  policy_risk text;
  policy_tier integer;
  policy_approvals integer;
  policy_scope_type text;
  policy_maximum_actions integer;
  policy_maximum_spend bigint;
  policy_maximum_canary integer;
  policy_live_eligible boolean;
  target_hash text;
  created_id uuid;
  created_state text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  perform public.require_live_agent_action_principal('authorizer');
  if not public.is_ecosystem_release_enabled('live_agent_execution') then
    raise exception 'Live agent execution is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if proposal_id_input is null or executor_input is null
    or action_type_input is null or target_scope_input is null
    or jsonb_typeof(target_scope_input) <> 'object'
    or target_scope_input = '{}'::jsonb
    or octet_length(target_scope_input::text) > 4096
    or target_scope_input ?| array[
      'email', 'phone', 'name', 'message', 'body', 'token', 'secret', 'password'
    ]::text[]
    or payload_sha256_input !~ '^[0-9a-f]{64}$'
    or max_actions_input not between 1 and 10000
    or max_spend_paise_input not between 0 and 1000000000
    or canary_stage_input not between 1 and 20
    or not_before_input is null or expires_at_input is null
    or not_before_input < now() - interval '1 minute'
    or expires_at_input <= greatest(now(), not_before_input)
    or expires_at_input > now() + interval '7 days'
    or idempotency_key_input is null
  then
    raise exception 'Invalid live action authorization input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select stored_authorization.* into existing
  from public.agent_action_authorizations stored_authorization
  where stored_authorization.idempotency_key = idempotency_key_input
  for update;
  if found then
    if existing.proposal_id <> proposal_id_input
      or existing.executor <> executor_input
      or existing.action_type <> action_type_input
      or existing.target_scope <> target_scope_input
      or existing.payload_sha256 <> payload_sha256_input
    then
      raise exception 'Live action authorization idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', existing.id,
      existing.approval_tier::integer, existing.risk_level, existing.state,
      existing.revision, existing.required_approvals::integer;
    return;
  end if;

  select company_proposal.* into proposal
  from public.company_agent_proposals company_proposal
  where company_proposal.id = proposal_id_input
  for share;
  if not found or proposal.state <> 'approved' then
    raise exception 'Only an approved company proposal may authorize an action'
      using errcode = '42501', detail = 'PROPOSAL_NOT_APPROVED';
  end if;
  if proposer_id_input is distinct from proposal.reviewed_by then
    raise exception 'Proposer identity must match the frozen proposal reviewer'
      using errcode = '42501', detail = 'PROPOSER_PROVENANCE_INVALID';
  end if;

  select executor_control.* into control
  from public.live_agent_executor_controls executor_control
  where executor_control.executor = executor_input
  for share;
  if not found then
    raise exception 'Unknown live action executor'
      using errcode = '22023', detail = 'INVALID_EXECUTOR';
  end if;
  if max_actions_input > control.monthly_action_limit
    or max_spend_paise_input > control.monthly_spend_limit_paise
    or canary_stage_input > control.canary_stage
  then
    raise exception 'Authorization exceeds executor policy limits'
      using errcode = '42501', detail = 'POLICY_LIMIT_EXCEEDED';
  end if;

  select derived.risk_level, derived.approval_tier, derived.required_approvals,
    derived.scope_type, derived.maximum_actions,
    derived.maximum_spend_paise, derived.maximum_canary_stage,
    derived.live_eligible
  into policy_risk, policy_tier, policy_approvals, policy_scope_type,
    policy_maximum_actions, policy_maximum_spend, policy_maximum_canary,
    policy_live_eligible
  from public.derive_live_agent_action_policy(
    executor_input, action_type_input
  ) derived;
  if not policy_live_eligible then
    raise exception 'Executor is shadow-only in the immutable live-action policy'
      using errcode = '42501', detail = 'LIVE_EXECUTION_PROHIBITED';
  end if;
  if target_scope_input ->> 'scopeType' <> policy_scope_type
    or public.is_valid_live_agent_target_scope(
      executor_input, action_type_input, target_scope_input
    ) is not true
  then
    raise exception 'Target scope does not match the action capability'
      using errcode = '42501', detail = 'TARGET_SCOPE_DENIED';
  end if;
  if max_actions_input > policy_maximum_actions
    or max_spend_paise_input > policy_maximum_spend
    or canary_stage_input > policy_maximum_canary
  then
    raise exception 'Authorization exceeds immutable action policy limits'
      using errcode = '42501', detail = 'ACTION_POLICY_LIMIT_EXCEEDED';
  end if;
  target_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    target_scope_input::text, 'UTF8'
  ), 'sha256'), 'hex');
  created_state := case when policy_approvals = 0
    then 'authorized' else 'pending_approval' end;

  insert into public.agent_action_authorizations (
    proposal_id, proposal_revision, proposer_role, proposer_id, executor,
    action_type, target_scope, target_scope_sha256, payload_sha256,
    risk_level, approval_tier, required_approvals, state, max_actions,
    max_spend_paise, canary_stage, not_before, expires_at, idempotency_key
  ) values (
    proposal.id, proposal.revision, proposal.role, proposer_id_input,
    executor_input, action_type_input, target_scope_input, target_hash,
    payload_sha256_input, policy_risk, policy_tier, policy_approvals,
    created_state, max_actions_input, max_spend_paise_input,
    canary_stage_input, not_before_input, expires_at_input,
    idempotency_key_input
  ) returning id into created_id;

  perform public.append_live_agent_action_event(
    created_id, null, 'planner', proposal.role, 'authorization_created',
    jsonb_build_object(
      'executor', executor_input, 'actionType', action_type_input,
      'riskLevel', policy_risk, 'approvalTier', policy_tier,
      'state', created_state, 'payloadSha256', payload_sha256_input,
      'targetScopeSha256', target_hash, 'canaryStage', canary_stage_input
    ), idempotency_key_input
  );
  return query select 'CREATED', created_id, policy_tier, policy_risk,
    created_state, 0, policy_approvals;
end;
$$;

create or replace function public.set_live_agent_executor_pause(
  executor_input text,
  paused_input boolean,
  daily_action_limit_input integer,
  monthly_action_limit_input integer,
  daily_spend_limit_paise_input bigint,
  monthly_spend_limit_paise_input bigint,
  canary_stage_input integer,
  reason_input text,
  idempotency_key_input uuid
)
returns table(code text, executor text, paused boolean, canary_stage integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing public.live_agent_executor_control_events%rowtype;
  next_revision integer;
  reason_hash text;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if executor_input is null or paused_input is null
    or daily_action_limit_input not between 0 and 10000
    or monthly_action_limit_input not between daily_action_limit_input and 300000
    or daily_spend_limit_paise_input not between 0 and 1000000000
    or monthly_spend_limit_paise_input
      not between daily_spend_limit_paise_input and 10000000000
    or canary_stage_input not between 0 and 20
    or char_length(btrim(reason_input)) not between 5 and 500
    or idempotency_key_input is null
  then
    raise exception 'Invalid live executor configuration'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if not paused_input
    and not public.is_ecosystem_release_enabled('live_agent_execution')
  then
    raise exception 'Live agent execution is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if not paused_input and canary_stage_input < 1 then
    raise exception 'A live executor requires a positive canary stage'
      using errcode = '42501', detail = 'CANARY_STAGE_REQUIRED';
  end if;
  if not paused_input and executor_input in (
    'marketplace_recommendation', 'experiment', 'engineering_pr',
    'canary_release'
  ) then
    raise exception 'Executor is not live-eligible in this policy version'
      using errcode = '42501', detail = 'LIVE_EXECUTION_PROHIBITED';
  end if;
  select event.* into existing
  from public.live_agent_executor_control_events event
  where event.idempotency_key = idempotency_key_input;
  if found then
    if existing.executor <> executor_input
      or (existing.configuration ->> 'paused')::boolean <> paused_input
    then
      raise exception 'Executor command idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', executor_input, paused_input,
      (existing.configuration ->> 'canaryStage')::integer;
    return;
  end if;

  update public.live_agent_executor_controls control
  set paused = paused_input,
      shadow_only = paused_input,
      daily_action_limit = daily_action_limit_input,
      monthly_action_limit = monthly_action_limit_input,
      daily_spend_limit_paise = daily_spend_limit_paise_input,
      monthly_spend_limit_paise = monthly_spend_limit_paise_input,
      canary_stage = canary_stage_input,
      pause_reason_code = case when paused_input then 'ADMIN_PAUSED' else 'ENABLED' end,
      revision = control.revision + 1,
      updated_by = actor_id
  where control.executor = executor_input
  returning control.revision into next_revision;
  if not found then
    raise exception 'Unknown live action executor'
      using errcode = '22023', detail = 'INVALID_EXECUTOR';
  end if;
  reason_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    btrim(reason_input), 'UTF8'
  ), 'sha256'), 'hex');
  insert into public.live_agent_executor_control_events (
    executor, actor_id, event_type, reason_sha256, configuration,
    idempotency_key
  ) values (
    executor_input, actor_id, case when paused_input then 'paused' else 'enabled' end,
    reason_hash, jsonb_build_object(
      'paused', paused_input, 'canaryStage', canary_stage_input,
      'dailyActionLimit', daily_action_limit_input,
      'monthlyActionLimit', monthly_action_limit_input,
      'dailySpendLimitPaise', daily_spend_limit_paise_input,
      'monthlySpendLimitPaise', monthly_spend_limit_paise_input,
      'revision', next_revision
    ), idempotency_key_input
  );
  return query select case when paused_input then 'PAUSED' else 'ENABLED' end,
    executor_input, paused_input, canary_stage_input;
end;
$$;

create or replace function public.live_agent_executor_controls()
returns table(
  release_enabled boolean,
  executor text,
  paused boolean,
  shadow_only boolean,
  daily_action_limit integer,
  monthly_action_limit integer,
  daily_spend_limit_paise bigint,
  monthly_spend_limit_paise bigint,
  canary_stage integer,
  revision integer,
  pause_reason_code text,
  updated_at timestamptz
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
    select public.is_ecosystem_release_enabled('live_agent_execution'),
      control.executor, control.paused, control.shadow_only,
      control.daily_action_limit, control.monthly_action_limit,
      control.daily_spend_limit_paise, control.monthly_spend_limit_paise,
      control.canary_stage::integer, control.revision,
      control.pause_reason_code, control.updated_at
    from public.live_agent_executor_controls control
    order by control.executor;
end;
$$;

create or replace function public.review_live_agent_action_authorization(
  authorization_id_input uuid,
  expected_revision_input integer,
  decision_input text,
  reason_input text,
  idempotency_key_input uuid
)
returns table(
  code text,
  authorization_id uuid,
  state text,
  revision integer,
  approval_count integer,
  required_approvals integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  authz public.agent_action_authorizations%rowtype;
  existing public.agent_action_approvals%rowtype;
  approved_count integer;
  next_state text;
  next_revision integer;
  reason_hash text;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('live_agent_execution') then
    raise exception 'Live agent execution is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if authorization_id_input is null or expected_revision_input < 0
    or decision_input not in ('approved', 'rejected')
    or char_length(btrim(reason_input)) not between 5 and 1000
    or idempotency_key_input is null
  then
    raise exception 'Invalid live action review input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select approval.* into existing
  from public.agent_action_approvals approval
  where approval.idempotency_key = idempotency_key_input;
  if found then
    if existing.authorization_id <> authorization_id_input
      or existing.approver_id <> actor_id
      or existing.decision <> decision_input
    then
      raise exception 'Action review idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    select action_authorization.* into authz
    from public.agent_action_authorizations action_authorization
    where action_authorization.id = authorization_id_input;
    select count(*)::integer into approved_count
    from public.agent_action_approvals approval
    where approval.authorization_id = authorization_id_input
      and approval.decision = 'approved';
    return query select 'IDEMPOTENT_REPLAY', authz.id,
      authz.state, authz.revision, approved_count,
      authz.required_approvals::integer;
    return;
  end if;

  select action_authorization.* into authz
  from public.agent_action_authorizations action_authorization
  where action_authorization.id = authorization_id_input
  for update;
  if not found then
    raise exception 'Live action authorization not found'
      using errcode = '22023', detail = 'NOT_FOUND';
  end if;
  if authz.state <> 'pending_approval' then
    raise exception 'Authorization is not awaiting approval'
      using errcode = '55000', detail = 'INVALID_STATE';
  end if;
  if authz.revision <> expected_revision_input then
    raise exception 'Authorization revision conflict'
      using errcode = '40001', detail = 'REVISION_CONFLICT';
  end if;
  if authz.expires_at <= now() then
    raise exception 'Authorization has expired'
      using errcode = '42501', detail = 'AUTHORIZATION_EXPIRED';
  end if;
  if authz.proposer_id = actor_id then
    raise exception 'The proposer cannot approve this authorization'
      using errcode = '42501', detail = 'PROPOSER_APPROVER_CONFLICT';
  end if;
  if exists (
    select 1 from public.agent_action_approvals approval
    where approval.authorization_id = authz.id
      and approval.approver_id = actor_id
  ) then
    raise exception 'Each authorization requires distinct approvers'
      using errcode = '42501', detail = 'DISTINCT_APPROVER_REQUIRED';
  end if;

  reason_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    btrim(reason_input), 'UTF8'
  ), 'sha256'), 'hex');
  insert into public.agent_action_approvals (
    authorization_id, approver_id, decision, reason_sha256,
    authorization_revision, idempotency_key
  ) values (
    authz.id, actor_id, decision_input, reason_hash,
    authz.revision, idempotency_key_input
  );
  select count(*)::integer into approved_count
  from public.agent_action_approvals approval
  where approval.authorization_id = authz.id
    and approval.decision = 'approved';
  next_revision := authz.revision + 1;
  next_state := case
    when decision_input = 'rejected' then 'revoked'
    when approved_count >= authz.required_approvals then 'authorized'
    else 'pending_approval'
  end;

  update public.agent_action_authorizations action_authorization
  set state = next_state,
      revision = next_revision,
      revoked_at = case when decision_input = 'rejected' then now() else null end,
      revoked_by = case when decision_input = 'rejected' then actor_id else null end,
      revocation_reason_sha256 = case
        when decision_input = 'rejected' then reason_hash else null end
  where action_authorization.id = authz.id;
  perform public.append_live_agent_action_event(
    authz.id, null, 'administrator', actor_id::text,
    case when decision_input = 'approved'
      then 'approval_recorded' else 'authorization_rejected' end,
    jsonb_build_object(
      'decision', decision_input, 'reasonSha256', reason_hash,
      'state', next_state, 'previousRevision', authz.revision,
      'nextRevision', next_revision
    ), idempotency_key_input
  );
  return query select upper(decision_input), authz.id, next_state,
    next_revision, approved_count, authz.required_approvals::integer;
end;
$$;

create or replace function public.revoke_live_agent_action_authorization(
  authorization_id_input uuid,
  expected_revision_input integer,
  reason_input text,
  idempotency_key_input uuid
)
returns table(code text, authorization_id uuid, state text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  authz public.agent_action_authorizations%rowtype;
  reason_hash text;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if authorization_id_input is null or expected_revision_input < 0
    or char_length(btrim(reason_input)) not between 5 and 1000
    or idempotency_key_input is null
  then
    raise exception 'Invalid authorization revocation input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if exists (
    select 1 from public.agent_action_events event
    where event.idempotency_key = idempotency_key_input
      and event.authorization_id = authorization_id_input
      and event.event_type = 'authorization_revoked'
  ) then
    select action_authorization.* into authz
    from public.agent_action_authorizations action_authorization
    where action_authorization.id = authorization_id_input;
    return query select 'IDEMPOTENT_REPLAY', authz.id,
      authz.state, authz.revision;
    return;
  end if;
  select action_authorization.* into authz
  from public.agent_action_authorizations action_authorization
  where action_authorization.id = authorization_id_input
  for update;
  if not found then
    raise exception 'Live action authorization not found'
      using errcode = '22023', detail = 'NOT_FOUND';
  end if;
  if authz.revision <> expected_revision_input then
    raise exception 'Authorization revision conflict'
      using errcode = '40001', detail = 'REVISION_CONFLICT';
  end if;
  if authz.state in ('revoked', 'expired', 'completed') then
    raise exception 'Authorization cannot be revoked in its current state'
      using errcode = '55000', detail = 'INVALID_STATE';
  end if;
  reason_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    btrim(reason_input), 'UTF8'
  ), 'sha256'), 'hex');
  update public.agent_action_authorizations action_authorization
  set state = 'revoked', revision = action_authorization.revision + 1,
      revoked_at = now(), revoked_by = actor_id,
      revocation_reason_sha256 = reason_hash
  where action_authorization.id = authz.id;
  perform public.append_live_agent_action_event(
    authz.id, null, 'administrator', actor_id::text,
    'authorization_revoked', jsonb_build_object(
      'reasonSha256', reason_hash, 'state', 'revoked',
      'previousRevision', authz.revision,
      'nextRevision', authz.revision + 1
    ), idempotency_key_input
  );
  return query select 'REVOKED', authz.id, 'revoked',
    authz.revision + 1;
end;
$$;

create or replace function public.claim_live_agent_action_authorization(
  authorization_id_input uuid,
  executor_input text,
  request_sha256_input text,
  idempotency_key_input uuid
)
returns table(
  code text,
  attempt_id uuid,
  lease_token text,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  authz public.agent_action_authorizations%rowtype;
  control public.live_agent_executor_controls%rowtype;
  existing public.agent_action_attempts%rowtype;
  attempt_number_value integer;
  lease_token_value text;
  lease_hash text;
  lease_expiry timestamptz;
  created_id uuid;
  approval_count integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  perform public.require_live_agent_action_principal(
    'executor:' || executor_input
  );
  if not public.is_ecosystem_release_enabled('live_agent_execution') then
    raise exception 'Live agent execution is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if authorization_id_input is null or executor_input is null
    or request_sha256_input !~ '^[0-9a-f]{64}$'
    or idempotency_key_input is null
  then
    raise exception 'Invalid live action claim input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select attempt.* into existing
  from public.agent_action_attempts attempt
  where attempt.idempotency_key = idempotency_key_input
  for update;
  if found then
    if existing.authorization_id <> authorization_id_input
      or existing.executor <> executor_input
      or existing.request_sha256 <> request_sha256_input
    then
      raise exception 'Action claim idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    -- Lease secrets are returned only once. A replay must acquire a new claim
    -- after the prepared attempt expires; it cannot recover the old token.
    return query select 'IDEMPOTENT_REPLAY_NO_TOKEN', existing.id,
      null::text, existing.lease_expires_at;
    return;
  end if;

  select action_authorization.* into authz
  from public.agent_action_authorizations action_authorization
  where action_authorization.id = authorization_id_input
  for update;
  if not found or authz.executor <> executor_input then
    raise exception 'Authorization does not match executor'
      using errcode = '42501', detail = 'CAPABILITY_MISMATCH';
  end if;
  if exists (
    select 1 from public.agent_action_attempts attempt
    where attempt.authorization_id = authz.id
      and (
        attempt.state in ('dispatched', 'unknown')
        or (attempt.state = 'prepared' and attempt.dispatch_authorized_at is not null)
      )
  ) then
    raise exception 'A prior external outcome requires reconciliation'
      using errcode = '42501', detail = 'RECONCILIATION_REQUIRED';
  end if;
  if authz.state <> 'authorized'
    or authz.not_before > now() or authz.expires_at <= now()
  then
    raise exception 'Authorization is not currently executable'
      using errcode = '42501', detail = 'AUTHORIZATION_NOT_ACTIVE';
  end if;
  select count(*)::integer into approval_count
  from public.agent_action_approvals approval
  where approval.authorization_id = authz.id
    and approval.decision = 'approved';
  if approval_count < authz.required_approvals then
    raise exception 'Required approvals are missing'
      using errcode = '42501', detail = 'APPROVALS_MISSING';
  end if;
  select executor_control.* into control
  from public.live_agent_executor_controls executor_control
  where executor_control.executor = executor_input
  for update;
  if control.paused or control.shadow_only then
    raise exception 'Executor is paused or shadow-only'
      using errcode = '42501', detail = 'EXECUTOR_PAUSED';
  end if;
  if authz.canary_stage < 1
    or authz.canary_stage > control.canary_stage
  then
    raise exception 'Authorization exceeds current canary stage'
      using errcode = '42501', detail = 'CANARY_STAGE_EXCEEDED';
  end if;
  if exists (
    select 1 from public.agent_action_attempts attempt
    where attempt.authorization_id = authz.id
      and attempt.state = 'prepared' and attempt.lease_expires_at > now()
  ) then
    raise exception 'Authorization already has an active lease'
      using errcode = '55P03', detail = 'ACTIVE_LEASE';
  end if;

  select coalesce(max(attempt.attempt_number), 0) + 1
  into attempt_number_value
  from public.agent_action_attempts attempt
  where attempt.authorization_id = authz.id;
  lease_token_value := gen_random_uuid()::text;
  lease_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    lease_token_value, 'UTF8'
  ), 'sha256'), 'hex');
  lease_expiry := now() + pg_catalog.make_interval(secs => control.lease_seconds);
  insert into public.agent_action_attempts (
    authorization_id, attempt_number, executor, connector, request_sha256,
    payload_sha256, target_scope_sha256, lease_token_sha256,
    lease_expires_at, idempotency_key
  ) values (
    authz.id, attempt_number_value, executor_input, executor_input,
    request_sha256_input, authz.payload_sha256,
    authz.target_scope_sha256, lease_hash, lease_expiry,
    idempotency_key_input
  ) returning id into created_id;
  perform public.append_live_agent_action_event(
    authz.id, created_id, 'executor', executor_input,
    'attempt_prepared', jsonb_build_object(
      'executor', executor_input, 'state', 'prepared',
      'requestSha256', request_sha256_input,
      'payloadSha256', authz.payload_sha256,
      'targetScopeSha256', authz.target_scope_sha256
    ), idempotency_key_input
  );
  return query select 'CLAIMED', created_id, lease_token_value, lease_expiry;
end;
$$;

create or replace function public.authorize_live_agent_action_dispatch(
  attempt_id_input uuid,
  lease_token_input text,
  payload_sha256_input text,
  target_scope_input jsonb,
  spend_paise_input bigint
)
returns table(
  code text,
  authorization_id uuid,
  executor text,
  action_type text,
  target_scope jsonb,
  payload_sha256 text,
  dispatch_lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt public.agent_action_attempts%rowtype;
  authz public.agent_action_authorizations%rowtype;
  control public.live_agent_executor_controls%rowtype;
  proposal public.company_agent_proposals%rowtype;
  lease_hash text;
  target_hash text;
  daily_actions bigint;
  monthly_actions bigint;
  daily_spend bigint;
  monthly_spend bigint;
  authorization_actions bigint;
  authorization_spend bigint;
  policy_risk text;
  policy_tier integer;
  policy_approvals integer;
  policy_scope_type text;
  policy_maximum_actions integer;
  policy_maximum_spend bigint;
  policy_maximum_canary integer;
  policy_live_eligible boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if attempt_id_input is null or char_length(lease_token_input) < 30
    or payload_sha256_input !~ '^[0-9a-f]{64}$'
    or target_scope_input is null or jsonb_typeof(target_scope_input) <> 'object'
    or spend_paise_input not between 0 and 1000000000
  then
    raise exception 'Invalid dispatch authorization input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  if not public.is_ecosystem_release_enabled('live_agent_execution') then
    raise exception 'Live agent execution is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  lease_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    lease_token_input, 'UTF8'
  ), 'sha256'), 'hex');
  target_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    target_scope_input::text, 'UTF8'
  ), 'sha256'), 'hex');

  select action_attempt.* into attempt
  from public.agent_action_attempts action_attempt
  where action_attempt.id = attempt_id_input
  for update;
  if not found or attempt.lease_token_sha256 <> lease_hash then
    raise exception 'Invalid dispatch lease'
      using errcode = '42501', detail = 'INVALID_LEASE';
  end if;
  perform public.require_live_agent_action_principal(
    'executor:' || attempt.executor
  );
  if attempt.state <> 'prepared' or attempt.lease_expires_at <= now() then
    raise exception 'Dispatch lease is not active'
      using errcode = '42501', detail = 'LEASE_EXPIRED';
  end if;
  select action_authorization.* into authz
  from public.agent_action_authorizations action_authorization
  where action_authorization.id = attempt.authorization_id
  for update;
  if attempt.dispatch_authorized_at is not null then
    return query select 'IDEMPOTENT_REPLAY', attempt.authorization_id,
      attempt.executor, authz.action_type, authz.target_scope,
      authz.payload_sha256, attempt.lease_expires_at;
    return;
  end if;
  select executor_control.* into control
  from public.live_agent_executor_controls executor_control
  where executor_control.executor = authz.executor
  for update;
  select company_proposal.* into proposal
  from public.company_agent_proposals company_proposal
  where company_proposal.id = authz.proposal_id
  for share;
  if authz.state <> 'authorized'
    or authz.not_before > now() or authz.expires_at <= now()
    or proposal.state <> 'approved'
    or proposal.revision <> authz.proposal_revision
  then
    raise exception 'Authorization was expired, revoked or changed before dispatch'
      using errcode = '42501', detail = 'FINAL_AUTHORIZATION_FAILED';
  end if;
  if control.paused or control.shadow_only
    or authz.canary_stage < 1
    or authz.canary_stage > control.canary_stage
  then
    raise exception 'Executor is paused or outside the canary'
      using errcode = '42501', detail = 'EXECUTOR_PAUSED';
  end if;
  select derived.risk_level, derived.approval_tier, derived.required_approvals,
    derived.scope_type, derived.maximum_actions,
    derived.maximum_spend_paise, derived.maximum_canary_stage,
    derived.live_eligible
  into policy_risk, policy_tier, policy_approvals, policy_scope_type,
    policy_maximum_actions, policy_maximum_spend, policy_maximum_canary,
    policy_live_eligible
  from public.derive_live_agent_action_policy(
    authz.executor, authz.action_type
  ) derived;
  if not policy_live_eligible
    or authz.risk_level <> policy_risk
    or authz.approval_tier <> policy_tier
    or authz.required_approvals <> policy_approvals
    or authz.target_scope ->> 'scopeType' <> policy_scope_type
    or authz.max_actions > policy_maximum_actions
    or authz.max_spend_paise > policy_maximum_spend
    or authz.canary_stage > policy_maximum_canary
    or public.is_valid_live_agent_target_scope(
      authz.executor, authz.action_type,
      authz.target_scope
    ) is not true
  then
    raise exception 'Frozen authorization no longer matches immutable policy'
      using errcode = '42501', detail = 'ACTION_POLICY_MISMATCH';
  end if;
  if (
    select count(*) from public.agent_action_approvals approval
    where approval.authorization_id = authz.id
      and approval.decision = 'approved'
      and approval.created_at >= authz.not_before
      and approval.created_at < authz.expires_at
  ) < authz.required_approvals then
    raise exception 'Approvals are missing or outside the authorization window'
      using errcode = '42501', detail = 'APPROVALS_MISSING';
  end if;
  if attempt.executor <> authz.executor
    or attempt.payload_sha256 <> payload_sha256_input
    or authz.payload_sha256 <> payload_sha256_input
    or attempt.target_scope_sha256 <> target_hash
    or authz.target_scope_sha256 <> target_hash
    or authz.target_scope <> target_scope_input
  then
    raise exception 'Dispatch capability, payload or target changed'
      using errcode = '42501', detail = 'EXACT_SCOPE_MISMATCH';
  end if;

  select count(*), coalesce(sum(ledger.spend_paise), 0)
  into daily_actions, daily_spend
  from public.agent_action_budget_ledger ledger
  where ledger.executor = authz.executor
    and ledger.day_bucket = (now() at time zone 'UTC')::date;
  select count(*), coalesce(sum(ledger.spend_paise), 0)
  into monthly_actions, monthly_spend
  from public.agent_action_budget_ledger ledger
  where ledger.executor = authz.executor
    and ledger.month_bucket = date_trunc('month', now() at time zone 'UTC')::date;
  select count(*), coalesce(sum(ledger.spend_paise), 0)
  into authorization_actions, authorization_spend
  from public.agent_action_budget_ledger ledger
  where ledger.authorization_id = authz.id;
  if daily_actions + 1 > control.daily_action_limit
    or monthly_actions + 1 > control.monthly_action_limit
    or daily_spend + spend_paise_input > control.daily_spend_limit_paise
    or monthly_spend + spend_paise_input > control.monthly_spend_limit_paise
    or authorization_actions + 1 > authz.max_actions
    or authorization_spend + spend_paise_input > authz.max_spend_paise
  then
    raise exception 'Atomic action or spend budget is exhausted'
      using errcode = '42501', detail = 'BUDGET_EXHAUSTED';
  end if;
  insert into public.agent_action_budget_ledger (
    authorization_id, attempt_id, executor, spend_paise,
    day_bucket, month_bucket
  ) values (
    authz.id, attempt.id, authz.executor, spend_paise_input,
    (now() at time zone 'UTC')::date,
    date_trunc('month', now() at time zone 'UTC')::date
  );
  update public.agent_action_attempts action_attempt
  set dispatch_authorized_at = now()
  where action_attempt.id = attempt.id;
  if authorization_actions + 1 >= authz.max_actions
    or (
      authz.max_spend_paise > 0
      and authorization_spend + spend_paise_input >= authz.max_spend_paise
    )
  then
    update public.agent_action_authorizations action_authorization
    set state = 'exhausted', revision = action_authorization.revision + 1
    where action_authorization.id = authz.id;
  end if;
  perform public.append_live_agent_action_event(
    authz.id, attempt.id, 'authorizer', 'live-action-policy-v1',
    'dispatch_authorized', jsonb_build_object(
      'executor', authz.executor, 'state', 'prepared',
      'payloadSha256', payload_sha256_input,
      'targetScopeSha256', target_hash, 'spendPaise', spend_paise_input,
      'canaryStage', authz.canary_stage
    ), attempt.id
  );
  return query select 'DISPATCH_AUTHORIZED', authz.id,
    authz.executor, authz.action_type,
    authz.target_scope, authz.payload_sha256,
    attempt.lease_expires_at;
end;
$$;

create or replace function public.record_live_agent_action_receipt(
  attempt_id_input uuid,
  lease_token_input text,
  result_input text,
  receipt_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, attempt_id uuid, state text, receipt_sha256 text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt public.agent_action_attempts%rowtype;
  lease_hash text;
  receipt_hash text;
  next_state text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if attempt_id_input is null or char_length(lease_token_input) < 30
    or result_input not in ('dispatched', 'unknown')
    or public.is_redacted_live_agent_receipt(receipt_input) is not true
    or idempotency_key_input is null
  then
    raise exception 'Invalid live action receipt input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  lease_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    lease_token_input, 'UTF8'
  ), 'sha256'), 'hex');
  receipt_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    receipt_input::text, 'UTF8'
  ), 'sha256'), 'hex');
  select action_attempt.* into attempt
  from public.agent_action_attempts action_attempt
  where action_attempt.id = attempt_id_input
  for update;
  if not found or attempt.lease_token_sha256 <> lease_hash then
    raise exception 'Invalid receipt lease'
      using errcode = '42501', detail = 'INVALID_LEASE';
  end if;
  perform public.require_live_agent_action_principal(
    'executor:' || attempt.executor
  );
  if attempt.state in ('dispatched', 'unknown') then
    if attempt.state <> result_input or attempt.receipt_sha256 <> receipt_hash then
      raise exception 'Receipt replay conflicts with recorded external outcome'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', attempt.id,
      attempt.state, attempt.receipt_sha256;
    return;
  end if;
  if attempt.state <> 'prepared' or attempt.dispatch_authorized_at is null then
    raise exception 'Attempt was not authorized for dispatch'
      using errcode = '42501', detail = 'DISPATCH_NOT_AUTHORIZED';
  end if;
  next_state := result_input;
  update public.agent_action_attempts action_attempt
  set state = next_state, dispatched_at = now(), receipt_sha256 = receipt_hash,
      receipt_metadata = receipt_input
  where action_attempt.id = attempt.id;
  perform public.append_live_agent_action_event(
    attempt.authorization_id, attempt.id, 'executor', attempt.executor,
    'receipt_recorded', jsonb_build_object(
      'executor', attempt.executor, 'state', next_state,
      'receiptSha256', receipt_hash,
      'providerReceiptSha256', receipt_input ->> 'providerReceiptSha256'
    ), idempotency_key_input
  );
  if next_state in ('unknown', 'failed') then
    perform public.evaluate_live_agent_executor_pause(
      attempt.authorization_id, attempt.id, attempt.executor, next_state
    );
  end if;
  return query select 'RECEIPT_RECORDED', attempt.id, next_state, receipt_hash;
end;
$$;

create or replace function public.verify_live_agent_action_attempt(
  attempt_id_input uuid,
  verifier_identity_input text,
  result_input text,
  verification_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, attempt_id uuid, state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt public.agent_action_attempts%rowtype;
  authz public.agent_action_authorizations%rowtype;
  next_state text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if attempt_id_input is null
    or verifier_identity_input not in ('independent_auditor', 'action_verifier')
    or result_input not in ('verified', 'unknown', 'failed')
    or public.is_redacted_live_agent_receipt(verification_input) is not true
    or idempotency_key_input is null
  then
    raise exception 'Invalid verification input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select action_attempt.* into attempt
  from public.agent_action_attempts action_attempt
  where action_attempt.id = attempt_id_input
  for update;
  if not found then
    raise exception 'Live action attempt not found'
      using errcode = '22023', detail = 'NOT_FOUND';
  end if;
  perform public.require_live_agent_action_principal(
    'verifier:' || verifier_identity_input
  );
  select action_authorization.* into authz
  from public.agent_action_authorizations action_authorization
  where action_authorization.id = attempt.authorization_id;
  if verifier_identity_input = authz.proposer_role
    or verifier_identity_input = attempt.executor
  then
    raise exception 'Proposer or executor cannot verify its own action'
      using errcode = '42501', detail = 'VERIFIER_SEPARATION_REQUIRED';
  end if;
  if attempt.state in ('verified', 'failed')
    or (attempt.state = 'unknown' and attempt.verifier_identity is not null)
  then
    if attempt.state <> result_input
      or attempt.verifier_identity <> verifier_identity_input
    then
      raise exception 'Verification replay conflicts with recorded result'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', attempt.id, attempt.state;
    return;
  end if;
  if attempt.state not in ('dispatched', 'unknown') then
    raise exception 'Attempt is not ready for verification'
      using errcode = '55000', detail = 'INVALID_STATE';
  end if;
  next_state := result_input;
  update public.agent_action_attempts action_attempt
  set state = next_state, verifier_identity = verifier_identity_input,
      verified_at = case when next_state = 'unknown' then null else now() end,
      receipt_metadata = coalesce(action_attempt.receipt_metadata, '{}'::jsonb)
        || verification_input
  where action_attempt.id = attempt.id;
  perform public.append_live_agent_action_event(
    attempt.authorization_id, attempt.id, 'verifier', verifier_identity_input,
    'verification_recorded', jsonb_build_object(
      'state', next_state, 'result', result_input,
      'verifierIdentity', verifier_identity_input,
      'reasonSha256', pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
        verification_input::text, 'UTF8'
      ), 'sha256'), 'hex')
    ), idempotency_key_input
  );
  if next_state in ('unknown', 'failed') then
    perform public.evaluate_live_agent_executor_pause(
      attempt.authorization_id, attempt.id, attempt.executor, next_state
    );
  end if;
  return query select 'VERIFICATION_RECORDED', attempt.id, next_state;
end;
$$;

create or replace function public.reconcile_live_agent_action_attempt(
  attempt_id_input uuid,
  reconciler_identity_input text,
  result_input text,
  reconciliation_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, attempt_id uuid, state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt public.agent_action_attempts%rowtype;
  next_state text;
  reconciliation_hash text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if attempt_id_input is null
    or reconciler_identity_input not in ('independent_auditor', 'action_reconciler')
    or result_input not in ('unknown', 'dispatched', 'verified', 'failed')
    or public.is_redacted_live_agent_receipt(reconciliation_input) is not true
    or idempotency_key_input is null
  then
    raise exception 'Invalid reconciliation input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select action_attempt.* into attempt
  from public.agent_action_attempts action_attempt
  where action_attempt.id = attempt_id_input
  for update;
  if not found or not (
    attempt.state = 'unknown'
    or (
      attempt.state = 'prepared'
      and attempt.dispatch_authorized_at is not null
      and attempt.lease_expires_at <= now()
    )
  ) then
    raise exception 'Only an unknown or expired dispatched lease may be reconciled'
      using errcode = '55000', detail = 'RECONCILIATION_NOT_REQUIRED';
  end if;
  perform public.require_live_agent_action_principal(
    'reconciler:' || reconciler_identity_input
  );
  if attempt.state = 'prepared' and result_input not in ('unknown', 'failed') then
    raise exception 'A missing receipt must first become unknown or confirmed failed'
      using errcode = '55000', detail = 'RECEIPT_REQUIRED';
  end if;
  next_state := result_input;
  reconciliation_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    reconciliation_input::text, 'UTF8'
  ), 'sha256'), 'hex');
  update public.agent_action_attempts action_attempt
  set state = next_state,
      dispatched_at = case when next_state in ('dispatched', 'verified')
        then coalesce(action_attempt.dispatched_at, now())
        else action_attempt.dispatched_at end,
      receipt_sha256 = case when next_state in ('dispatched', 'verified')
        then coalesce(action_attempt.receipt_sha256, reconciliation_hash)
        else action_attempt.receipt_sha256 end,
      verifier_identity = case when next_state in ('verified', 'failed')
        then 'action_verifier' else null end,
      verified_at = case when next_state in ('verified', 'failed')
        then now() else null end,
      receipt_metadata = coalesce(action_attempt.receipt_metadata, '{}'::jsonb)
        || reconciliation_input
  where action_attempt.id = attempt.id;
  perform public.append_live_agent_action_event(
    attempt.authorization_id, attempt.id, 'reconciler',
    reconciler_identity_input, 'reconciliation_recorded', jsonb_build_object(
      'state', next_state, 'result', result_input,
      'verifierIdentity', reconciler_identity_input,
      'reasonSha256', pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
        reconciliation_input::text, 'UTF8'
      ), 'sha256'), 'hex')
    ), idempotency_key_input
  );
  if next_state in ('unknown', 'failed') then
    perform public.evaluate_live_agent_executor_pause(
      attempt.authorization_id, attempt.id, attempt.executor, next_state
    );
  end if;
  return query select 'RECONCILED', attempt.id, next_state;
end;
$$;

create or replace function public.compensate_live_agent_action_attempt(
  attempt_id_input uuid,
  verifier_identity_input text,
  compensation_input jsonb,
  idempotency_key_input uuid
)
returns table(code text, attempt_id uuid, state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt public.agent_action_attempts%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if attempt_id_input is null
    or verifier_identity_input not in ('independent_auditor', 'action_verifier')
    or public.is_redacted_live_agent_receipt(compensation_input) is not true
    or idempotency_key_input is null
  then
    raise exception 'Invalid compensation input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  select action_attempt.* into attempt
  from public.agent_action_attempts action_attempt
  where action_attempt.id = attempt_id_input
  for update;
  if not found or attempt.state not in ('dispatched', 'verified', 'failed')
    or attempt.receipt_sha256 is null
  then
    raise exception 'Attempt cannot be compensated in its current state'
      using errcode = '55000', detail = 'INVALID_STATE';
  end if;
  perform public.require_live_agent_action_principal(
    'verifier:' || verifier_identity_input
  );
  update public.agent_action_attempts action_attempt
  set state = 'compensated', verifier_identity = verifier_identity_input,
      verified_at = now(),
      receipt_metadata = coalesce(action_attempt.receipt_metadata, '{}'::jsonb)
        || compensation_input
  where action_attempt.id = attempt.id;
  perform public.append_live_agent_action_event(
    attempt.authorization_id, attempt.id, 'verifier', verifier_identity_input,
    'compensation_recorded', jsonb_build_object(
      'state', 'compensated', 'result', 'compensated',
      'verifierIdentity', verifier_identity_input,
      'reasonSha256', pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
        compensation_input::text, 'UTF8'
      ), 'sha256'), 'hex')
    ), idempotency_key_input
  );
  return query select 'COMPENSATED', attempt.id, 'compensated';
end;
$$;

create or replace function public.evaluate_live_agent_executor_pause(
  authorization_id_input uuid,
  attempt_id_input uuid,
  executor_input text,
  trigger_state_input text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  sample_count integer;
  failure_count integer;
  pause_code text;
  changed boolean := false;
begin
  if trigger_state_input = 'unknown' then
    pause_code := 'UNKNOWN_OUTCOME';
  elsif trigger_state_input = 'failed' then
    select count(*)::integer,
      count(*) filter (where recent.state = 'failed')::integer
    into sample_count, failure_count
    from (
      select attempt.state
      from public.agent_action_attempts attempt
      where attempt.executor = executor_input
        and attempt.state in ('verified', 'failed', 'compensated')
      order by attempt.updated_at desc
      limit 20
    ) recent;
    if sample_count < 20 or failure_count * 100 <= sample_count * 5 then
      return false;
    end if;
    pause_code := 'FAILURE_RATE_EXCEEDED';
  else
    return false;
  end if;
  update public.live_agent_executor_controls control
  set paused = true, shadow_only = true, pause_reason_code = pause_code,
      revision = control.revision + 1
  where control.executor = executor_input and not control.paused;
  changed := found;
  if changed then
    perform public.append_live_agent_action_event(
      authorization_id_input, attempt_id_input, 'authorizer',
      'live-action-policy-v1', 'executor_paused', jsonb_build_object(
        'executor', executor_input, 'state', trigger_state_input,
        'pauseReasonCode', pause_code
      ), gen_random_uuid()
    );
  end if;
  return changed;
end;
$$;

create or replace function public.live_agent_action_dashboard(
  limit_input integer default 100
)
returns table(
  authorization_id uuid,
  proposal_id uuid,
  proposal_revision integer,
  executor text,
  action_type text,
  target_scope jsonb,
  target_scope_sha256 text,
  payload_sha256 text,
  risk_level text,
  approval_tier integer,
  state text,
  revision integer,
  approval_count bigint,
  required_approvals integer,
  max_actions integer,
  max_spend_paise bigint,
  canary_stage integer,
  not_before timestamptz,
  expires_at timestamptz,
  latest_attempt_state text,
  latest_receipt_sha256 text,
  latest_verifier_identity text,
  created_at timestamptz
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
  if limit_input not between 1 and 200 then
    raise exception 'Invalid action dashboard limit'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  return query
    select authz.id, authz.proposal_id,
      authz.proposal_revision,
      authz.executor, authz.action_type,
      authz.target_scope, authz.target_scope_sha256,
      authz.payload_sha256,
      authz.risk_level, authz.approval_tier::integer,
      authz.state, authz.revision,
      (select count(*) from public.agent_action_approvals approval
        where approval.authorization_id = authz.id
          and approval.decision = 'approved'),
      authz.required_approvals::integer,
      authz.max_actions, authz.max_spend_paise,
      authz.canary_stage::integer, authz.not_before,
      authz.expires_at, latest_attempt.state,
      latest_attempt.receipt_sha256, latest_attempt.verifier_identity,
      authz.created_at
    from public.agent_action_authorizations authz
    left join lateral (
      select attempt.state, attempt.receipt_sha256,
        attempt.verifier_identity, attempt.created_at
      from public.agent_action_attempts attempt
      where attempt.authorization_id = authz.id
      order by attempt.created_at desc
      limit 1
    ) latest_attempt on true
    order by authz.created_at desc
    limit limit_input;
end;
$$;

create or replace function public.list_live_agent_action_attempts(
  authorization_id_input uuid,
  limit_input integer default 100
)
returns table(
  attempt_id uuid,
  attempt_number integer,
  executor text,
  request_sha256 text,
  payload_sha256 text,
  target_scope_sha256 text,
  state text,
  lease_expires_at timestamptz,
  dispatch_authorized_at timestamptz,
  dispatched_at timestamptz,
  receipt_sha256 text,
  receipt_metadata jsonb,
  verifier_identity text,
  verified_at timestamptz,
  created_at timestamptz
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
  if authorization_id_input is null or limit_input not between 1 and 200 then
    raise exception 'Invalid action attempt list input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  return query
    select attempt.id, attempt.attempt_number, attempt.executor,
      attempt.request_sha256, attempt.payload_sha256,
      attempt.target_scope_sha256, attempt.state, attempt.lease_expires_at,
      attempt.dispatch_authorized_at, attempt.dispatched_at,
      attempt.receipt_sha256, attempt.receipt_metadata,
      attempt.verifier_identity, attempt.verified_at, attempt.created_at
    from public.agent_action_attempts attempt
    where attempt.authorization_id = authorization_id_input
    order by attempt.created_at desc
    limit limit_input;
end;
$$;

create or replace function public.list_live_agent_action_events(
  authorization_id_input uuid,
  limit_input integer default 200
)
returns table(
  event_id uuid,
  attempt_id uuid,
  sequence_number integer,
  actor_kind text,
  actor_ref text,
  event_type text,
  details jsonb,
  previous_event_hash text,
  event_hash text,
  created_at timestamptz
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
  if authorization_id_input is null or limit_input not between 1 and 500 then
    raise exception 'Invalid action event list input'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;
  return query
    select event.id, event.attempt_id, event.sequence_number,
      event.actor_kind, event.actor_ref, event.event_type, event.details,
      event.previous_event_hash, event.event_hash, event.created_at
    from public.agent_action_events event
    where event.authorization_id = authorization_id_input
    order by event.sequence_number desc
    limit limit_input;
end;
$$;

alter table public.live_agent_executor_controls enable row level security;
alter table public.agent_action_authorizations enable row level security;
alter table public.agent_action_approvals enable row level security;
alter table public.agent_action_attempts enable row level security;
alter table public.agent_action_budget_ledger enable row level security;
alter table public.agent_action_events enable row level security;
alter table public.live_agent_executor_control_events enable row level security;

-- No direct table policy is intentional: browser and service clients must use
-- the narrow security-definer RPCs, and no role receives a general table grant.
revoke all on table public.live_agent_executor_controls,
  public.agent_action_authorizations,
  public.agent_action_approvals,
  public.agent_action_attempts,
  public.agent_action_budget_ledger,
  public.agent_action_events,
  public.live_agent_executor_control_events
from public, anon, authenticated, service_role;

revoke all on function public.prevent_live_agent_ledger_mutation()
  from public, anon, authenticated, service_role;
revoke all on function public.enforce_live_agent_frozen_contract()
  from public, anon, authenticated, service_role;
revoke all on function public.require_live_agent_action_principal(text)
  from public, anon, authenticated, service_role;
revoke all on function public.derive_live_agent_action_policy(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.is_valid_live_agent_target_scope(text, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.is_redacted_live_agent_receipt(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.append_live_agent_action_event(
  uuid, uuid, text, text, text, jsonb, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.evaluate_live_agent_executor_pause(
  uuid, uuid, text, text
) from public, anon, authenticated, service_role;

revoke all on function public.create_live_agent_action_authorization(
  uuid, text, text, jsonb, text, integer, bigint, integer,
  timestamptz, timestamptz, uuid, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.create_live_agent_action_authorization(
  uuid, text, text, jsonb, text, integer, bigint, integer,
  timestamptz, timestamptz, uuid, uuid
) to service_role;

revoke all on function public.claim_live_agent_action_authorization(
  uuid, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.claim_live_agent_action_authorization(
  uuid, text, text, uuid
) to service_role;

revoke all on function public.authorize_live_agent_action_dispatch(
  uuid, text, text, jsonb, bigint
) from public, anon, authenticated, service_role;
grant execute on function public.authorize_live_agent_action_dispatch(
  uuid, text, text, jsonb, bigint
) to service_role;

revoke all on function public.record_live_agent_action_receipt(
  uuid, text, text, jsonb, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.record_live_agent_action_receipt(
  uuid, text, text, jsonb, uuid
) to service_role;

revoke all on function public.verify_live_agent_action_attempt(
  uuid, text, text, jsonb, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.verify_live_agent_action_attempt(
  uuid, text, text, jsonb, uuid
) to service_role;

revoke all on function public.reconcile_live_agent_action_attempt(
  uuid, text, text, jsonb, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.reconcile_live_agent_action_attempt(
  uuid, text, text, jsonb, uuid
) to service_role;

revoke all on function public.compensate_live_agent_action_attempt(
  uuid, text, jsonb, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.compensate_live_agent_action_attempt(
  uuid, text, jsonb, uuid
) to service_role;

revoke all on function public.set_live_agent_executor_pause(
  text, boolean, integer, integer, bigint, bigint, integer, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.set_live_agent_executor_pause(
  text, boolean, integer, integer, bigint, bigint, integer, text, uuid
) to authenticated;

revoke all on function public.review_live_agent_action_authorization(
  uuid, integer, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.review_live_agent_action_authorization(
  uuid, integer, text, text, uuid
) to authenticated;

revoke all on function public.revoke_live_agent_action_authorization(
  uuid, integer, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.revoke_live_agent_action_authorization(
  uuid, integer, text, uuid
) to authenticated;

revoke all on function public.live_agent_executor_controls()
  from public, anon, authenticated, service_role;
grant execute on function public.live_agent_executor_controls()
  to authenticated;
revoke all on function public.live_agent_action_dashboard(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.live_agent_action_dashboard(integer)
  to authenticated;
revoke all on function public.list_live_agent_action_attempts(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_live_agent_action_attempts(uuid, integer)
  to authenticated;
revoke all on function public.list_live_agent_action_events(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_live_agent_action_events(uuid, integer)
  to authenticated;
