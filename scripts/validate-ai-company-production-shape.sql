\set ON_ERROR_STOP on

begin;

set local request.jwt.claim.role = 'service_role';

update public.ecosystem_release_controls
set enabled = true
where control_key in ('managed_operations_agents', 'ai_company');

update public.managed_operations_agents
set enabled = true,
    runtime_state = 'idle'
where role in (
  'executive_strategy', 'operations_coordinator', 'data_experimentation',
  'governance_risk', 'independent_auditor', 'growth_strategy',
  'farmer_acquisition', 'buyer_acquisition', 'farmer_onboarding',
  'marketplace_matching', 'seo_editorial', 'product_management',
  'engineering_planning', 'qa_reliability', 'support_trust'
);

do $$
declare
  configured_role record;
  rehearsal_run_id uuid;
  rehearsal_snapshot_id uuid;
begin
  if pg_catalog.to_regclass('public.support_cases') is not null
    or pg_catalog.to_regclass('public.agent_action_proposals') is not null
  then
    raise exception 'Production-shaped rehearsal unexpectedly contains pilot tables';
  end if;

  if (select count(*) from public.managed_operations_agents) <> 21 then
    raise exception 'Expected 21 total managed roles after the production bridge';
  end if;

  if (select count(*) from public.managed_operations_agents where enabled) <> 15 then
    raise exception 'Expected exactly 15 enabled company roles in the rehearsal';
  end if;

  for configured_role in
    select role
    from public.managed_operations_agents
    where enabled
    order by role
  loop
    select started.run_id
    into rehearsal_run_id
    from public.begin_managed_operations_agent_run(
      configured_role.role,
      replace(configured_role.role, '_', '-') || '-production-shape-rehearsal',
      'manual',
      gen_random_uuid()
    ) started;

    select captured.snapshot_id
    into rehearsal_snapshot_id
    from public.record_ai_company_snapshot(
      rehearsal_run_id,
      gen_random_uuid()
    ) captured;

    perform public.record_ai_company_proposal(
      rehearsal_run_id,
      rehearsal_snapshot_id,
      'Production-shaped rehearsal proposal',
      'This proposal verifies the production-compatible company-agent path.',
      'strategic_focus',
      'medium',
      'low',
      '{}'::jsonb,
      gen_random_uuid()
    );

    perform public.finish_managed_operations_agent_run(
      rehearsal_run_id,
      jsonb_build_object(
        'state', 'succeeded',
        'claimed', 1,
        'succeeded', 1,
        'failed', 0,
        'summary', jsonb_build_object('rehearsal', true)
      )
    );
  end loop;

  if (select count(*) from public.company_agent_proposals) <> 15 then
    raise exception 'Expected one rehearsal proposal per company role';
  end if;

  if (select count(*) from public.managed_operations_agent_runs
      where state = 'succeeded') <> 15
  then
    raise exception 'Expected all 15 rehearsal runs to succeed';
  end if;
end;
$$;

select jsonb_build_object(
  'companyRolesTested', count(*),
  'succeededRuns', count(*) filter (where runtime_state = 'healthy'),
  'supportPilotAbsent', pg_catalog.to_regclass('public.support_cases') is null
) as production_shape_rehearsal
from public.managed_operations_agents
where role in (
  'executive_strategy', 'operations_coordinator', 'data_experimentation',
  'governance_risk', 'independent_auditor', 'growth_strategy',
  'farmer_acquisition', 'buyer_acquisition', 'farmer_onboarding',
  'marketplace_matching', 'seo_editorial', 'product_management',
  'engineering_planning', 'qa_reliability', 'support_trust'
);

rollback;
