begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

select extensions.has_table(
  'public', 'outreach_dispatch_checks',
  'final outreach dispatch decisions have a private ledger'
);
select extensions.has_function(
  'public', 'authorize_outreach_dispatch', array['uuid'],
  'a final dispatch authorization RPC exists'
);
select extensions.ok(
  not pg_catalog.has_function_privilege(
    'anon', 'public.authorize_outreach_dispatch(uuid)', 'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated', 'public.authorize_outreach_dispatch(uuid)', 'EXECUTE'
  )
  and pg_catalog.has_function_privilege(
    'service_role', 'public.authorize_outreach_dispatch(uuid)', 'EXECUTE'
  )
  and not pg_catalog.has_table_privilege(
    'service_role', 'public.outreach_dispatch_checks', 'SELECT'
  ),
  'the final authority is service-only and its ledger has no direct API access'
);

do $$
declare
  prospect_id_value uuid := '22000000-0000-4000-8000-000000000001';
  contact_id_value uuid := '22000000-0000-4000-8000-000000000002';
  consent_id_value uuid := '22000000-0000-4000-8000-000000000003';
  outbox_id_value uuid := '22000000-0000-4000-8000-000000000004';
  contact_hash_value text;
  decision_code text;
  decision_authorized boolean;
  claimed_count integer;
