begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  public_name_count bigint;
  stored_phone text;
  public_list_result text;
  list_result_definition text;
  public_test_name constant text := 'Public Pledge SQL Test 20260919';
  private_test_name constant text := 'Private Pledge SQL Test 20260919';
begin
  if not exists (
    select 1
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'plate_pledges'
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) then
    raise exception 'Expected forced RLS on public.plate_pledges';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = 'plate_pledges'
  ) then
    raise exception 'Browser policies must not exist on public.plate_pledges';
  end if;

  if pg_catalog.has_table_privilege('anon', 'public.plate_pledges', 'SELECT')
    or pg_catalog.has_table_privilege('anon', 'public.plate_pledges', 'INSERT')
    or pg_catalog.has_table_privilege('anon', 'public.plate_pledges', 'UPDATE')
    or pg_catalog.has_table_privilege('anon', 'public.plate_pledges', 'DELETE')
    or pg_catalog.has_table_privilege(
      'authenticated', 'public.plate_pledges', 'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated', 'public.plate_pledges', 'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated', 'public.plate_pledges', 'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated', 'public.plate_pledges', 'DELETE'
    ) then
    raise exception 'Browser table access is unsafe on public.plate_pledges';
  end if;

  if pg_catalog.has_function_privilege(
    'anon', 'public.submit_plate_pledge(text,text,text,text,boolean)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated', 'public.submit_plate_pledge(text,text,text,text,boolean)',
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role',
    'public.submit_plate_pledge(text,text,text,text,boolean)',
    'EXECUTE'
  ) then
    raise exception 'Unsafe submit pledge RPC privileges';
  end if;

  if pg_catalog.has_function_privilege(
    'anon', 'public.list_plate_pledge_names(integer)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated', 'public.list_plate_pledge_names(integer)', 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role', 'public.list_plate_pledge_names(integer)', 'EXECUTE'
  ) then
    raise exception 'Unsafe list pledge names RPC privileges';
  end if;

  select lower(pg_catalog.pg_get_function_result(
    'public.list_plate_pledge_names(integer)'::regprocedure
  )) into list_result_definition;
  if list_result_definition like '%phone%' then
    raise exception 'Public pledge name RPC exposes phone_number';
  end if;
  if list_result_definition <> 'table(display_name text, created_at timestamp with time zone)' then
    raise exception 'Unexpected public pledge name RPC result: %',
      list_result_definition;
  end if;

  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);

  perform public.submit_plate_pledge(
    public_test_name, '+919177901022', 'Srikakulam', 'Vistaraku', true
  );
  perform public.submit_plate_pledge(
    private_test_name, '+919999999999', null, null, false
  );

  select count(*) into public_name_count
  from public.list_plate_pledge_names(100) names
  where names.display_name = public_test_name;
  if public_name_count <> 1 then
    raise exception 'Expected exactly one public pledge name, got %',
      public_name_count;
  end if;

  select string_agg(names.display_name, ',')
  into public_list_result
  from public.list_plate_pledge_names(100) names
  where names.display_name = public_test_name;
  if public_list_result <> public_test_name then
    raise exception 'Unexpected public pledge list: %', public_list_result;
  end if;

  if exists (
    select 1
    from public.list_plate_pledge_names(100) names
    where names.display_name = private_test_name
  ) then
    raise exception 'Private pledge name was publicly listed';
  end if;

  select pledge.phone_number into stored_phone
  from public.plate_pledges pledge
  where pledge.display_name = public_test_name;
  if stored_phone <> '+919177901022' then
    raise exception 'Private phone number was not stored for service-role API';
  end if;

  begin
    perform public.submit_plate_pledge(
      'Duplicate Pledge SQL Test', '+919177901022', null, null, false
    );
    raise exception 'Expected duplicate phone_number to be rejected';
  exception
    when unique_violation then null;
  end;

  begin
    perform public.submit_plate_pledge(
      'Invalid Phone SQL Test', '9177901022', null, null, false
    );
    raise exception 'Expected noncanonical phone_number to be rejected';
  exception
    when check_violation then null;
  end;
end;
$$;

select extensions.pass(
  'Plate pledges are service-only, consent-versioned, and publicly name-redacted'
);
select * from extensions.finish();

rollback;
