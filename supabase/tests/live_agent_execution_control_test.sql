-- Run after local migrations, for example with `supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  proposer_id constant uuid := '72000000-0000-4000-8000-000000000001';
  approver_one_id constant uuid := '72100000-0000-4000-8000-000000000002';
  approver_two_id constant uuid := '72200000-0000-4000-8000-000000000003';
  run_id_value constant uuid := '72000000-0000-4000-8000-000000000010';
  snapshot_id_value constant uuid := '72000000-0000-4000-8000-000000000011';
  proposal_id_value constant uuid := '72000000-0000-4000-8000-000000000012';
  authorization_key constant uuid := '72000000-0000-4000-8000-000000000020';
  approval_one_key constant uuid := '72000000-0000-4000-8000-000000000021';
  approval_two_key constant uuid := '72000000-0000-4000-8000-000000000022';
  enable_key constant uuid := '72000000-0000-4000-8000-000000000023';
  claim_key constant uuid := '72000000-0000-4000-8000-000000000024';
  receipt_key constant uuid := '72000000-0000-4000-8000-000000000025';
  reenable_key constant uuid := '72000000-0000-4000-8000-000000000026';
  reconcile_key constant uuid := '72000000-0000-4000-8000-000000000027';
  stage_key constant uuid := '72000000-0000-4000-8000-000000000028';
  verification_key constant uuid := '72000000-0000-4000-8000-000000000029';
  payload_hash constant text := repeat('a', 64);
  request_hash constant text := repeat('b', 64);
  target_scope constant jsonb := jsonb_build_object(
    'scopeType', 'owned_site_draft',
    'draftId', '72000000-0000-4000-8000-000000000099',
    'slug', 'synthetic-owned-site-draft'
  );
  authorization_id_value uuid;
  attempt_id_value uuid;
  lease_token_value text;
  result_code text;
  result_state text;
  result_revision integer;
  result_approval_count integer;
  result_required_approvals integer;
  result_tier integer;
  result_risk text;
  error_detail text;
  table_name_value text;
  broken_links integer;
begin
  if public.is_ecosystem_release_enabled('live_agent_execution') then
    raise exception 'Live agent execution must default off';
  end if;
  if (
    select count(*) from public.live_agent_executor_controls
    where paused and shadow_only and canary_stage = 0
  ) <> 8 then
    raise exception 'All eight executors must default paused and shadow-only';
  end if;
  if public.is_redacted_live_agent_receipt(
    '{"occurredAt":"2026-08-20T00:00:00Z hidden@example.invalid"}'::jsonb
  ) then
    raise exception 'Timestamp-prefixed receipt text must fail redaction';
  end if;

  foreach table_name_value in array array[
    'live_agent_executor_controls', 'agent_action_authorizations',
    'agent_action_approvals', 'agent_action_attempts',
    'agent_action_budget_ledger', 'agent_action_events',
    'live_agent_executor_control_events'
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
    ) or pg_catalog.has_table_privilege(
      'service_role', format('public.%I', table_name_value),
      'SELECT,INSERT,UPDATE,DELETE'
    ) then
      raise exception 'Direct table access is unsafe on public.%', table_name_value;
    end if;
  end loop;

  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.create_live_agent_action_authorization(uuid,text,text,jsonb,text,integer,bigint,integer,timestamp with time zone,timestamp with time zone,uuid,uuid)',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.create_live_agent_action_authorization(uuid,text,text,jsonb,text,integer,bigint,integer,timestamp with time zone,timestamp with time zone,uuid,uuid)',
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.review_live_agent_action_authorization(uuid,integer,text,text,uuid)',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'service_role',
    'public.review_live_agent_action_authorization(uuid,integer,text,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Service/admin RPC privilege separation is unsafe';
  end if;

  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values
    (proposer_id, 'live-proposer@farmerbook.invalid',
      '{"full_name":"Live Action Proposer"}'::jsonb,
      '{"role":"admin"}'::jsonb),
    (approver_one_id, 'live-approver-one@farmerbook.invalid',
      '{"full_name":"Live Action Approver One"}'::jsonb,
      '{"role":"admin"}'::jsonb),
    (approver_two_id, 'live-approver-two@farmerbook.invalid',
      '{"full_name":"Live Action Approver Two"}'::jsonb,
      '{"role":"admin"}'::jsonb);
  update public.profiles
  set status = 'active'
  where id in (proposer_id, approver_one_id, approver_two_id);

  insert into public.managed_operations_agent_runs (
    id, role, instance_name, trigger_type, state, idempotency_key,
    completed_at
  ) values (
    run_id_value, 'seo_editorial', 'farmerbook-live-action-test',
    'manual', 'succeeded', '72000000-0000-4000-8000-000000000030', now()
  );
  insert into public.company_kpi_snapshots (
    id, run_id, role, metrics, idempotency_key
  ) values (
    snapshot_id_value, run_id_value, 'seo_editorial',
    '{"registeredUsers":0}'::jsonb,
    '72000000-0000-4000-8000-000000000031'
  );
  insert into public.company_agent_proposals (
    id, run_id, snapshot_id, role, title, summary, action_kind,
    priority, risk_level, evidence, state, reviewed_by,
    reviewer_reason, reviewed_at, idempotency_key
  ) values (
    proposal_id_value, run_id_value, snapshot_id_value, 'seo_editorial',
    'Publish reviewed owned-site content',
    'Synthetic proposal for the private live-action control-plane test.',
    'plan_editorial', 'high', 'medium', '{"synthetic":true}'::jsonb,
    'approved', proposer_id, 'Synthetic planning approval only.', now(),
    '72000000-0000-4000-8000-000000000032'
  );
  update public.ecosystem_release_controls
  set enabled = true
  where control_key = 'live_agent_execution';

  perform pg_catalog.set_config(
    'request.jwt.claim.sub', proposer_id::text, true
  );
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', jsonb_build_object(
      'sub', proposer_id, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text, true
  );
  perform public.set_live_agent_executor_pause(
    'owned_site_publish', true, 1, 30, 0, 0, 1,
    'Prepare the synthetic canary while remaining paused.', stage_key
  );

  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', '{"role":"service_role"}', true
  );
  begin
    perform public.create_live_agent_action_authorization(
      proposal_id_value, 'owned_site_publish', 'owned_site_article_publish',
      target_scope, payload_hash, 1, 0, 1, now(),
      now() + interval '30 minutes', proposer_id,
      '72000000-0000-4000-8000-000000000035'
    );
    raise exception 'Generic service role unexpectedly acted as authorizer';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'ACTION_PRINCIPAL_REQUIRED' then
        raise exception 'Unexpected scoped-principal detail: %', error_detail;
      end if;
  end;
  perform pg_catalog.set_config(
    'request.jwt.claims',
    '{"role":"service_role","action_principal":"authorizer"}', true
  );
  select created.code, created.authorization_id, created.approval_tier,
    created.risk_level, created.state, created.revision,
    created.required_approvals
  into result_code, authorization_id_value, result_tier, result_risk,
    result_state, result_revision, result_required_approvals
  from public.create_live_agent_action_authorization(
    proposal_id_value, 'owned_site_publish', 'owned_site_article_publish',
    target_scope, payload_hash, 1, 0, 1, now(), now() + interval '30 minutes',
    proposer_id, authorization_key
  ) created;
  if result_code <> 'CREATED' or result_state <> 'pending_approval'
    or result_tier <> 4 or result_risk <> 'high'
    or result_required_approvals <> 2
  then
    raise exception 'Tier-4 policy was not derived server-side';
  end if;

  perform pg_catalog.set_config(
    'request.jwt.claim.sub', proposer_id::text, true
  );
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', jsonb_build_object(
      'sub', proposer_id, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text, true
  );
  begin
    perform public.review_live_agent_action_authorization(
      authorization_id_value, 0, 'approved',
      'A proposer must not self-approve.',
      '72000000-0000-4000-8000-000000000033'
    );
    raise exception 'Proposer unexpectedly approved its own action';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'PROPOSER_APPROVER_CONFLICT' then
        raise exception 'Unexpected proposer separation detail: %', error_detail;
      end if;
  end;

  perform pg_catalog.set_config(
    'request.jwt.claim.sub', approver_one_id::text, true
  );
  perform pg_catalog.set_config(
    'request.jwt.claims', jsonb_build_object(
      'sub', approver_one_id, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text, true
  );
  select reviewed.code, reviewed.state, reviewed.revision,
    reviewed.approval_count, reviewed.required_approvals
  into result_code, result_state, result_revision,
    result_approval_count, result_required_approvals
  from public.review_live_agent_action_authorization(
    authorization_id_value, 0, 'approved',
    'First independent action approval.', approval_one_key
  ) reviewed;
  if result_state <> 'pending_approval' or result_revision <> 1
    or result_approval_count <> 1 or result_required_approvals <> 2
  then
    raise exception 'First Tier-4 approval incorrectly authorized the action';
  end if;

  perform pg_catalog.set_config(
    'request.jwt.claim.sub', approver_two_id::text, true
  );
  perform pg_catalog.set_config(
    'request.jwt.claims', jsonb_build_object(
      'sub', approver_two_id, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text, true
  );
  select reviewed.state, reviewed.revision, reviewed.approval_count
  into result_state, result_revision, result_approval_count
  from public.review_live_agent_action_authorization(
    authorization_id_value, 1, 'approved',
    'Second independent action approval.', approval_two_key
  ) reviewed;
  if result_state <> 'authorized' or result_revision <> 2
    or result_approval_count <> 2
  then
    raise exception 'Two distinct Tier-4 approvals did not authorize the action';
  end if;
  perform public.set_live_agent_executor_pause(
    'owned_site_publish', false, 1, 30, 0, 0, 1,
    'Enable only the synthetic owned-site test canary.', enable_key
  );

  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    '{"role":"service_role","action_principal":"executor:owned_site_publish"}', true
  );
  select claimed.attempt_id, claimed.lease_token
  into attempt_id_value, lease_token_value
  from public.claim_live_agent_action_authorization(
    authorization_id_value, 'owned_site_publish', request_hash, claim_key
  ) claimed;
  begin
    perform public.authorize_live_agent_action_dispatch(
      attempt_id_value, lease_token_value, repeat('d', 64), target_scope, 0
    );
    raise exception 'Changed payload unexpectedly passed final authorization';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'EXACT_SCOPE_MISMATCH' then
        raise exception 'Unexpected exact-scope detail: %', error_detail;
      end if;
  end;
  perform public.authorize_live_agent_action_dispatch(
    attempt_id_value, lease_token_value, payload_hash, target_scope, 0
  );
  perform public.record_live_agent_action_receipt(
    attempt_id_value, lease_token_value, 'unknown', jsonb_build_object(
      'provider', 'fake-owned-site', 'statusCode', 599,
      'reasonCode', 'SYNTHETIC_UNKNOWN', 'occurredAt', now()
    ), receipt_key
  );
  if not (
    select control.paused and control.pause_reason_code = 'UNKNOWN_OUTCOME'
    from public.live_agent_executor_controls control
    where control.executor = 'owned_site_publish'
  ) then
    raise exception 'Unknown outcome did not automatically pause its executor';
  end if;
  perform pg_catalog.set_config(
    'request.jwt.claims',
    '{"role":"service_role","action_principal":"verifier:action_verifier"}', true
  );
  perform public.verify_live_agent_action_attempt(
    attempt_id_value, 'action_verifier', 'unknown', jsonb_build_object(
      'provider', 'fake-owned-site', 'reasonCode', 'POST_CONDITION_UNAVAILABLE',
      'occurredAt', now()
    ), verification_key
  );
  if not exists (
    select 1 from public.agent_action_attempts attempt
    where attempt.id = attempt_id_value and attempt.state = 'unknown'
      and attempt.verifier_identity = 'action_verifier'
      and attempt.verified_at is null
  ) then
    raise exception 'Verifier did not persist an unknown post-condition safely';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', jsonb_build_object(
      'sub', approver_two_id, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text, true
  );
  perform public.set_live_agent_executor_pause(
    'owned_site_publish', false, 1, 30, 0, 0, 1,
    'Re-enable only to prove unknown outcomes block retry.', reenable_key
  );

  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    '{"role":"service_role","action_principal":"executor:owned_site_publish"}', true
  );
  begin
    perform public.claim_live_agent_action_authorization(
      authorization_id_value, 'owned_site_publish', repeat('e', 64),
      '72000000-0000-4000-8000-000000000034'
    );
    raise exception 'Unknown external outcome was blindly retried';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'RECONCILIATION_REQUIRED' then
        raise exception 'Unexpected reconciliation detail: %', error_detail;
      end if;
  end;
  perform pg_catalog.set_config(
    'request.jwt.claims',
    '{"role":"service_role","action_principal":"reconciler:action_reconciler"}', true
  );
  perform public.reconcile_live_agent_action_attempt(
    attempt_id_value, 'action_reconciler', 'verified', jsonb_build_object(
      'provider', 'fake-owned-site', 'providerReceiptSha256', repeat('f', 64),
      'reconciliationCode', 'SYNTHETIC_CONFIRMED', 'occurredAt', now()
    ), reconcile_key
  );
  if not exists (
    select 1 from public.agent_action_attempts attempt
    where attempt.id = attempt_id_value and attempt.state = 'verified'
      and attempt.verifier_identity = 'action_verifier'
  ) then
    raise exception 'Unknown outcome was not safely reconciled';
  end if;
  if (select count(*) from public.agent_action_budget_ledger
      where authorization_id = authorization_id_value) <> 1 then
    raise exception 'Dispatch did not reserve exactly one atomic budget row';
  end if;

  select count(*)::integer into broken_links
  from (
    select event.sequence_number, event.previous_event_hash,
      lag(event.event_hash) over (order by event.sequence_number) as prior_hash
    from public.agent_action_events event
    where event.authorization_id = authorization_id_value
  ) chain
  where (chain.sequence_number = 1 and chain.previous_event_hash is not null)
     or (chain.sequence_number > 1 and chain.previous_event_hash is distinct from chain.prior_hash);
  if broken_links <> 0 then
    raise exception 'Live action event hash chain is broken';
  end if;
  begin
    update public.agent_action_events
    set details = '{}'::jsonb
    where authorization_id = authorization_id_value;
    raise exception 'Immutable live action event was updated';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'AUDIT_IMMUTABLE' then
        raise exception 'Unexpected immutable-event detail: %', error_detail;
      end if;
  end;
end;
$$;

select extensions.pass(
  'Live-action release, approvals, exact dispatch, budgets, reconciliation, RLS and audit hold'
);
select * from extensions.finish();

rollback;
