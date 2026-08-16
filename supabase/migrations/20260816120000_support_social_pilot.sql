-- Supervised customer-support and social-copy pilot. The release is disabled
-- by default, browser roles have no direct table access, agents may only
-- record drafts, and an administrator must review every proposed action.

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
values ('support_social_pilot', false)
on conflict (control_key) do nothing;

alter table public.managed_operations_agents
  drop constraint if exists managed_operations_agents_role_check;
alter table public.managed_operations_agents
  add constraint managed_operations_agents_role_check check (role in (
    'outreach_growth', 'profile_drafting', 'verification_triage',
    'operations_supervisor', 'customer_support', 'social_content'
  ));

insert into public.managed_operations_agents (
  role, display_name, interval_seconds, max_items_per_run
) values
  ('customer_support', 'Customer Support', 300, 10),
  ('social_content', 'Social Content', 3600, 5)
on conflict (role) do nothing;

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in (
    'account', 'marketplace', 'profile', 'technical', 'billing', 'safety',
    'agriculture', 'other'
  )),
  locale text not null check (locale in (
    'en-IN', 'as-IN', 'bn-IN', 'brx-IN', 'doi-IN', 'gu-IN', 'hi-IN',
    'kn-IN', 'ks-Arab-IN', 'kok-Deva-IN', 'mai-IN', 'ml-IN',
    'mni-Mtei-IN', 'mr-IN', 'ne-IN', 'or-IN', 'pa-Guru-IN', 'sa-IN',
    'sat-Olck-IN', 'sd-Arab-IN', 'ta-IN', 'te-IN', 'ur-IN'
  )),
  subject text not null check (char_length(subject) between 5 and 160),
  question text not null check (char_length(question) between 10 and 6000),
  state text not null default 'open' check (state in (
    'open', 'proposal_ready', 'answered', 'escalated', 'closed'
  )),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  check (expires_at > created_at and expires_at <= created_at + interval '90 days')
);

create table public.social_campaign_briefs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  platform text not null check (platform in (
    'linkedin', 'instagram', 'facebook', 'x'
  )),
  locale text not null check (locale in (
    'en-IN', 'as-IN', 'bn-IN', 'brx-IN', 'doi-IN', 'gu-IN', 'hi-IN',
    'kn-IN', 'ks-Arab-IN', 'kok-Deva-IN', 'mai-IN', 'ml-IN',
    'mni-Mtei-IN', 'mr-IN', 'ne-IN', 'or-IN', 'pa-Guru-IN', 'sa-IN',
    'sat-Olck-IN', 'sd-Arab-IN', 'ta-IN', 'te-IN', 'ur-IN'
  )),
  audience text not null check (char_length(audience) between 5 and 1000),
  objective text not null check (char_length(objective) between 10 and 2000),
  source_facts text not null check (char_length(source_facts) between 10 and 8000),
  call_to_action text not null check (char_length(call_to_action) between 5 and 1000),
  state text not null default 'draft' check (state in (
    'draft', 'proposal_ready', 'copy_ready', 'escalated', 'closed'
  )),
  revision integer not null default 0 check (revision >= 0),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_action_proposals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.managed_operations_agent_runs (id)
    on delete restrict,
  action_type text not null check (action_type in (
    'support_reply', 'social_post'
  )),
  target_id uuid not null,
  draft_content text not null check (char_length(draft_content) between 1 and 6000),
  final_content text check (
    final_content is null or char_length(final_content) between 1 and 6000
  ),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 8192
  ),
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  model text not null check (
    char_length(model) between 2 and 100
    and model ~ '^[A-Za-z0-9@._:/-]+$'
  ),
  prompt_version text not null check (
    char_length(prompt_version) between 3 and 100
    and prompt_version ~ '^[A-Za-z0-9._:/-]+$'
  ),
  state text not null default 'pending' check (state in (
    'pending', 'approved', 'rejected', 'escalated'
  )),
  revision integer not null default 0 check (revision >= 0),
  reviewed_by uuid references public.profiles (id) on delete restrict,
  reviewer_reason text check (
    reviewer_reason is null or char_length(reviewer_reason) between 5 and 1000
  ),
  reviewed_at timestamptz,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (state = 'pending' and final_content is null and reviewed_by is null
      and reviewer_reason is null and reviewed_at is null)
    or
    (state = 'approved' and final_content is not null and reviewed_by is not null
      and reviewer_reason is not null and reviewed_at is not null)
    or
    (state in ('rejected', 'escalated') and final_content is null
      and reviewed_by is not null and reviewer_reason is not null
      and reviewed_at is not null)
  )
);