begin
  contact_hash_value := public.sha256_normalized_contact(
    'autonomous-dispatch@farmerbook.invalid'
  );
  insert into public.outreach_prospects (
    id, normalized_source_url, application_origin, source_type, source_hash,
    business_name, status, suggested_role, preferred_locale,
    introduction_draft, consent_channel, consent_granted_at,
    followup_requested, creation_idempotency_key, creation_fingerprint
  ) values (
    prospect_id_value, 'https://farmerbook.in/join?dispatch-test=1',
    'https://farmerbook.in', 'inbound_form', repeat('a', 64),
    'Autonomous dispatch test farm', 'consented', 'farmer', 'en-IN',
    'A consented FarmerBook introduction used only inside a rolled-back database test.',
    'email', now(), false,
    '22000000-0000-4000-8000-000000000005', repeat('b', 64)
  );
  insert into public.outreach_contact_candidates (
    id, prospect_id, channel, private_value, value_hash, source_url,
    evidence_excerpt, evidence_origin, explicitly_for_business_enquiries,
    business_contact_confirmed, confirmed_at
  ) values (
    contact_id_value, prospect_id_value, 'email',
    'autonomous-dispatch@farmerbook.invalid', contact_hash_value,
    'https://farmerbook.in/join?dispatch-test=1',
    'Address supplied directly for a rolled-back database authorization test.',
    'inbound_form', true, true, now()
  );
  insert into public.outreach_consents (
    id, prospect_id, contact_candidate_id, channel, purpose,
    statement_version, statement_text, capture_method, provider,
    provider_receipt_id, granted_at, expires_at, idempotency_key
  ) values (
    consent_id_value, prospect_id_value, contact_id_value, 'email',
    'farmerbook_introduction', 'dispatch-test-2026-08-22.1',
    'I agree that FarmerBook may send one introduction for this database test.',
    'verified_provider', 'test-provider', 'dispatch-consent-receipt',
    now(), now() + interval '30 days',
    '22000000-0000-4000-8000-000000000006'
  );
  insert into public.outreach_outbox (
    id, prospect_id, contact_candidate_id, consent_id, channel, purpose,
    message_body, expires_at, idempotency_key
  ) values (
    outbox_id_value, prospect_id_value, contact_id_value, consent_id_value,
    'email', 'farmerbook_introduction',
    'A consented FarmerBook introduction used only inside a rolled-back database test.',
    now() + interval '7 days',
    '22000000-0000-4000-8000-000000000007'
  );

  update public.ecosystem_release_controls
  set enabled = true where control_key = 'outreach_agent';
  update public.outreach_runtime_controls
  set delivery_paused = false, pause_reason = 'Autonomous dispatch test.',
    daily_delivery_limit = 1
  where singleton;
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);

  -- Consume today's only slot with redacted synthetic evidence, then prove the
  -- real row is deferred before any provider boundary.
  insert into public.outreach_dispatch_checks (
    prospect_id, attempt_number, channel, purpose, authorized,
    decision_code, india_day
  ) values (
    prospect_id_value, 1, 'email', 'farmerbook_introduction', true,
    'DISPATCH_AUTHORIZED', (now() at time zone 'Asia/Kolkata')::date
  );
  select count(*) into claimed_count from public.claim_outreach_outbox(1);
  if claimed_count <> 1 then
    raise exception 'Expected one claimed row, got %', claimed_count;
  end if;
  select check_result.authorized, check_result.code
    into decision_authorized, decision_code
  from public.authorize_outreach_dispatch(outbox_id_value) check_result;
  if decision_authorized or decision_code <> 'DAILY_DELIVERY_LIMIT_REACHED'
    or not exists (
      select 1 from public.outreach_outbox outbox
      where outbox.id = outbox_id_value and outbox.state = 'pending'
        and outbox.not_before > now()
    )
  then
    raise exception 'Daily reservation ceiling did not defer the row';
  end if;

  -- A larger ceiling permits one exact authorization. A system stop then
  -- persistently pauses delivery and safely returns the claimed row to pending.
  update public.outreach_runtime_controls set daily_delivery_limit = 2
  where singleton;
  update public.outreach_outbox set not_before = now()
  where id = outbox_id_value;
  perform public.claim_outreach_outbox(1);
  select check_result.authorized, check_result.code
    into decision_authorized, decision_code
  from public.authorize_outreach_dispatch(outbox_id_value) check_result;
  if not decision_authorized or decision_code <> 'DISPATCH_AUTHORIZED' then
    raise exception 'Active consent was not authorized immediately before dispatch';
  end if;
  perform public.pause_outreach_delivery_automatically(
    'POSTMARK_DELIVERY_UNKNOWN',
    '22000000-0000-4000-8000-000000000008'
  );
  if not exists (
    select 1 from public.outreach_runtime_controls control
    where control.singleton and control.delivery_paused
      and control.pause_reason like '%POSTMARK_DELIVERY_UNKNOWN%'
  ) or not exists (
    select 1 from public.outreach_outbox outbox
    where outbox.id = outbox_id_value and outbox.state = 'pending'
  ) then
    raise exception 'Automatic pause did not persist and safely release work';
  end if;

  -- A suppression arriving after claim wins the final check and cancels the
  -- row. No contact value or message body is copied into dispatch evidence.
  update public.outreach_runtime_controls
  set delivery_paused = false, pause_reason = 'Suppression race test.',
    daily_delivery_limit = 3
  where singleton;
  update public.outreach_outbox set not_before = now()
  where id = outbox_id_value;
  perform public.claim_outreach_outbox(1);
  insert into public.outreach_suppressions (value_hash, reason)
  values (contact_hash_value, 'withdrawn')
  on conflict (value_hash) do nothing;
  select check_result.authorized, check_result.code
    into decision_authorized, decision_code
  from public.authorize_outreach_dispatch(outbox_id_value) check_result;
  if decision_authorized or decision_code <> 'SUPPRESSED_BEFORE_DISPATCH'
    or not exists (
      select 1 from public.outreach_outbox outbox
      where outbox.id = outbox_id_value and outbox.state = 'cancelled'
    )
  then
    raise exception 'Final suppression check did not cancel dispatch';
  end if;

  begin
    update public.outreach_dispatch_checks
    set decision_code = 'MUTATED'
    where outbox_id = outbox_id_value;
    raise exception 'Dispatch evidence was mutable';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select extensions.pass(
  'daily deferral, final consent/suppression checks, automatic stop and immutable evidence work'
);
select * from extensions.finish();

rollback;
