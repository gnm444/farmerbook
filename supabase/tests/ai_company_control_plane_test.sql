-- Run after local migrations, for example with `supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  admin_id_value constant uuid := '71000000-0000-4000-8000-000000000001';
  run_id_value constant uuid := '71000000-0000-4000-8000-000000000010';
  snapshot_key_value constant uuid := '71000000-0000-4000-8000-000000000011';
  proposal_key_value constant uuid := '71000000-0000-4000-8000-000000000012';
  review_key_value constant uuid := '71000000-0000-4000-8000-000000000013';
  snapshot_id_value uuid;
  proposal_id_value uuid;
  metrics_value jsonb;
  result_code text;
  result_state text;
  result_revision integer;
  managed_control_enabled boolean;
  company_control_enabled boolean;
  error_detail text;
  table_name_value text;
  product_rows_before bigint;
  product_rows_after bigint;
  company_roles constant text[] := array[
    'executive_strategy', 'operations_coordinator', 'data_experimentation',
    'governance_risk', 'independent_auditor', 'growth_strategy',
    'farmer_acquisition', 'buyer_acquisition', 'farmer_onboarding',
    'marketplace_matching', 'seo_editorial', 'product_management',
    'engineering_planning', 'qa_reliability', 'support_trust'
  ]::text[];
begin
  foreach table_name_value in array array[
    'company_objectives', 'company_kpi_snapshots',
    'company_agent_proposals', 'company_agent_proposal_events'
  ]::text[]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = table_name_value
        and relation.relrowsecurity
    ) then
      raise exception 'Expected RLS on public.%', table_name_value;
    end if;
    if pg_catalog.has_table_privilege(
      'anon', format('public.%I', table_name_value),
      'SELECT,INSERT,UPDATE,DELETE'
    ) or pg_catalog.has_table_privilege(
      'authenticated', format('public.%I', table_name_value),
      'SELECT,INSERT,UPDATE,DELETE'
    ) then
      raise exception 'Browser table access is unsafe on public.%', table_name_value;
    end if;
  end loop;

  if public.is_ecosystem_release_enabled('ai_company') then
    raise exception 'AI company control plane must default off';
  end if;
  if (
    select count(*) from public.managed_operations_agents
    where role = any(company_roles)
      and not enabled and runtime_state = 'paused'
  ) <> 15 then
    raise exception 'All fifteen company roles must default paused';
  end if;

  if not pg_catalog.has_function_privilege(
    'service_role', 'public.collect_ai_company_metrics()', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated', 'public.collect_ai_company_metrics()', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role',
    'public.record_ai_company_snapshot(uuid,uuid)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.record_ai_company_snapshot(uuid,uuid)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.review_ai_company_proposal(uuid,text,integer,text,uuid)',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'service_role',
    'public.review_ai_company_proposal(uuid,text,integer,text,uuid)',
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated', 'public.ai_company_control_status()', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'anon', 'public.ai_company_control_status()', 'EXECUTE'
  ) then
    raise exception 'Company create/review privilege separation is unsafe';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', '{"role":"service_role"}', true
  );
  begin
    perform public.collect_ai_company_metrics();
    raise exception 'Disabled company gate unexpectedly exposed metrics';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'FEATURE_DISABLED' then
        raise exception 'Unexpected disabled-company detail: %', error_detail;
      end if;
  end;

  update public.ecosystem_release_controls
  set enabled = true
  where control_key in ('managed_operations_agents', 'ai_company');
  update public.managed_operations_agents
  set enabled = true, runtime_state = 'running'
  where role = 'executive_strategy';
  insert into public.managed_operations_agent_runs (
    id, role, instance_name, trigger_type, idempotency_key
  ) values (
    run_id_value, 'executive_strategy',
    'farmerbook-company-executive-strategy', 'manual',
    '71000000-0000-4000-8000-000000000014'
  );

  select recorded.code, recorded.snapshot_id, recorded.metrics
  into result_code, snapshot_id_value, metrics_value
  from public.record_ai_company_snapshot(
    run_id_value, snapshot_key_value
  ) recorded;
  if result_code <> 'RECORDED' or snapshot_id_value is null then
    raise exception 'Aggregate company snapshot was not recorded';
  end if;
  if metrics_value - array[
    'capturedAt', 'registeredUsers', 'activatedUsers',
    'monthlyActiveUsers', 'registeredFarmers', 'registeredBuyers',
    'registeredWholesalers', 'registeredAgriBusinesses', 'activePosts',
    'activeListings', 'activeListingsWithoutEnquiries', 'marketEnquiries',
    'wonMarketEnquiries', 'openSupportCases', 'technicalSupportCases',
    'pendingReports', 'pendingCompanyProposals', 'pendingActionProposals',
    'managedRunFailures24h'
  ]::text[] <> '{}'::jsonb then
    raise exception 'Company snapshot contains an unapproved metric field';
  end if;
  if metrics_value ?| array[
    'fullName', 'email', 'phone', 'handle', 'question', 'body', 'message'
  ]::text[] then
    raise exception 'Company snapshot contains participant-level information';
  end if;

  select recorded.code, recorded.proposal_id,
    recorded.state, recorded.revision
  into result_code, proposal_id_value, result_state, result_revision
  from public.record_ai_company_proposal(
    run_id_value, snapshot_id_value,
    'Focus the next growth cycle on activation',
    'The aggregate activation gap is the largest measurable constraint.',
    'strategic_focus', 'high', 'low',
    jsonb_build_object(
      'registeredUsers', metrics_value -> 'registeredUsers',
      'activatedUsers', metrics_value -> 'activatedUsers'
    ),
    proposal_key_value
  ) recorded;
  if result_code <> 'RECORDED' or result_state <> 'pending'
    or result_revision <> 0 or proposal_id_value is null
  then
    raise exception 'Company proposal was not recorded for review';
  end if;

  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values (
    admin_id_value, 'ai-company-admin@farmerbook.invalid',
    '{"full_name":"AI Company Administrator"}'::jsonb,
    '{"role":"admin"}'::jsonb
  );
  update public.profiles set status = 'active' where id = admin_id_value;
  perform pg_catalog.set_config(
    'request.jwt.claim.sub', admin_id_value::text, true
  );
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', admin_id_value, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
  );

  select status.managed_operations_enabled, status.ai_company_enabled
  into managed_control_enabled, company_control_enabled
  from public.ai_company_control_status() status;
  if not managed_control_enabled or not company_control_enabled then
    raise exception 'Administrator control status did not report both gates';
  end if;

  begin
    perform public.review_ai_company_proposal(
      proposal_id_value, 'approved', 1,
      'Approve this as a planning backlog item only.',
      '71000000-0000-4000-8000-000000000015'
    );
    raise exception 'Stale proposal revision unexpectedly succeeded';
  exception
    when serialization_failure then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'REVISION_CONFLICT' then
        raise exception 'Unexpected proposal revision detail: %', error_detail;
      end if;
  end;

  select
    (select count(*) from public.posts)
    + (select count(*) from public.produce_listings)
    + (select count(*) from public.messages)
    + (select count(*) from public.outreach_outbox)
  into product_rows_before;
  select reviewed.code, reviewed.state, reviewed.revision
  into result_code, result_state, result_revision
  from public.review_ai_company_proposal(
    proposal_id_value, 'approved', 0,
    'Approve this as a planning backlog item only.', review_key_value
  ) reviewed;
  select
    (select count(*) from public.posts)
    + (select count(*) from public.produce_listings)
    + (select count(*) from public.messages)
    + (select count(*) from public.outreach_outbox)
  into product_rows_after;
  if result_code <> 'APPROVED' or result_state <> 'approved'
    or result_revision <> 1 or product_rows_after <> product_rows_before
  then
    raise exception 'Review changed product state or returned an invalid result';
  end if;
  if not exists (
    select 1 from public.company_agent_proposal_events event
    where event.proposal_id = proposal_id_value
      and event.event_type = 'approved'
      and event.details ? 'reasonSha256'
      and not event.details ? 'reason'
  ) then
    raise exception 'Redacted proposal review audit event is missing';
  end if;

  begin
    update public.company_agent_proposal_events
    set details = '{}'::jsonb
    where proposal_id = proposal_id_value;
    raise exception 'Immutable company audit event was updated';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'AUDIT_IMMUTABLE' then
        raise exception 'Unexpected immutable-audit detail: %', error_detail;
      end if;
  end;
end;
$$;

select extensions.pass(
  'AI company gates, aggregate metrics, proposals, review and audit contracts hold'
);
select * from extensions.finish();

rollback;
