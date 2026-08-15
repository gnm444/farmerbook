begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  owner_a constant uuid := '41000000-0000-4000-8000-000000000001';
  owner_b constant uuid := '42000000-0000-4000-8000-000000000002';
  table_name_value text;
  function_signature text;
  result_code text;
  run_id_value uuid;
  replay_run_id uuid;
  channel_id_value uuid;
  saved_count_value integer;
  revision_value integer;
  profile_id_value uuid;
  event_id_value uuid;
  expired_channel_id uuid;
  deleted_count_value integer;
  prior_contact_count bigint;
  prior_outreach_count bigint;
begin
  foreach table_name_value in array array[
    'farmer_source_channels',
    'farmer_source_videos',
    'farmer_source_discovery_runs',
    'sourced_farmer_profiles',
    'sourced_farmer_facts',
    'farmer_source_events'
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
    ) or not pg_catalog.has_table_privilege(
      'service_role', format('public.%I', table_name_value), 'SELECT'
    ) or pg_catalog.has_table_privilege(
      'service_role', format('public.%I', table_name_value),
      'INSERT,UPDATE,DELETE'
    ) then
      raise exception 'Unsafe table grants for public.%', table_name_value;
    end if;
  end loop;

  foreach function_signature in array array[
    'public.reserve_sourced_farmer_discovery(uuid,text,uuid)',
    'public.save_sourced_farmer_discovery_batch(uuid,uuid,jsonb,uuid)',
    'public.complete_sourced_farmer_discovery(uuid,uuid,jsonb,uuid)',
    'public.create_sourced_farmer_profile(uuid,jsonb,uuid)',
    'public.review_sourced_farmer_profile(uuid,uuid,text,integer,uuid)',
    'public.archive_sourced_farmer_profile(uuid,uuid,text,integer,uuid)',
    'public.purge_expired_farmer_source_data(uuid,integer,uuid)'
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

  if public.is_ecosystem_release_enabled('sourced_farmer_research') then
    raise exception 'Sourced Farmer research must default off';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'farmer_source_channels', 'farmer_source_videos',
        'farmer_source_discovery_runs', 'sourced_farmer_profiles',
        'sourced_farmer_facts', 'farmer_source_events'
      )
      and column_name in (
        'email', 'phone', 'whatsapp', 'contact', 'contact_id',
        'member_profile_id', 'outreach_prospect_id', 'message_id', 'outbox_id',
        'publication_id', 'verification_status', 'raw_response', 'description',
        'title', 'username', 'handle'
      )
  ) then
    raise exception 'Sourced Farmer schema contains a forbidden column';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('farmer_source_channels', 'farmer_source_videos')
      and column_name in ('display_name', 'district', 'state_name', 'summary')
  ) then
    raise exception 'YouTube provenance contains person-level data';
  end if;

  select count(*) into prior_contact_count from public.farmer_contacts;
  select count(*) into prior_outreach_count from public.outreach_prospects;

  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values
    (
      owner_a, 'sourced-farmer-owner-a@farmerbook.invalid',
      '{"full_name":"Sourced Farmer Owner A"}'::jsonb,
      '{"role":"admin"}'::jsonb
    ),
    (
      owner_b, 'sourced-farmer-owner-b@farmerbook.invalid',
      '{"full_name":"Sourced Farmer Owner B"}'::jsonb,
      '{"role":"admin"}'::jsonb
    );
  update public.profiles set status = 'active' where id in (owner_a, owner_b);
  update public.ecosystem_release_controls
  set enabled = true where control_key = 'sourced_farmer_research';
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);

  select reserved.code, reserved.run_id, reserved.revision
  into result_code, run_id_value, revision_value
  from public.reserve_sourced_farmer_discovery(
    owner_a, repeat('a', 64), '41000000-0000-4000-8000-000000000010'
  ) reserved;
  if result_code <> 'RESERVED' or run_id_value is null or revision_value <> 0 then
    raise exception 'Discovery reservation failed';
  end if;
  select reserved.code, reserved.run_id
  into result_code, replay_run_id
  from public.reserve_sourced_farmer_discovery(
    owner_a, repeat('a', 64), '41000000-0000-4000-8000-000000000010'
  ) reserved;
  if result_code <> 'IDEMPOTENT_REPLAY' or replay_run_id <> run_id_value then
    raise exception 'Reservation idempotency failed';
  end if;

  select saved.code, saved.channel_id, saved.saved_count, saved.revision
  into result_code, channel_id_value, saved_count_value, revision_value
  from public.save_sourced_farmer_discovery_batch(
    owner_a,
    run_id_value,
    jsonb_build_object(
      'providerChannelId', 'UCabcdefghijk',
      'channelUrl', 'https://www.youtube.com/channel/UCabcdefghijk',
      'channelFingerprint', repeat('b', 64),
      'collectedAt', to_jsonb(now()),
      'refreshDueAt', to_jsonb(now() + interval '10 days'),
      'retentionExpiresAt', to_jsonb(now() + interval '20 days'),
      'topicSlugs', jsonb_build_array('paddy'),
      'actorCounts', jsonb_build_object(
        'farmer', 1, 'organization', 0, 'official', 0,
        'scientist', 0, 'trader', 0
      ),
      'nextCheckpoint', 'opaque-page-two',
      'pageNumber', 1,
      'videos', jsonb_build_array(jsonb_build_object(
        'providerVideoId', 'abcDEF_123-',
        'videoUrl', 'https://www.youtube.com/watch?v=abcDEF_123-',
        'publishedAt', to_jsonb(now() - interval '1 day'),
        'topicSlugs', jsonb_build_array('paddy'),
        'actorCounts', jsonb_build_object(
          'farmer', 1, 'organization', 0, 'official', 0,
          'scientist', 0, 'trader', 0
        ),
        'contentFingerprint', repeat('c', 64),
        'collectedAt', to_jsonb(now()),
        'refreshDueAt', to_jsonb(now() + interval '10 days'),
        'retentionExpiresAt', to_jsonb(now() + interval '20 days')
      ))
    ),
    '41000000-0000-4000-8000-000000000011'
  ) saved;
  if result_code <> 'BATCH_SAVED' or channel_id_value is null
    or saved_count_value <> 1 or revision_value <> 1
  then
    raise exception 'Anonymous discovery batch save failed';
  end if;

  begin
    perform public.save_sourced_farmer_discovery_batch(
      owner_b,
      run_id_value,
      jsonb_build_object(
        'providerChannelId', 'UCabcdefghijk',
        'channelUrl', 'https://www.youtube.com/channel/UCabcdefghijk',
        'channelFingerprint', repeat('b', 64),
        'collectedAt', to_jsonb(now()),
        'refreshDueAt', to_jsonb(now() + interval '10 days'),
        'retentionExpiresAt', to_jsonb(now() + interval '20 days'),
        'topicSlugs', jsonb_build_array('paddy'),
        'actorCounts', jsonb_build_object(
          'farmer', 1, 'organization', 0, 'official', 0,
          'scientist', 0, 'trader', 0
        ),
        'nextCheckpoint', null,
        'pageNumber', 1,
        'videos', '[]'::jsonb
      ),
      '41000000-0000-4000-8000-000000000012'
    );
    raise exception 'Cross-owner batch save unexpectedly succeeded';
  exception when no_data_found then null;
  end;

  select completed.code, completed.revision
  into result_code, revision_value
  from public.complete_sourced_farmer_discovery(
    owner_a, run_id_value,
    '{"state":"succeeded","failureCode":null}'::jsonb,
    '41000000-0000-4000-8000-000000000013'
  ) completed;
  if result_code <> 'SUCCEEDED' or revision_value <> 2 then
    raise exception 'Discovery completion failed';
  end if;

  select created.code, created.profile_id, created.revision
  into result_code, profile_id_value, revision_value
  from public.create_sourced_farmer_profile(
    owner_a,
    jsonb_build_object(
      'displayName', 'Asha Fictional',
      'district', 'Example District',
      'state', 'Example State',
      'summary', 'A fictional professional Farmer profile for database tests.',
      'topicSlugs', jsonb_build_array('paddy'),
      'evidenceBasis', 'independent_public_source',
      'evidenceUrl', 'https://research.example/farmers/asha-fictional',
      'consentReference', null,
      'evidenceHash', repeat('d', 64),
      'duplicateFingerprint', repeat('e', 64),
      'operatorAttested', true,
      'retentionExpiresAt', null,
      'facts', jsonb_build_array(jsonb_build_object(
        'factType', 'professional_role',
        'factValue', 'Paddy grower',
        'sourceUrl', 'https://research.example/farmers/asha-fictional',
        'evidenceExcerpt', 'Fictional source evidence for a professional role.',
        'evidenceHash', repeat('f', 64),
        'factFingerprint', repeat('1', 64),
        'idempotencyKey', '41000000-0000-4000-8000-000000000014'
      ))
    ),
    '41000000-0000-4000-8000-000000000015'
  ) created;
  if result_code <> 'PROFILE_CREATED' or profile_id_value is null
    or revision_value <> 0
  then
    raise exception 'Independent-evidence profile creation failed';
  end if;

  begin
    perform public.create_sourced_farmer_profile(
      owner_a,
      jsonb_build_object(
        'displayName', 'YouTube Identity', 'district', null, 'state', null,
        'summary', 'This fictional profile must fail because YouTube is evidence.',
        'topicSlugs', jsonb_build_array('paddy'),
        'evidenceBasis', 'independent_public_source',
        'evidenceUrl', 'https://www.youtube.com/watch?v=abcDEF_123-',
        'consentReference', null, 'evidenceHash', repeat('2', 64),
        'duplicateFingerprint', repeat('3', 64), 'operatorAttested', true,
        'retentionExpiresAt', null,
        'facts', jsonb_build_array(jsonb_build_object(
          'factType', 'professional_role', 'factValue', 'Grower',
          'sourceUrl', 'https://www.youtube.com/watch?v=abcDEF_123-',
          'evidenceExcerpt', 'A fictional YouTube evidence excerpt.',
          'evidenceHash', repeat('4', 64), 'factFingerprint', repeat('5', 64),
          'idempotencyKey', '41000000-0000-4000-8000-000000000016'
        ))
      ),
      '41000000-0000-4000-8000-000000000017'
    );
    raise exception 'YouTube identity evidence unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.create_sourced_farmer_profile(
      owner_a,
      jsonb_build_object(
        'displayName', 'Contact Fictional', 'district', null, 'state', null,
        'summary', 'A fictional profile with forbidden phone 9876543210 inside.',
        'topicSlugs', jsonb_build_array('paddy'),
        'evidenceBasis', 'documented_subject_consent', 'evidenceUrl', null,
        'consentReference', 'documented-reference-only',
        'evidenceHash', repeat('6', 64), 'duplicateFingerprint', repeat('7', 64),
        'operatorAttested', true, 'retentionExpiresAt', null,
        'facts', jsonb_build_array(jsonb_build_object(
          'factType', 'professional_role', 'factValue', 'Grower',
          'sourceUrl', null, 'evidenceExcerpt', 'Fictional documented evidence.',
          'evidenceHash', repeat('8', 64), 'factFingerprint', repeat('9', 64),
          'idempotencyKey', '41000000-0000-4000-8000-000000000018'
        ))
      ),
      '41000000-0000-4000-8000-000000000019'
    );
    raise exception 'Contact-like profile text unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.review_sourced_farmer_profile(
      owner_b, profile_id_value, 'approved', 0,
      '41000000-0000-4000-8000-000000000020'
    );
    raise exception 'Cross-owner review unexpectedly succeeded';
  exception when no_data_found then null;
  end;
  select reviewed.code, reviewed.revision
  into result_code, revision_value
  from public.review_sourced_farmer_profile(
    owner_a, profile_id_value, 'approved', 0,
    '41000000-0000-4000-8000-000000000021'
  ) reviewed;
  if result_code <> 'PROFILE_APPROVED' or revision_value <> 1 then
    raise exception 'Profile review failed';
  end if;
  begin
    perform public.archive_sourced_farmer_profile(
      owner_a, profile_id_value, 'Fictional stale revision archive.', 0,
      '41000000-0000-4000-8000-000000000022'
    );
    raise exception 'Stale profile revision unexpectedly succeeded';
  exception when serialization_failure then null;
  end;

  select id into event_id_value
  from public.farmer_source_events
  where owner_id = owner_a and event_type = 'profile_created'
  limit 1;
  begin
    update public.farmer_source_events
    set item_count = 99 where id = event_id_value;
    raise exception 'Immutable event mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  insert into public.farmer_source_channels (
    owner_id, provider_channel_id, channel_url, topic_slugs, actor_counts,
    source_fingerprint, collected_at, refresh_due_at, retention_expires_at
  ) values (
    owner_a, 'UCexpiredxyz',
    'https://www.youtube.com/channel/UCexpiredxyz', array['paddy'],
    '{"farmer":1,"organization":0,"official":0,"scientist":0,"trader":0}'::jsonb,
    repeat('0', 64), now() - interval '25 days', now() - interval '10 days',
    now() - interval '1 day'
  ) returning id into expired_channel_id;
  select purged.code, purged.event_id, purged.deleted_count
  into result_code, event_id_value, deleted_count_value
  from public.purge_expired_farmer_source_data(
    owner_a, 100, '41000000-0000-4000-8000-000000000023'
  ) purged;
  if result_code <> 'SOURCE_DATA_PURGED' or event_id_value is null
    or deleted_count_value < 1
    or exists (
      select 1 from public.farmer_source_channels
      where id = expired_channel_id and owner_id = owner_a
    )
  then
    raise exception 'Expiry purge did not delete actual source data';
  end if;

  if (select count(*) from public.farmer_contacts) <> prior_contact_count
    or (select count(*) from public.outreach_prospects) <> prior_outreach_count
  then
    raise exception 'Sourced Farmer research crossed into contact/outreach data';
  end if;
end;
$$;

select extensions.pass(
  'Sourced Farmer research access, ownership, evidence, audit and expiry boundaries hold'
);
select * from extensions.finish();

rollback;
