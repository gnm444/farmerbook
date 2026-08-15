begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  table_name_value text;
  function_signature text;
  owner_profile_id constant uuid := '30000000-0000-4000-8000-000000000001';
  list_id_value constant uuid := '30000000-0000-4000-8000-000000000002';
  contact_id_value constant uuid := '30000000-0000-4000-8000-000000000003';
  result_code text;
  created_prospect_id uuid;
  created_outbox_id uuid;
  search_id_value uuid;
  immutable_event_id uuid;
begin
  foreach table_name_value in array array[
    'farmer_contact_lists',
    'farmer_contacts',
    'farmer_contact_events',
    'farmer_youtube_discovery_runs'
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

  foreach function_signature in array array[
    'public.activate_private_farmer_contact_consent(uuid,text,timestamptz,timestamptz,uuid)',
    'public.update_private_farmer_contact_state(uuid,uuid,text,text,uuid)',
    'public.prepare_private_farmer_contact_email(uuid,uuid,text,text,text,text,uuid)',
    'public.reserve_private_farmer_youtube_search(uuid,text,text,uuid)',
    'public.complete_private_farmer_youtube_search(uuid,uuid,integer,text)'
  ]::text[]
  loop
    if pg_catalog.has_function_privilege(
      'anon', function_signature, 'EXECUTE'
    ) or pg_catalog.has_function_privilege(
      'authenticated', function_signature, 'EXECUTE'
    ) or not pg_catalog.has_function_privilege(
      'service_role', function_signature, 'EXECUTE'
    ) then
      raise exception 'Unsafe RPC grants for %', function_signature;
    end if;
  end loop;

  if public.is_ecosystem_release_enabled('private_farmer_contacts') then
    raise exception 'Private Farmer contacts must default off';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'farmer_contacts'
      and column_name in ('email', 'phone', 'display_name')
  ) then
    raise exception 'Private Farmer contacts expose plaintext columns';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'farmer_youtube_discovery_runs'
      and column_name in (
        'channel_id', 'channel_title', 'channel_url', 'description',
        'email', 'phone', 'result_items', 'response_body'
      )
  ) then
    raise exception 'YouTube discovery persists result or contact data';
  end if;

  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values (
    owner_profile_id, 'private-farmer-owner@farmerbook.invalid',
    '{"full_name":"Private Farmer Owner"}'::jsonb,
    '{"role":"admin"}'::jsonb
  );
  update public.profiles
  set status = 'active'
  where id = owner_profile_id;

  update public.ecosystem_release_controls
  set enabled = true
  where control_key in ('private_farmer_contacts', 'outreach_agent');
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);

  insert into public.farmer_contact_lists (
    id, owner_id, name, purpose, creation_idempotency_key
  ) values (
    list_id_value, owner_profile_id, 'Executable private list',
    'farmerbook_invitation', '30000000-0000-4000-8000-000000000004'
  );
  insert into public.farmer_contacts (
    id, list_id, owner_id, display_name_ciphertext,
    email_ciphertext, email_hash, acquisition_source, source_reference,
    state, district, preferred_locale, source_attested, consent_channel,
    consent_state, consent_text_version, consent_recorded_at,
    consent_expires_at, channel_confirmed_at,
    channel_confirmation_reference, review_state,
    creation_idempotency_key
  ) values (
    contact_id_value, list_id_value, owner_profile_id, repeat('n', 32),
    repeat('e', 32), repeat('a', 64), 'manual_consent_import',
    'Consent record supplied for the executable database test.',
    'Andhra Pradesh', 'Srikakulam', 'en-IN', true, 'email',
    'active', 'private-test-2026-08-13.1', now() - interval '1 day',
    now() + interval '180 days', now() - interval '1 day',
    'confirmed-private-test-reference', 'approved',
    '30000000-0000-4000-8000-000000000005'
  );
  insert into public.farmer_contact_events (
    contact_id, owner_id, event_type, details, idempotency_key
  ) values (
    contact_id_value, owner_profile_id, 'contact_created',
    '{"source":"executable-test"}'::jsonb,
    '30000000-0000-4000-8000-000000000006'
  ) returning id into immutable_event_id;

  begin
    update public.farmer_contact_events
    set details = '{"tampered":true}'::jsonb
    where id = immutable_event_id;
    raise exception 'Private contact event mutation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  select prepared.code, prepared.prospect_id, prepared.outbox_id
  into result_code, created_prospect_id, created_outbox_id
  from public.prepare_private_farmer_contact_email(
    contact_id_value, owner_profile_id,
    'private-farmer@farmerbook.invalid', repeat('a', 64),
    'https://farmerbook.in',
    'Join FarmerBook for trusted profiles, community sharing, and direct agriculture marketplace discovery. Reply STOP to withdraw.',
    '30000000-0000-4000-8000-000000000007'
  ) prepared;
  if result_code <> 'EMAIL_PREPARED'
    or created_prospect_id is null
    or created_outbox_id is null
    or not exists (
      select 1 from public.outreach_outbox outbox
      where outbox.id = created_outbox_id
        and outbox.channel = 'email'
        and outbox.state = 'pending'
    )
  then
    raise exception 'Consent-gated email handoff was not prepared';
  end if;
  if exists (
    select 1 from public.outreach_outbox outbox
    where outbox.id = created_outbox_id and outbox.channel <> 'email'
  ) then
    raise exception 'A non-email private contact delivery was created';
  end if;

  perform public.withdraw_outreach_consent(
    created_prospect_id,
    'Executable signed-unsubscribe equivalent.',
    '30000000-0000-4000-8000-000000000010'
  );
  if not exists (
    select 1 from public.farmer_contacts contact
    where contact.id = contact_id_value
      and contact.consent_state = 'withdrawn'
      and contact.suppression_state = 'withdrawn'
  ) or not exists (
    select 1 from public.farmer_contact_events event
    where event.contact_id = contact_id_value
      and event.event_type = 'consent_withdrawn'
  ) then
    raise exception 'Outreach withdrawal did not suppress the private contact';
  end if;

  select reserved.search_id into search_id_value
  from public.reserve_private_farmer_youtube_search(
    owner_profile_id, repeat('b', 64), 'en-IN',
    '30000000-0000-4000-8000-000000000008'
  ) reserved;
  perform public.complete_private_farmer_youtube_search(
    search_id_value, owner_profile_id, 3, null
  );
  if not exists (
    select 1 from public.farmer_youtube_discovery_runs run
    where run.id = search_id_value
      and run.state = 'succeeded'
      and run.result_count = 3
      and run.query_hash = repeat('b', 64)
  ) then
    raise exception 'YouTube discovery metadata lifecycle failed';
  end if;
  if exists (
    select 1 from public.farmer_contacts contact
    where contact.acquisition_source::text like '%youtube%'
  ) then
    raise exception 'YouTube discovery was promoted into the contact database';
  end if;

  perform public.update_private_farmer_contact_state(
    contact_id_value, owner_profile_id, 'privacy_delete',
    'Executable privacy erasure request.',
    '30000000-0000-4000-8000-000000000009'
  );
  if not exists (
    select 1 from public.farmer_contacts contact
    where contact.id = contact_id_value
      and contact.privacy_deleted_at is not null
      and contact.email_ciphertext is null
      and contact.email_hash is null
      and contact.suppression_state = 'privacy_deleted'
  ) then
    raise exception 'Privacy deletion did not erase contact values';
  end if;
end;
$$;

select extensions.pass(
  'Private Farmer data, consented email handoff and transient YouTube boundaries hold'
);
select * from extensions.finish();

rollback;
