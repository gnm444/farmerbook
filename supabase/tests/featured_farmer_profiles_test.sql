begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  table_name_value text;
  definition text;
  professional_sources_required boolean;
begin
  foreach table_name_value in array array[
    'featured_farmer_research',
    'featured_farmer_sources',
    'featured_farmer_drafts',
    'featured_farmer_claims',
    'featured_farmer_claim_sources',
    'featured_farmer_social_links',
    'featured_farmer_media',
    'featured_farmer_publications',
    'featured_farmer_events',
    'featured_farmer_youtube_searches'
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
    'authenticated',
    'public.create_featured_farmer_research(jsonb,uuid)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.save_featured_farmer_draft(jsonb,uuid)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.publish_featured_farmer(uuid,integer,timestamptz,uuid)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    'public.remove_featured_farmer_social(uuid,text,integer,uuid)', 'EXECUTE'
  ) then
    raise exception 'Featured Farmer administrator RPC grants are missing';
  end if;

  if pg_catalog.has_function_privilege(
    'authenticated',
    'public.save_featured_farmer_youtube_candidates(uuid,jsonb)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role',
    'public.save_featured_farmer_youtube_candidates(uuid,jsonb)', 'EXECUTE'
  ) then
    raise exception 'Featured Farmer YouTube privilege separation is unsafe';
  end if;

  if not pg_catalog.has_function_privilege(
    'anon', 'public.list_featured_farmer_publications(integer,integer)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'anon', 'public.get_featured_farmer_publication(text)', 'EXECUTE'
  ) then
    raise exception 'Featured Farmer public read RPC grants are missing';
  end if;

  select lower(pg_catalog.pg_get_functiondef(
    'public.refresh_featured_farmer_readiness(uuid)'::regprocedure
  )) into definition;
  if definition not like '%count(distinct source.publisher_host)%'
    or definition not like '%require_professional_sources and professional_domains < 2%'
    or definition not like '%require_professional_sources and authoritative_sources < 1%'
    or definition not like '%approved_claims < 2%'
    or definition not like '%uncited_claims > 0%'
    or definition not like '%social_links < 1%'
    or definition not like '%jsonb_array_length(draft.story_sections) < 3%'
    or definition not like '%media_unapproved > 0%'
  then
    raise exception 'Featured Farmer publication readiness is incomplete';
  end if;

  select enabled into professional_sources_required
  from public.ecosystem_release_controls
  where control_key = 'featured_farmer_professional_sources_required';
  if not found or professional_sources_required is distinct from false then
    raise exception 'Featured Farmer professional-source control must default false';
  end if;
end;
$$;

select extensions.pass(
  'Featured Farmer private data, RPC grants and publication readiness hold'
);
select * from extensions.finish();

rollback;
