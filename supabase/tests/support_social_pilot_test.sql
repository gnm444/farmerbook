-- Run after local migrations, for example with `supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  participant_id_value constant uuid := '61000000-0000-4000-8000-000000000001';
  admin_id_value constant uuid := '62000000-0000-4000-8000-000000000002';
  support_case_id_value uuid;
  social_brief_id_value uuid;
  support_run_id_value uuid;
  social_run_id_value uuid;
  support_proposal_id_value uuid;
  social_proposal_id_value uuid;
  immutable_event_id_value uuid;
  result_code text;
  result_state text;
  result_revision integer;
  result_expiry timestamptz;
  visible_reply text;
  error_detail text;
  table_name_value text;
  definition text;
begin
  foreach table_name_value in array array[
    'support_cases', 'social_campaign_briefs',
    'agent_action_proposals', 'agent_action_proposal_events'
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

  if public.is_ecosystem_release_enabled('support_social_pilot') then
    raise exception 'Support/social pilot must default off';
  end if;
  if not exists (
    select 1 from public.managed_operations_agents
    where role = 'customer_support' and not enabled and runtime_state = 'paused'
  ) or not exists (
    select 1 from public.managed_operations_agents
    where role = 'social_content' and not enabled and runtime_state = 'paused'
  ) then
    raise exception 'New managed roles must default paused';
  end if;

  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.create_support_case(text,text,text,text,uuid)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'anon', 'public.create_support_case(text,text,text,text,uuid)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated', 'public.list_my_support_cases(integer)', 'EXECUTE'
  ) then
    raise exception 'Participant support RPC grants are unsafe';
  end if;
  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.record_agent_action_proposal(uuid,text,uuid,text,jsonb,text,text,text,uuid)',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.record_agent_action_proposal(uuid,text,uuid,text,jsonb,text,text,text,uuid)',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'service_role',
    'public.review_agent_action_proposal(uuid,text,integer,text,text,uuid)',
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.review_agent_action_proposal(uuid,text,integer,text,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Draft and review RPC privilege separation is unsafe';
  end if;

  select lower(pg_catalog.pg_get_functiondef(
    'public.request_managed_operations_agent_run(text,text,uuid)'::regprocedure
  )) into definition;
  if definition not like '%customer_support%'
    or definition not like '%social_content%'
    or definition not like '%support_social_pilot%'
  then
    raise exception 'Managed run requests do not enforce the pilot gate';
  end if;
  select lower(pg_catalog.pg_get_functiondef(
    'public.configure_managed_operations_agent(text,boolean,integer,integer,text,uuid)'::regprocedure
  )) into definition;
  if definition not like '%customer_support%'
    or definition not like '%social_content%'
    or definition not like '%support_social_pilot%'
  then
    raise exception 'Managed configuration does not enforce the pilot gate';
  end if;

  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values
    (
      participant_id_value, 'support-participant@farmerbook.invalid',
      '{"full_name":"Support Participant"}'::jsonb, '{}'::jsonb
    ),
    (
      admin_id_value, 'support-admin@farmerbook.invalid',
      '{"full_name":"Support Administrator"}'::jsonb,
      '{"role":"admin"}'::jsonb
    );
  update public.profiles
  set status = 'active'
  where id in (participant_id_value, admin_id_value);

  perform pg_catalog.set_config(
    'request.jwt.claim.sub', participant_id_value::text, true
  );
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', participant_id_value, 'role', 'authenticated',
      'app_metadata', '{}'::jsonb
    )::text,
    true
  );
  begin
    perform public.create_support_case(
      'technical', 'en-IN', 'Pilot gate test',
      'This support request must be rejected while the pilot is disabled.',
      '61000000-0000-4000-8000-000000000010'
    );
    raise exception 'Disabled pilot unexpectedly accepted a support case';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'FEATURE_DISABLED' then
        raise exception 'Unexpected disabled-pilot detail: %', error_detail;
      end if;
  end;

  update public.ecosystem_release_controls
  set enabled = true
  where control_key = 'managed_operations_agents';
  perform pg_catalog.set_config('request.jwt.claim.sub', admin_id_value::text, true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', admin_id_value, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
  );
  begin
    perform public.configure_managed_operations_agent(
      'customer_support', true, 300, 10,
      'Pilot gate must remain closed.',
      '61000000-0000-4000-8000-000000000011'
    );
    raise exception 'Disabled pilot unexpectedly enabled a support schedule';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'FEATURE_DISABLED' then
        raise exception 'Unexpected schedule gate detail: %', error_detail;
      end if;
  end;

  update public.ecosystem_release_controls
  set enabled = true
  where control_key = 'support_social_pilot';

  select configured.code into result_code
  from public.configure_managed_operations_agent(
    'customer_support', true, 300, 10,
    'Enable supervised customer support.',
    '61000000-0000-4000-8000-000000000012'
  ) configured;
  if result_code <> 'CONFIGURED' then
    raise exception 'Customer-support agent configuration failed';
  end if;
  perform public.configure_managed_operations_agent(
    'social_content', true, 3600, 5,
    'Enable supervised social drafting.',
    '61000000-0000-4000-8000-000000000013'
  );

  perform pg_catalog.set_config('request.jwt.claim.sub', participant_id_value::text, true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', participant_id_value, 'role', 'authenticated',
      'app_metadata', '{}'::jsonb
    )::text,
    true
  );
  select created.code, created.case_id, created.state, created.expires_at
  into result_code, support_case_id_value, result_state, result_expiry
  from public.create_support_case(
    'agriculture', 'en-IN', 'Question about crop information',
    'Where can I find the verified FarmerBook crop information resources?',
    '61000000-0000-4000-8000-000000000014'
  ) created;
  if result_code <> 'CASE_CREATED' or result_state <> 'open'
    or result_expiry > now() + interval '90 days'
    or result_expiry < now() + interval '89 days 23 hours'
  then
    raise exception 'Support case creation or 90-day expiry failed';
  end if;
  select replay.code into result_code
  from public.create_support_case(
    'agriculture', 'en-IN', 'Question about crop information',
    'Where can I find the verified FarmerBook crop information resources?',
    '61000000-0000-4000-8000-000000000014'
  ) replay;
  if result_code <> 'IDEMPOTENT_REPLAY' then
    raise exception 'Support case idempotency failed';
  end if;

  insert into public.support_cases (
    participant_id, category, locale, subject, question, idempotency_key
  )
  select participant_id_value, 'technical', 'en-IN',
    'Executable rate-limit case ' || value,
    'This is an executable support rate-limit fixture number ' || value || '.',
    ('61000000-0000-4000-8100-' || lpad(value::text, 12, '0'))::uuid
  from generate_series(1, 4) value;
  begin
    perform public.create_support_case(
      'technical', 'en-IN', 'Sixth support case is limited',
      'This sixth support case must be rejected by the daily abuse cap.',
      '61000000-0000-4000-8000-000000000015'
    );
    raise exception 'Support case daily cap unexpectedly allowed a sixth case';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'RATE_LIMITED' then
        raise exception 'Unexpected support rate-limit detail: %', error_detail;
      end if;
  end;

  select listed.reply_content into visible_reply
  from public.list_my_support_cases(25) listed
  where listed.case_id = support_case_id_value;
  if visible_reply is not null then
    raise exception 'An unapproved support reply became participant-visible';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.sub', admin_id_value::text, true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', admin_id_value, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
  );
  select created.code, created.brief_id, created.state, created.revision
  into result_code, social_brief_id_value, result_state, result_revision
  from public.create_social_campaign_brief(
    'linkedin', 'en-IN', 'FarmerBook farmers and agriculture organizations',
    'Share a factual update about the supervised support pilot.',
    'The pilot drafts content but never publishes without a separate human action.',
    'Visit farmerbook.in to learn more.',
    '61000000-0000-4000-8000-000000000016'
  ) created;
  if result_code <> 'BRIEF_CREATED' or result_state <> 'draft'
    or result_revision <> 0
  then
    raise exception 'Social campaign brief creation failed';
  end if;

  insert into public.social_campaign_briefs (
    created_by, platform, locale, audience, objective, source_facts,
    call_to_action, idempotency_key
  )
  select admin_id_value, 'x', 'en-IN',
    'Executable social audience ' || value,
    'Exercise the administrator social brief daily rate limit.',
    'Only deterministic database test facts are included in this fixture.',
    'Read this executable test fixture.',
    ('61000000-0000-4000-8200-' || lpad(value::text, 12, '0'))::uuid
  from generate_series(1, 24) value;
  begin
    perform public.create_social_campaign_brief(
      'x', 'en-IN', 'A rate-limited social audience',
      'This twenty-sixth brief must be rejected by the daily cap.',
      'The administrator already created twenty-five briefs in twenty-four hours.',
      'Do not create this brief.',
      '61000000-0000-4000-8000-000000000017'
    );
    raise exception 'Social brief daily cap unexpectedly allowed a 26th brief';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'RATE_LIMITED' then
        raise exception 'Unexpected social rate-limit detail: %', error_detail;
      end if;
  end;

  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', '{"role":"service_role"}', true
  );
  select started.run_id into support_run_id_value
  from public.begin_managed_operations_agent_run(
    'customer_support', 'support-test-agent', 'manual',
    '61000000-0000-4000-8000-000000000018'
  ) started;
  select started.run_id into social_run_id_value
  from public.begin_managed_operations_agent_run(
    'social_content', 'social-test-agent', 'manual',
    '61000000-0000-4000-8000-000000000019'
  ) started;

  select recorded.code, recorded.proposal_id, recorded.state, recorded.revision
  into result_code, support_proposal_id_value, result_state, result_revision
  from public.record_agent_action_proposal(
    support_run_id_value, 'support_reply', support_case_id_value,
    'You can find reviewed crop resources through FarmerBook profiles and marketplace listings.',
    '{"classification":"agriculture_information"}'::jsonb,
    'high', 'workers-ai-test', 'support-pilot-2026.08.1',
    '61000000-0000-4000-8000-000000000020'
  ) recorded;
  if result_code <> 'PROPOSAL_RECORDED' or result_state <> 'pending'
    or result_revision <> 0
  then
    raise exception 'Support draft recording failed';
  end if;
  select event.id into immutable_event_id_value
  from public.agent_action_proposal_events event
  where event.proposal_id = support_proposal_id_value
    and event.event_type = 'draft_recorded';
  if exists (
    select 1 from public.agent_action_proposal_events event
    where event.proposal_id = support_proposal_id_value
      and event.details::text like '%You can find reviewed crop resources%'
  ) then
    raise exception 'Support body leaked into event JSON';
  end if;

  select recorded.proposal_id into social_proposal_id_value
  from public.record_agent_action_proposal(
    social_run_id_value, 'social_post', social_brief_id_value,
    'FarmerBook is preparing a supervised customer-support pilot. Every draft receives human review.',
    '{"campaign":"support-pilot"}'::jsonb,
    'medium', 'workers-ai-test', 'social-pilot-2026.08.1',
    '61000000-0000-4000-8000-000000000021'
  ) recorded;

  begin
    update public.agent_action_proposal_events
    set details = '{"decision":"tampered"}'::jsonb
    where id = immutable_event_id_value;
    raise exception 'Proposal audit event mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  perform pg_catalog.set_config('request.jwt.claim.sub', admin_id_value::text, true);
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', admin_id_value, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
  );
  select reviewed.code, reviewed.state, reviewed.revision
  into result_code, result_state, result_revision
  from public.review_agent_action_proposal(
    support_proposal_id_value, 'approved', 0,
    'You can find reviewed crop resources through FarmerBook profiles and marketplace listings.',
    'Reviewed for scope, accuracy, and safe escalation boundaries.',
    '61000000-0000-4000-8000-000000000022'
  ) reviewed;
  if result_code <> 'APPROVED' or result_state <> 'approved'
    or result_revision <> 1
  then
    raise exception 'Support proposal approval failed';
  end if;
  select replay.code into result_code
  from public.review_agent_action_proposal(
    support_proposal_id_value, 'approved', 0,
    'You can find reviewed crop resources through FarmerBook profiles and marketplace listings.',
    'Reviewed for scope, accuracy, and safe escalation boundaries.',
    '61000000-0000-4000-8000-000000000022'
  ) replay;
  if result_code <> 'IDEMPOTENT_REPLAY' then
    raise exception 'Review idempotency failed';
  end if;

  perform public.review_agent_action_proposal(
    social_proposal_id_value, 'approved', 0,
    'FarmerBook is preparing a supervised customer-support pilot. Every draft receives human review.',
    'Reviewed factual copy; publication remains outside this pilot.',
    '61000000-0000-4000-8000-000000000023'
  );
  if not exists (
    select 1 from public.social_campaign_briefs brief
    where brief.id = social_brief_id_value and brief.state = 'copy_ready'
  ) then
    raise exception 'Approved social copy did not become copy_ready';
  end if;
  if exists (
    select 1 from public.social_campaign_briefs brief
    where brief.state = 'published'
  ) then
    raise exception 'The social pilot unexpectedly published content';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.sub', participant_id_value::text, true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', participant_id_value, 'role', 'authenticated',
      'app_metadata', '{}'::jsonb
    )::text,
    true
  );
  select listed.reply_content into visible_reply
  from public.list_my_support_cases(25) listed
  where listed.case_id = support_case_id_value;
  if visible_reply is distinct from
    'You can find reviewed crop resources through FarmerBook profiles and marketplace listings.'
  then
    raise exception 'Approved support reply was not participant-visible';
  end if;
end;
$$;

select extensions.pass(
  'Support/social pilot gates, abuse caps, drafts, review, visibility and audit contracts hold'
);
select * from extensions.finish();

rollback;
