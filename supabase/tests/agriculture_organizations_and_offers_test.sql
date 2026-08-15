-- Run after local migrations, for example with `supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  table_name_value text;
  function_definition text;
begin
  foreach table_name_value in array array[
    'agriculture_legacy_crop_backfill_audit',
    'ecosystem_release_controls',
    'organizations',
    'organization_memberships',
    'organization_membership_audit',
    'organization_category_affinities',
    'organization_service_areas',
    'organization_private_details',
    'organization_verification_requests',
    'certification_claims',
    'business_offers',
    'business_offer_categories',
    'business_offer_service_areas',
    'business_offer_media',
    'business_offer_enquiries',
    'business_offer_enquiry_events',
    'business_offer_enquiry_assignments'
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
  end loop;

  if exists (
    select 1 from public.ecosystem_release_controls where enabled
  ) or (
    select array_agg(control_key order by control_key)
    from public.ecosystem_release_controls
  ) <> array[
    'agri_businesses', 'business_offers', 'extended_locales',
    'featured_farmer_profiles', 'inc_sourcing', 'managed_operations_agents',
    'outreach_agent', 'private_farmer_contacts', 'profile_research_agents',
    'resumable_onboarding', 'sourced_farmer_research'
  ]::text[] then
    raise exception 'ecosystem release controls must match the disabled gate set';
  end if;
  if pg_catalog.has_table_privilege(
    'authenticated', 'public.ecosystem_release_controls', 'SELECT'
  ) or pg_catalog.has_table_privilege(
    'anon', 'public.ecosystem_release_controls', 'SELECT'
  ) then
    raise exception 'ecosystem release control rows must remain private';
  end if;

  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.set_organization_publication(uuid,text,timestamp with time zone)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must execute set_organization_publication';
  end if;
  if pg_catalog.has_function_privilege(
    'anon',
    'public.set_organization_publication(uuid,text,timestamp with time zone)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute set_organization_publication';
  end if;
  if not pg_catalog.has_function_privilege(
    'authenticated', 'public.finalize_onboarding(integer,uuid)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'anon', 'public.finalize_onboarding(integer,uuid)', 'EXECUTE'
  ) then
    raise exception 'finalize_onboarding execute privileges are invalid';
  end if;
  if not pg_catalog.has_function_privilege(
    'authenticated', 'public.complete_legacy_onboarding(jsonb)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'anon', 'public.complete_legacy_onboarding(jsonb)', 'EXECUTE'
  ) then
    raise exception 'complete_legacy_onboarding execute privileges are invalid';
  end if;

  if pg_catalog.has_column_privilege(
    'authenticated', 'public.profiles', 'account_role', 'UPDATE'
  ) or pg_catalog.has_column_privilege(
    'authenticated', 'public.profiles', 'participant_type', 'UPDATE'
  ) or pg_catalog.has_column_privilege(
    'authenticated', 'public.profiles', 'onboarding_complete', 'UPDATE'
  ) then
    raise exception 'restricted profile authorization columns remain browser writable';
  end if;
  if not pg_catalog.has_column_privilege(
    'authenticated', 'public.profiles', 'full_name', 'UPDATE'
  ) or not pg_catalog.has_column_privilege(
    'authenticated', 'public.profiles', 'preferred_locale', 'UPDATE'
  ) then
    raise exception 'safe profile settings are not browser writable';
  end if;

  if pg_catalog.has_table_privilege('anon', 'public.market_enquiries', 'INSERT')
     or exists (
       select 1 from pg_catalog.pg_policy policy
       join pg_catalog.pg_class relation on relation.oid = policy.polrelid
       join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
       where namespace.nspname = 'public'
         and relation.relname = 'market_enquiries'
         and policy.polcmd = 'a'
         and (
           select role.oid from pg_catalog.pg_roles role where role.rolname = 'anon'
         ) = any (policy.polroles)
         and lower(
           pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid)
         ) not like '%not is_ecosystem_release_enabled(''profile_research_agents''::text)%'
     )
  then
    raise exception 'anonymous produce enquiries require both revoked INSERT and a disabled-release policy gate';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'organization-verification'
      and not public
      and file_size_limit = 10485760
  ) or not exists (
    select 1 from storage.buckets
    where id = 'offer-images'
      and not public
      and file_size_limit = 5242880
  ) then
    raise exception 'private agriculture storage buckets are invalid';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class relation on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'storage'
      and relation.relname = 'objects'
      and (
        select role.oid from pg_catalog.pg_roles role where role.rolname = 'anon'
      ) = any (policy.polroles)
      and pg_catalog.pg_get_expr(policy.polqual, policy.polrelid) ~
        '(organization-verification|offer-images)'
  ) then
    raise exception 'private agriculture objects must not have an anon policy';
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.offer_requires_human_review(text,text[],boolean)'::regprocedure
  ) into function_definition;
  if function_definition not like '%certification-traceability%'
     or function_definition not like '%coalesce(caller_requires_review_input, false)%'
  then
    raise exception 'server high-risk offer rules are incomplete';
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.guard_organization_membership_change()'::regprocedure
  ) into function_definition;
  if function_definition not like '%pg_advisory_xact_lock%'
     or function_definition not like '%LAST_OWNER_REQUIRED%'
  then
    raise exception 'last-owner concurrency guard is incomplete';
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.validate_certification_claim_offer_owner()'::regprocedure
  ) into function_definition;
  if function_definition not like '%offer.organization_id = new.organization_id%'
  then
    raise exception 'certification claim same-organization guard is missing';
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.sync_organization_verification_state()'::regprocedure
  ) into function_definition;
  if function_definition not like '%approved%verified%'
     or function_definition not like '%rejected%rejected%'
  then
    raise exception 'organization verification lifecycle is incomplete';
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.review_organization_verification_request(uuid,text,text)'::regprocedure
  ) into function_definition;
  function_definition := lower(function_definition);
  if function_definition not like '%reviewed_by = actor_id%'
     or function_definition not like '%reviewed_at = now()%'
     or function_definition not like '%for update%'
  then
    raise exception 'organization verification review provenance is not server-owned';
  end if;
  if exists (
    select 1
    from information_schema.role_column_grants column_grant
    where column_grant.table_schema = 'public'
      and column_grant.table_name = 'organization_verification_requests'
      and column_grant.grantee in ('anon', 'authenticated')
      and column_grant.privilege_type = 'UPDATE'
      and column_grant.column_name in (
        'moderator_note', 'reviewed_by', 'reviewed_at'
      )
  ) then
    raise exception 'browser roles can write verification review provenance';
  end if;
  if has_function_privilege(
       'anon',
       'public.review_organization_verification_request(uuid,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.review_organization_verification_request(uuid,text,text)',
       'EXECUTE'
     )
  then
    raise exception 'organization verification review RPC grants are unsafe';
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.enforce_custom_category_pending_limit()'::regprocedure
  ) into function_definition;
  if function_definition not like '%source = ''onboarding_submission''%'
  then
    raise exception 'legacy imports would incorrectly consume the user pending quota';
  end if;
end;
$$;

select extensions.pass(
  'agriculture organization, offer and review security contracts hold'
);
select * from extensions.finish();

rollback;