create unique index agent_action_proposals_one_pending_target_idx
  on public.agent_action_proposals (action_type, target_id)
  where state = 'pending';
create index agent_action_proposals_target_created_idx
  on public.agent_action_proposals (action_type, target_id, created_at desc);
create index support_cases_participant_created_idx
  on public.support_cases (participant_id, created_at desc);
create index support_cases_expiry_idx
  on public.support_cases (expires_at)
  where state not in ('closed', 'answered');
create index social_campaign_briefs_state_created_idx
  on public.social_campaign_briefs (state, created_at desc);

create table public.agent_action_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.agent_action_proposals (id)
    on delete restrict,
  actor_id uuid references public.profiles (id) on delete restrict,
  event_type text not null check (event_type in (
    'draft_recorded', 'approved', 'rejected', 'escalated'
  )),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object'
    and octet_length(details::text) <= 2048
    and details - array[
      'actionType', 'riskLevel', 'model', 'promptVersion', 'decision',
      'contentSha256', 'reasonSha256', 'previousRevision', 'nextRevision'
    ]::text[] = '{}'::jsonb
  ),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create index agent_action_proposal_events_proposal_created_idx
  on public.agent_action_proposal_events (proposal_id, created_at);

create trigger support_cases_set_updated_at
before update on public.support_cases
for each row execute function public.set_updated_at();
create trigger social_campaign_briefs_set_updated_at
before update on public.social_campaign_briefs
for each row execute function public.set_updated_at();
create trigger agent_action_proposals_set_updated_at
before update on public.agent_action_proposals
for each row execute function public.set_updated_at();

create or replace function public.prevent_agent_action_proposal_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Agent action proposal events are immutable'
    using errcode = '42501', detail = 'AUDIT_IMMUTABLE';
end;
$$;

create trigger agent_action_proposal_events_are_immutable
before update or delete on public.agent_action_proposal_events
for each row execute function public.prevent_agent_action_proposal_event_mutation();

