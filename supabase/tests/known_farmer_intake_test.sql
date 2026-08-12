begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  table_name_value text;
  definition text;
begin
  foreach table_name_value in array array[
    'known_farmer_intakes',
    'known_farmer_source_candidates',
    'known_farmer_youtube_searches'
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
      'anon', format('public.%I', table_name_value), 'SELECT,INSERT,UPDATE,DELETE'
    ) or pg_catalog.has_table_privilege(
      'authenticated', format('public.%I', table_name_value),
      'SELECT,INSERT,UPDATE,DELETE'
    ) then
      raise exception 'Browser table access is unsafe on public.%', table_name_value;
    end if;
  end loop;

  if not pg_catalog.has_function_privilege(
    'authenticated', 'public.create_known_farmer_intake(jsonb,uuid)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.reserve_known_farmer_youtube_search(uuid,text,uuid)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.complete_known_farmer_youtube_search(uuid,jsonb)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.decide_known_farmer_source_candidate(uuid,uuid,text,text,integer,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Administrator-facing Known Farmer RPC grants are missing';
  end if;

  if pg_catalog.has_function_privilege(
    'anon', 'public.create_known_farmer_intake(jsonb,uuid)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.save_known_farmer_source_candidates(uuid,jsonb)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.link_known_farmer_intake_sample(uuid,uuid,uuid,uuid)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.apply_known_farmer_sample_source_provenance(uuid,uuid)', 'EXECUTE'
  ) then
    raise exception 'Known Farmer RPC privilege separation is unsafe';
  end if;

  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.save_known_farmer_source_candidates(uuid,jsonb)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role',
    'public.link_known_farmer_intake_sample(uuid,uuid,uuid,uuid)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role',
    'public.apply_known_farmer_sample_source_provenance(uuid,uuid)', 'EXECUTE'
  ) then
    raise exception 'Known Farmer service-role RPC grants are missing';
  end if;

  select lower(pg_catalog.pg_get_functiondef(
    'public.reserve_known_farmer_youtube_search(uuid,text,uuid)'::regprocedure
  )) into definition;
  if definition not like '%is_admin()%'
    or definition not like '%is_ecosystem_release_enabled(''outreach_agent'')%'
    or definition not like '%is_ecosystem_release_enabled(''profile_research_agents'')%'
    or definition not like '%pg_advisory_xact_lock%'
    or definition not like '%count(*) >= 50%'
    or definition not like '%count(*) >= 10%'
    or definition not like '%count(*) >= 100%'
  then
    raise exception 'YouTube quota reservation gates are incomplete';
  end if;

  if not public.is_supported_owned_social_profile_url(
    'youtube', 'https://www.youtube.com/channel/UC1234'
  ) or public.is_supported_owned_social_profile_url(
    'youtube', 'https://www.youtube.com/watch?v=ABC123'
  ) or not public.is_supported_owned_social_profile_url(
    'linkedin', 'https://www.linkedin.com/in/anita-patil'
  ) or public.is_supported_owned_social_profile_url(
    'instagram', 'https://www.instagram.com/reel/ABC123/'
  ) then
    raise exception 'Owned social profile URL policy is unsafe';
  end if;
end;
$$;

select extensions.pass(
  'Known Farmer private tables, RPC grants, quota gates and owned-link policy hold'
);
select * from extensions.finish();

rollback;
