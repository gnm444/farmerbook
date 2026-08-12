-- Executable consent, invitation, provider-event and operational-control checks.
begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  table_name_value text;
  function_name_value text;
  function_definition text;
  claimed_count bigint;
  result_code text;
  prospect_status_value text;
  response_outbox_id_value uuid;
  contact_hash_value text;
  test_profile_id constant uuid := '10000000-0000-4000-8000-000000000001';
  test_prospect_id constant uuid := '10000000-0000-4000-8000-000000000002';
  test_contact_id constant uuid := '10000000-0000-4000-8000-000000000003';
  test_consent_id constant uuid := '10000000-0000-4000-8000-000000000004';
  test_outbox_id constant uuid := '10000000-0000-4000-8000-000000000005';
  email_prospect_id constant uuid := '10000000-0000-4000-8000-000000000020';
  email_contact_id constant uuid := '10000000-0000-4000-8000-000000000021';
  invitation_token constant text :=
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
begin
  foreach table_name_value in array array[
    'outreach_prospects', 'outreach_contact_candidates', 'outreach_consents',
    'outreach_outbox', 'outreach_events', 'outreach_suppressions',
    'outreach_agent_runs', 'outreach_invitations', 'outreach_account_links',
    'outreach_provider_events', 'outreach_runtime_controls',
    'outreach_admin_events'
  ]::text[]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = table_name_value
        and relation.relrowsecurity
    ) then
      raise exception 'Expected RLS on public.%', table_name_value;
    end if;
    if pg_catalog.has_table_privilege(
      'anon', 'public.' || table_name_value, 'SELECT'
    ) or pg_catalog.has_table_privilege(
      'authenticated', 'public.' || table_name_value, 'SELECT'
    ) then
      raise exception 'Outreach table %.% is browser-readable', 'public', table_name_value;
    end if;
  end loop;

  if not exists (
    select 1 from public.ecosystem_release_controls
    where control_key = 'outreach_agent' and not enabled
  ) then
    raise exception 'Outreach database release control must default off';
  end if;
  if not exists (
    select 1 from public.outreach_runtime_controls
    where singleton and delivery_paused
  ) then
    raise exception 'Outreach delivery runtime control must default paused';
  end if;

  foreach function_name_value in array array[
    'prepare_outreach_invitation(uuid,text,timestamp with time zone,uuid)',
    'validate_outreach_invitation(text)',
    'redeem_outreach_invitation(text,uuid,uuid)',
    'record_verified_email_double_opt_in(uuid,jsonb,uuid,uuid)',
    'record_outreach_provider_event(uuid,jsonb,uuid)',
    'set_outreach_delivery_pause(boolean,text,uuid,uuid)',
    'admin_suppress_outreach_prospect(uuid,text,uuid,uuid)',
    'admin_privacy_delete_outreach_prospect(uuid,text,uuid,uuid)',
    'admin_retry_outreach_failure(uuid,text,uuid,uuid)'
  ]::text[]
  loop
    if pg_catalog.has_function_privilege(
      'anon', 'public.' || function_name_value, 'EXECUTE'
    ) or pg_catalog.has_function_privilege(
      'authenticated', 'public.' || function_name_value, 'EXECUTE'
    ) or not pg_catalog.has_function_privilege(
      'service_role', 'public.' || function_name_value, 'EXECUTE'
    ) then
      raise exception 'Unsafe execute privileges for public.%', function_name_value;
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.proname in ('force_send', 'force_outreach_send', 'bypass_consent')
  ) then
    raise exception 'A consent-bypass or force-send function exists';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'outreach_provider_events'
      and column_name in ('message_text', 'reply_text', 'reply_body')
  ) then
    raise exception 'Raw provider reply text must not be stored';
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.claim_outreach_outbox(integer)'::regprocedure
  ) into function_definition;
  if function_definition not like '%is_outreach_delivery_available%'
     or function_definition not like '%has_active_outreach_reply_authorization%'
  then
    raise exception 'Outbox claims do not enforce runtime pause and reply authorization';
  end if;

  insert into auth.users (id, email, raw_user_meta_data)
  values (
    test_profile_id, 'outreach-test@farmerbook.invalid',
    '{"full_name":"Outreach Test Participant"}'::jsonb
  );
  contact_hash_value := public.sha256_normalized_contact(
    'outreach-test@farmerbook.invalid'
  );
  insert into public.outreach_prospects (
    id, normalized_source_url, application_origin, source_type, source_hash,
    business_name, status, suggested_role, preferred_locale,
    introduction_draft, consent_channel, consent_granted_at,
    followup_requested, creation_idempotency_key, creation_fingerprint
  ) values (
    test_prospect_id, 'https://farmerbook.in/join', 'https://farmerbook.in',
    'inbound_form', repeat('a', 64), 'Executable test farm', 'introduced',
    'farmer', 'en-IN',
    'FarmerBook introduction. Create an account at https://farmerbook.in/signup. Reply STOP at any time.',
    'email', now(), true,
    '10000000-0000-4000-8000-000000000006', repeat('b', 64)
  );
  insert into public.outreach_contact_candidates (
    id, prospect_id, channel, private_value, value_hash, source_url,
    evidence_excerpt, evidence_origin, explicitly_for_business_enquiries,
    business_contact_confirmed, confirmed_at
  ) values (
    test_contact_id, test_prospect_id, 'email',
    'outreach-test@farmerbook.invalid', contact_hash_value,
    'https://farmerbook.in/join',
    'Contact supplied directly through the executable test.',
    'inbound_form', true, true, now()
  );
  insert into public.outreach_consents (
    id, prospect_id, contact_candidate_id, channel, purpose,
    statement_version, statement_text, capture_method, provider,
    provider_receipt_id, granted_at, expires_at, idempotency_key
  ) values (
    test_consent_id, test_prospect_id, test_contact_id, 'email',
    'farmerbook_introduction', 'test-2026-08-10.1',
    'I agree that FarmerBook may send one introduction through this test channel.',
    'verified_provider', 'test-provider', 'consent-receipt-1',
    now(), now() + interval '30 days',
    '10000000-0000-4000-8000-000000000007'
  );
  insert into public.outreach_outbox (
    id, prospect_id, contact_candidate_id, consent_id, channel, purpose,
    message_body, expires_at, idempotency_key
  ) values (
    test_outbox_id, test_prospect_id, test_contact_id, test_consent_id,
    'email', 'farmerbook_introduction',
    'FarmerBook introduction. Create an account at https://farmerbook.in/signup. Reply STOP at any time.',
    now() + interval '7 days',
    '10000000-0000-4000-8000-000000000008'
  );

  insert into public.outreach_prospects (
    id, normalized_source_url, application_origin, source_type, source_hash,
    business_name, status, suggested_role, preferred_locale,
    introduction_draft, consent_channel, followup_requested,
    creation_idempotency_key, creation_fingerprint
  ) values (
    email_prospect_id, 'https://farmerbook.in/join?email-test=1',
    'https://farmerbook.in', 'inbound_form', repeat('c', 64),
    'Email opt-in farm', 'consent_requested', 'farmer', 'en-IN',
    'A consented FarmerBook introduction for the atomic email opt-in test.',
    'email', true, '10000000-0000-4000-8000-000000000022', repeat('d', 64)
  );
  insert into public.outreach_contact_candidates (
    id, prospect_id, channel, private_value, value_hash, source_url,
    evidence_excerpt, evidence_origin, explicitly_for_business_enquiries,
    business_contact_confirmed, confirmed_at
  ) values (
    email_contact_id, email_prospect_id, 'email',
    'email-opt-in@farmerbook.invalid',
    public.sha256_normalized_contact('email-opt-in@farmerbook.invalid'),
    'https://farmerbook.in/join?email-test=1',
    'Contact supplied directly through the atomic email test.',
    'inbound_form', true, true, now()
  );

  update public.ecosystem_release_controls
  set enabled = true where control_key = 'outreach_agent';
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform public.record_verified_email_double_opt_in(
    email_prospect_id,
    jsonb_build_object(
      'contactCandidateId', email_contact_id,
      'contactHash', public.sha256_normalized_contact(
        'email-opt-in@farmerbook.invalid'
      ),
      'channel', 'email',
      'requestedPurposes', jsonb_build_array(
        'farmerbook_introduction', 'onboarding_followup'
      ),
      'statementVersion', 'email-test-2026-08-10.1',
      'statementText',
        'I confirm FarmerBook email introduction and requested follow-up consent.',
      'captureMethod', 'double_opt_in',
      'provider', 'postmark',
      'providerReceiptId', repeat('e', 64),
      'grantedAt', now(),
      'expiresAt', now() + interval '180 days'
    ),
    '10000000-0000-4000-8000-000000000023',
    '10000000-0000-4000-8000-000000000024'
  );
  if (select count(*) from public.outreach_consents
      where prospect_id = email_prospect_id) <> 2
    or (select count(*) from public.outreach_outbox
        where prospect_id = email_prospect_id
          and purpose = 'farmerbook_introduction') <> 1
  then
    raise exception 'Atomic email double opt-in did not record both purposes';
  end if;
  update public.outreach_outbox
  set not_before = now() + interval '1 day'
  where prospect_id = email_prospect_id;
  select count(*) into claimed_count
  from public.claim_outreach_outbox(10);
  if claimed_count <> 0 then
    raise exception 'Paused delivery claimed % outbox rows', claimed_count;
  end if;

  update public.outreach_runtime_controls
  set delivery_paused = false, pause_reason = 'Executable database test.'
  where singleton;
  select count(*) into claimed_count
  from public.claim_outreach_outbox(10);
  if claimed_count <> 1 then
    raise exception 'Available delivery should claim exactly one row, got %', claimed_count;
  end if;

  select prepared.code into result_code
  from public.prepare_outreach_invitation(
    test_outbox_id, invitation_token, now() + interval '14 days',
    '10000000-0000-4000-8000-000000000009'
  ) prepared;
  if result_code <> 'INVITATION_PREPARED'
    or not exists (
      select 1 from public.outreach_invitations invitation
      where invitation.prospect_id = test_prospect_id
        and invitation.token_hash = encode(
          extensions.digest(invitation_token, 'sha256'), 'hex'
        )
    )
    or not exists (
      select 1 from public.outreach_outbox outbox
      where outbox.id = test_outbox_id and outbox.message_body like '%/invite/%'
    )
  then
    raise exception 'Signed invitation preparation failed';
  end if;

  select redeemed.code, redeemed.prospect_status
    into result_code, prospect_status_value
  from public.redeem_outreach_invitation(
    encode(extensions.digest(invitation_token, 'sha256'), 'hex'),
    test_profile_id,
    '10000000-0000-4000-8000-000000000010'
  ) redeemed;
  if result_code <> 'INVITATION_REDEEMED'
    or prospect_status_value <> 'onboarding'
    or not exists (
      select 1 from public.outreach_account_links link
      where link.prospect_id = test_prospect_id
        and link.profile_id = test_profile_id
    )
  then
    raise exception 'Invitation redemption did not link onboarding';
  end if;

  update public.profiles set onboarding_complete = true
  where id = test_profile_id;
  if not exists (
    select 1 from public.outreach_prospects prospect
    join public.outreach_account_links link on link.prospect_id = prospect.id
    where prospect.id = test_prospect_id
      and prospect.status = 'joined'
      and link.joined_at is not null
  ) then
    raise exception 'Profile completion did not mark the prospect joined';
  end if;

  select provider_event.code, provider_event.prospect_status,
    provider_event.response_outbox_id
    into result_code, prospect_status_value, response_outbox_id_value
  from public.record_outreach_provider_event(
    test_prospect_id,
    jsonb_build_object(
      'contactCandidateId', test_contact_id,
      'contactHash', contact_hash_value,
      'channel', 'email',
      'eventType', 'reply',
      'occurredAt', now(),
      'provider', 'test-provider',
      'providerEventId', 'question-1',
      'replyIntent', 'onboarding_question',
      'questionCode', 'cost',
      'responseRequested', true
    ),
    '10000000-0000-4000-8000-000000000011'
  ) provider_event;
  if result_code <> 'EVENT_RECORDED'
    or response_outbox_id_value is null
    or not exists (
      select 1 from public.outreach_outbox outbox
      where outbox.id = response_outbox_id_value
        and outbox.purpose = 'onboarding_reply'
        and outbox.consent_id is null
        and outbox.inbound_provider_event_id is not null
    )
  then
    raise exception 'Verified onboarding question did not create one bounded reply';
  end if;

  select provider_event.code, provider_event.prospect_status
    into result_code, prospect_status_value
  from public.record_outreach_provider_event(
    test_prospect_id,
    jsonb_build_object(
      'contactCandidateId', test_contact_id,
      'contactHash', contact_hash_value,
      'channel', 'email',
      'eventType', 'reply',
      'occurredAt', now(),
      'provider', 'test-provider',
      'providerEventId', 'stop-1',
      'replyIntent', 'stop',
      'questionCode', null,
      'responseRequested', false
    ),
    '10000000-0000-4000-8000-000000000012'
  ) provider_event;
  if result_code <> 'EVENT_RECORDED'
    or prospect_status_value <> 'withdrawn'
    or not exists (
      select 1 from public.outreach_suppressions suppression
      where suppression.value_hash = contact_hash_value
    )
    or exists (
      select 1 from public.outreach_outbox outbox
      where outbox.prospect_id = test_prospect_id
        and outbox.state in ('pending', 'processing')
    )
    or exists (
      select 1 from public.outreach_consents consent
      where consent.prospect_id = test_prospect_id
        and consent.withdrawn_at is null
    )
  then
    raise exception 'STOP did not atomically withdraw, suppress and cancel';
  end if;
end;
$$;

select extensions.pass(
  'consent, invitation, reply and operational outreach contracts hold'
);
select * from extensions.finish();

rollback;