create or replace function public.create_support_case(
  category_input text,
  locale_input text,
  subject_input text,
  question_input text,
  idempotency_key_input uuid
)
returns table(code text, case_id uuid, state text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prior public.support_cases%rowtype;
  created_id uuid;
  created_at_value timestamptz := now();
begin
  if actor_id is null or not exists (
    select 1 from public.profiles profile
    where profile.id = actor_id and profile.status = 'active'
  ) then
    raise exception 'An active participant account is required'
      using errcode = '42501', detail = 'PARTICIPANT_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('support_social_pilot') then
    raise exception 'Support and social pilot is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if category_input is null or category_input not in (
    'account', 'marketplace', 'profile', 'technical', 'billing', 'safety',
    'agriculture', 'other'
  ) or locale_input is null
    or btrim(locale_input) not in (
      'en-IN', 'as-IN', 'bn-IN', 'brx-IN', 'doi-IN', 'gu-IN', 'hi-IN',
      'kn-IN', 'ks-Arab-IN', 'kok-Deva-IN', 'mai-IN', 'ml-IN',
      'mni-Mtei-IN', 'mr-IN', 'ne-IN', 'or-IN', 'pa-Guru-IN', 'sa-IN',
      'sat-Olck-IN', 'sd-Arab-IN', 'ta-IN', 'te-IN', 'ur-IN'
    )
    or subject_input is null
    or char_length(btrim(subject_input)) not between 5 and 160
    or question_input is null
    or char_length(btrim(question_input)) not between 10 and 6000
    or idempotency_key_input is null
  then
    raise exception 'Invalid support case'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('support-case:' || actor_id::text, 0)
  );
  select support.* into prior
  from public.support_cases support
  where support.idempotency_key = idempotency_key_input
  for update;
  if found then
    if prior.participant_id <> actor_id
      or prior.category <> category_input
      or prior.locale <> btrim(locale_input)
      or prior.subject <> btrim(subject_input)
      or prior.question <> btrim(question_input)
    then
      raise exception 'Support case idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', prior.id, prior.state,
      prior.expires_at;
    return;
  end if;

  if (
    select count(*)
    from public.support_cases recent
    where recent.participant_id = actor_id
      and recent.created_at >= now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Support case rate limit exceeded'
      using errcode = '42501', detail = 'RATE_LIMITED';
  end if;

  insert into public.support_cases (
    participant_id, category, locale, subject, question, idempotency_key,
    created_at, updated_at, expires_at
  ) values (
    actor_id, category_input, btrim(locale_input), btrim(subject_input),
    btrim(question_input), idempotency_key_input, created_at_value,
    created_at_value, created_at_value + interval '90 days'
  ) returning id into created_id;

  return query select 'CASE_CREATED', created_id, 'open'::text,
    created_at_value + interval '90 days';
end;
$$;

create or replace function public.list_my_support_cases(
  limit_input integer default 25
)
returns table(
  case_id uuid,
  participant_id uuid,
  category text,
  locale text,
  subject text,
  question text,
  state text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  reply_content text,
  reply_reviewed_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception 'Participant authentication is required'
      using errcode = '42501', detail = 'PARTICIPANT_REQUIRED';
  end if;
  if limit_input not between 1 and 100 then
    raise exception 'Invalid support case list limit'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  return query
    select support.id, support.participant_id, support.category, support.locale, support.subject,
      support.question, support.state, support.expires_at,
      support.created_at, support.updated_at,
      approved.final_content, approved.reviewed_at
    from public.support_cases support
    left join lateral (
      select proposal.final_content, proposal.reviewed_at
      from public.agent_action_proposals proposal
      where proposal.action_type = 'support_reply'
        and proposal.target_id = support.id
        and proposal.state = 'approved'
      order by proposal.reviewed_at desc
      limit 1
    ) approved on true
    where support.participant_id = actor_id
      and support.expires_at > now()
    order by support.created_at desc
    limit limit_input;
end;
$$;

create or replace function public.create_social_campaign_brief(
  platform_input text,
  locale_input text,
  audience_input text,
  objective_input text,
  source_facts_input text,
  call_to_action_input text,
  idempotency_key_input uuid
)
returns table(code text, brief_id uuid, state text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prior public.social_campaign_briefs%rowtype;
  created_id uuid;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('support_social_pilot') then
    raise exception 'Support and social pilot is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if platform_input is null
    or platform_input not in ('linkedin', 'instagram', 'facebook', 'x')
    or locale_input is null
    or btrim(locale_input) not in (
      'en-IN', 'as-IN', 'bn-IN', 'brx-IN', 'doi-IN', 'gu-IN', 'hi-IN',
      'kn-IN', 'ks-Arab-IN', 'kok-Deva-IN', 'mai-IN', 'ml-IN',
      'mni-Mtei-IN', 'mr-IN', 'ne-IN', 'or-IN', 'pa-Guru-IN', 'sa-IN',
      'sat-Olck-IN', 'sd-Arab-IN', 'ta-IN', 'te-IN', 'ur-IN'
    )
    or audience_input is null
    or char_length(btrim(audience_input)) not between 5 and 1000
    or objective_input is null
    or char_length(btrim(objective_input)) not between 10 and 2000
    or source_facts_input is null
    or char_length(btrim(source_facts_input)) not between 10 and 8000
    or call_to_action_input is null
    or char_length(btrim(call_to_action_input)) not between 5 and 1000
    or idempotency_key_input is null
  then
    raise exception 'Invalid social campaign brief'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('social-brief:' || actor_id::text, 0)
  );
  select brief.* into prior
  from public.social_campaign_briefs brief
  where brief.idempotency_key = idempotency_key_input
  for update;
  if found then
    if prior.created_by <> actor_id
      or prior.platform <> platform_input
      or prior.locale <> btrim(locale_input)
      or prior.audience <> btrim(audience_input)
      or prior.objective <> btrim(objective_input)
      or prior.source_facts <> btrim(source_facts_input)
      or prior.call_to_action <> btrim(call_to_action_input)
    then
      raise exception 'Social campaign brief idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', prior.id, prior.state,
      prior.revision;
    return;
  end if;

  if (
    select count(*)
    from public.social_campaign_briefs recent
    where recent.created_by = actor_id
      and recent.created_at >= now() - interval '24 hours'
  ) >= 25 then
    raise exception 'Social campaign brief rate limit exceeded'
      using errcode = '42501', detail = 'RATE_LIMITED';
  end if;

  insert into public.social_campaign_briefs (
    created_by, platform, locale, audience, objective, source_facts,
    call_to_action, idempotency_key
  ) values (
    actor_id, platform_input, btrim(locale_input), btrim(audience_input),
    btrim(objective_input), btrim(source_facts_input),
    btrim(call_to_action_input), idempotency_key_input
  ) returning id into created_id;

  return query select 'BRIEF_CREATED', created_id, 'draft'::text, 0;
end;
$$;

create or replace function public.record_agent_action_proposal(
  run_id_input uuid,
  action_type_input text,
  target_id_input uuid,
  draft_content_input text,
  metadata_input jsonb,
  risk_level_input text,
  model_input text,
  prompt_version_input text,
  idempotency_key_input uuid
)
returns table(code text, proposal_id uuid, state text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  prior public.agent_action_proposals%rowtype;
  run_record public.managed_operations_agent_runs%rowtype;
  created_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('support_social_pilot') then
    raise exception 'Support and social pilot is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if run_id_input is null
    or action_type_input is null
    or action_type_input not in ('support_reply', 'social_post')
    or target_id_input is null
    or draft_content_input is null
    or char_length(btrim(draft_content_input)) not between 1 and 6000
    or metadata_input is null or jsonb_typeof(metadata_input) <> 'object'
    or octet_length(metadata_input::text) > 8192
    or risk_level_input is null
    or risk_level_input not in ('low', 'medium', 'high')
    or model_input is null
    or char_length(btrim(model_input)) not between 2 and 100
    or btrim(model_input) !~ '^[A-Za-z0-9._:/-]+$'
    or prompt_version_input is null
    or char_length(btrim(prompt_version_input)) not between 3 and 100
    or btrim(prompt_version_input) !~ '^[A-Za-z0-9._:/-]+$'
    or idempotency_key_input is null
  then
    raise exception 'Invalid agent action proposal'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select proposal.* into prior
  from public.agent_action_proposals proposal
  where proposal.idempotency_key = idempotency_key_input
  for update;
  if found then
    if prior.run_id <> run_id_input
      or prior.action_type <> action_type_input
      or prior.target_id <> target_id_input
      or prior.draft_content <> btrim(draft_content_input)
      or prior.metadata <> metadata_input
      or prior.risk_level <> risk_level_input
      or prior.model <> btrim(model_input)
      or prior.prompt_version <> btrim(prompt_version_input)
    then
      raise exception 'Agent action proposal idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select 'IDEMPOTENT_REPLAY', prior.id, prior.state,
      prior.revision;
    return;
  end if;

  select run.* into run_record
  from public.managed_operations_agent_runs run
  where run.id = run_id_input
  for update;
  if not found or run_record.state <> 'running'
    or (action_type_input = 'support_reply' and run_record.role <> 'customer_support')
    or (action_type_input = 'social_post' and run_record.role <> 'social_content')
  then
    raise exception 'Managed agent run cannot draft this action'
      using errcode = '42501', detail = 'RUN_NOT_AUTHORIZED';
  end if;

  if action_type_input = 'support_reply' then
    perform 1
    from public.support_cases support
    where support.id = target_id_input
      and support.expires_at > now()
      and support.state in ('open', 'proposal_ready')
    for update;
    if not found then
      raise exception 'Support case is unavailable for drafting'
        using errcode = 'P0002', detail = 'TARGET_NOT_AVAILABLE';
    end if;
  else
    perform 1
    from public.social_campaign_briefs brief
    where brief.id = target_id_input
      and brief.state in ('draft', 'proposal_ready')
    for update;
    if not found then
      raise exception 'Social campaign brief is unavailable for drafting'
        using errcode = 'P0002', detail = 'TARGET_NOT_AVAILABLE';
    end if;
  end if;

  if exists (
    select 1 from public.agent_action_proposals pending
    where pending.action_type = action_type_input
      and pending.target_id = target_id_input
      and pending.state = 'pending'
  ) then
    raise exception 'A proposal already awaits review'
      using errcode = '23505', detail = 'PENDING_PROPOSAL_EXISTS';
  end if;

  insert into public.agent_action_proposals (
    run_id, action_type, target_id, draft_content, metadata, risk_level,
    model, prompt_version, idempotency_key
  ) values (
    run_id_input, action_type_input, target_id_input,
    btrim(draft_content_input), metadata_input, risk_level_input,
    btrim(model_input), btrim(prompt_version_input), idempotency_key_input
  ) returning id into created_id;

  insert into public.agent_action_proposal_events (
    proposal_id, event_type, details, idempotency_key
  ) values (
    created_id, 'draft_recorded',
    jsonb_build_object(
      'actionType', action_type_input,
      'riskLevel', risk_level_input,
      'model', btrim(model_input),
      'promptVersion', btrim(prompt_version_input)
    ),
    idempotency_key_input
  );

  if action_type_input = 'support_reply' then
    update public.support_cases support
    set state = 'proposal_ready'
    where support.id = target_id_input;
  else
    update public.social_campaign_briefs brief
    set state = 'proposal_ready', revision = brief.revision + 1
    where brief.id = target_id_input;
  end if;

  return query select 'PROPOSAL_RECORDED', created_id, 'pending'::text, 0;
end;
$$;

create or replace function public.review_agent_action_proposal(
  proposal_id_input uuid,
  decision_input text,
  expected_revision_input integer,
  content_input text,
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
  proposal public.agent_action_proposals%rowtype;
  prior_event public.agent_action_proposal_events%rowtype;
  content_hash text;
  reason_hash text;
  next_revision integer;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('support_social_pilot') then
    raise exception 'Support and social pilot is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if proposal_id_input is null
    or decision_input is null
    or decision_input not in ('approved', 'rejected', 'escalated')
    or expected_revision_input is null or expected_revision_input < 0
    or (decision_input = 'approved'
      and char_length(btrim(content_input)) not between 1 and 6000)
    or (decision_input <> 'approved'
      and content_input is not null and btrim(content_input) <> '')
    or reason_input is null
    or char_length(btrim(reason_input)) not between 5 and 1000
    or idempotency_key_input is null
  then
    raise exception 'Invalid agent action review'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  content_hash := encode(extensions.digest(convert_to(
    coalesce(btrim(content_input), ''), 'UTF8'
  ), 'sha256'), 'hex');
  reason_hash := encode(extensions.digest(convert_to(
    btrim(reason_input), 'UTF8'
  ), 'sha256'), 'hex');

  select event.* into prior_event
  from public.agent_action_proposal_events event
  where event.idempotency_key = idempotency_key_input
  for update;
  if found then
    if prior_event.proposal_id <> proposal_id_input
      or prior_event.event_type <> decision_input
      or prior_event.details ->> 'contentSha256' <> content_hash
      or prior_event.details ->> 'reasonSha256' <> reason_hash
      or (prior_event.details ->> 'previousRevision')::integer
        <> expected_revision_input
    then
      raise exception 'Agent action review idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    select current_proposal.* into proposal
    from public.agent_action_proposals current_proposal
    where current_proposal.id = proposal_id_input;
    return query select 'IDEMPOTENT_REPLAY', proposal.id, proposal.state,
      proposal.revision;
    return;
  end if;

  select current_proposal.* into proposal
  from public.agent_action_proposals current_proposal
  where current_proposal.id = proposal_id_input
  for update;
  if not found then
    raise exception 'Agent action proposal not found'
      using errcode = 'P0002', detail = 'PROPOSAL_NOT_FOUND';
  end if;
  if proposal.state <> 'pending' then
    raise exception 'Agent action proposal was already reviewed'
      using errcode = '22023', detail = 'PROPOSAL_ALREADY_REVIEWED';
  end if;
  if proposal.revision <> expected_revision_input then
    raise exception 'Agent action proposal revision conflict'
      using errcode = '40001', detail = 'REVISION_CONFLICT';
  end if;
  if proposal.action_type = 'support_reply' and not exists (
    select 1 from public.support_cases support
    where support.id = proposal.target_id and support.expires_at > now()
  ) then
    raise exception 'Support case expired before review'
      using errcode = '22023', detail = 'SUPPORT_CASE_EXPIRED';
  end if;

  next_revision := proposal.revision + 1;
  update public.agent_action_proposals current_proposal
  set state = decision_input,
      final_content = case when decision_input = 'approved'
        then btrim(content_input) else null end,
      reviewed_by = actor_id,
      reviewer_reason = btrim(reason_input),
      reviewed_at = now(),
      revision = next_revision
  where current_proposal.id = proposal.id;

  insert into public.agent_action_proposal_events (
    proposal_id, actor_id, event_type, details, idempotency_key
  ) values (
    proposal.id, actor_id, decision_input,
    jsonb_build_object(
      'actionType', proposal.action_type,
      'decision', decision_input,
      'contentSha256', content_hash,
      'reasonSha256', reason_hash,
      'previousRevision', proposal.revision,
      'nextRevision', next_revision
    ),
    idempotency_key_input
  );

  if proposal.action_type = 'support_reply' then
    update public.support_cases support
    set state = case decision_input
      when 'approved' then 'answered'
      when 'rejected' then 'open'
      else 'escalated'
    end
    where support.id = proposal.target_id;
  else
    update public.social_campaign_briefs brief
    set state = case decision_input
      when 'approved' then 'copy_ready'
      when 'rejected' then 'draft'
      else 'escalated'
    end,
    revision = brief.revision + 1
    where brief.id = proposal.target_id;
  end if;

  return query select upper(decision_input), proposal.id, decision_input,
    next_revision;
end;
$$;

-- The original functions used a four-value application-side allowlist. Reuse
-- their authorization, release gating, idempotency and state semantics while
-- accepting the two new managed roles.
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
  if role_input not in (
    'outreach_growth', 'profile_drafting', 'verification_triage',
    'operations_supervisor', 'customer_support', 'social_content'
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
  if role_input not in (
    'outreach_growth', 'profile_drafting', 'verification_triage',
    'operations_supervisor', 'customer_support', 'social_content'
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

alter table public.support_cases enable row level security;
alter table public.social_campaign_briefs enable row level security;
alter table public.agent_action_proposals enable row level security;
alter table public.agent_action_proposal_events enable row level security;

create policy support_cases_service_read
on public.support_cases for select to service_role using (true);
create policy social_campaign_briefs_service_read
on public.social_campaign_briefs for select to service_role using (true);
create policy agent_action_proposals_service_read
on public.agent_action_proposals for select to service_role using (true);
create policy agent_action_proposal_events_service_read
on public.agent_action_proposal_events for select to service_role using (true);

revoke all on table public.support_cases,
  public.social_campaign_briefs,
  public.agent_action_proposals,
  public.agent_action_proposal_events
from public, anon, authenticated, service_role;
grant select on table public.support_cases,
  public.social_campaign_briefs,
  public.agent_action_proposals,
  public.agent_action_proposal_events
to service_role;

revoke all on function public.prevent_agent_action_proposal_event_mutation()
from public, anon, authenticated, service_role;
revoke all on function public.create_support_case(text, text, text, text, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.create_support_case(
  text, text, text, text, uuid
) to authenticated;
revoke all on function public.list_my_support_cases(integer)
from public, anon, authenticated, service_role;
grant execute on function public.list_my_support_cases(integer)
to authenticated;
revoke all on function public.create_social_campaign_brief(
  text, text, text, text, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.create_social_campaign_brief(
  text, text, text, text, text, text, uuid
) to authenticated;
revoke all on function public.record_agent_action_proposal(
  uuid, text, uuid, text, jsonb, text, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.record_agent_action_proposal(
  uuid, text, uuid, text, jsonb, text, text, text, uuid
) to service_role;
revoke all on function public.review_agent_action_proposal(
  uuid, text, integer, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.review_agent_action_proposal(
  uuid, text, integer, text, text, uuid
) to authenticated;

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
