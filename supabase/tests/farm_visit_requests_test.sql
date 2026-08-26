begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  customer_id constant uuid := '78000000-0000-4000-8000-000000000001';
  farmer_id constant uuid := '79000000-0000-4000-8000-000000000002';
  request_key constant uuid := '78000000-0000-4000-8000-000000000010';
  second_key constant uuid := '78000000-0000-4000-8000-000000000011';
  request_id_value uuid;
  result_code text;
  result_state text;
  error_detail text;
  definition text;
begin
  if not exists (
    select 1
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'farm_visit_requests'
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) then
    raise exception 'Farm visit requests must have forced RLS';
  end if;
  if pg_catalog.has_table_privilege(
    'anon', 'public.farm_visit_requests', 'SELECT,INSERT,UPDATE,DELETE'
  ) or pg_catalog.has_table_privilege(
    'authenticated', 'public.farm_visit_requests', 'SELECT,INSERT,UPDATE,DELETE'
  ) then
    raise exception 'Browser roles must not access private farm visit rows';
  end if;
  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.create_farm_visit_request(text,text,text,text,text,text,text,text,integer,text,text,boolean,uuid)',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'anon',
    'public.create_farm_visit_request(text,text,text,text,text,text,text,text,integer,text,text,boolean,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Customer request RPC privileges are unsafe';
  end if;
  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.record_farm_visit_notification(uuid,text,text,text)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.record_farm_visit_notification(uuid,text,text,text)', 'EXECUTE'
  ) then
    raise exception 'Notification receipt RPC privileges are unsafe';
  end if;

  select lower(pg_catalog.pg_get_functiondef(
    'public.create_farm_visit_request(text,text,text,text,text,text,text,text,integer,text,text,boolean,uuid)'::regprocedure
  )) into definition;
  if definition not like '%auth.uid()%'
    or definition not like '%auth.jwt() ->> ''email''%'
    or definition not like '%account_role = ''customer''%'
    or definition not like '%onboarding_complete%'
  then
    raise exception 'Customer identity is not bound by the request RPC';
  end if;

  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values
    (
      customer_id, 'farm-visit-customer@farmerbook.invalid',
      '{"full_name":"Farm Visit Customer"}'::jsonb, '{}'::jsonb
    ),
    (
      farmer_id, 'farm-visit-farmer@farmerbook.invalid',
      '{"full_name":"Farm Visit Farmer"}'::jsonb, '{}'::jsonb
    );
  update public.profiles
  set full_name = case when id = customer_id
      then 'Database-bound Customer' else 'Database-bound Farmer' end,
      status = 'active', onboarding_complete = true,
      account_role = case when id = customer_id then 'customer' else 'farmer' end
  where id in (customer_id, farmer_id);

  perform pg_catalog.set_config('request.jwt.claim.sub', customer_id::text, true);
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', customer_id, 'role', 'authenticated',
      'email', 'FARM-VISIT-CUSTOMER@FARMERBOOK.INVALID'
    )::text, true
  );
  select created.code, created.request_id, created.notification_state
  into result_code, request_id_value, result_state
  from public.create_farm_visit_request(
    '+919876543210', '42 Test Farm Road', null, 'Madhapur', 'Hyderabad',
    'Telangana', '500081', 'both', 3, 'weekend',
    'Interested in soil health and natural inputs.', true, request_key
  ) created;
  if result_code <> 'CREATED' or result_state <> 'pending' then
    raise exception 'Valid Customer request was not created';
  end if;
  if not exists (
    select 1 from public.farm_visit_requests request
    where request.id = request_id_value
      and request.requester_id = customer_id
      and request.requester_name = 'Database-bound Customer'
      and request.requester_email = 'farm-visit-customer@farmerbook.invalid'
      and request.address_line_1 = '42 Test Farm Road'
      and request.consented_at is not null
      and request.consent_policy_version = 'farm-visits-v1'
  ) then
    raise exception 'Stored request was not bound to account identity';
  end if;

  select replay.code into result_code
  from public.create_farm_visit_request(
    '+919876543210', '42 Test Farm Road', null, 'Madhapur', 'Hyderabad',
    'Telangana', '500081', 'both', 3, 'weekend',
    'Interested in soil health and natural inputs.', true, request_key
  ) replay;
  if result_code <> 'IDEMPOTENT_REPLAY'
    or (select count(*) from public.farm_visit_requests
      where requester_id = customer_id) <> 1
  then
    raise exception 'Request replay was not idempotent';
  end if;

  select duplicate_open.code into result_code
  from public.create_farm_visit_request(
    '+919876543210', '43 Test Farm Road', null, 'Madhapur', 'Hyderabad',
    'Telangana', '500081', 'organic', 2, 'either', null, true, second_key
  ) duplicate_open;
  if result_code <> 'OPEN_REQUEST_EXISTS'
    or (select count(*) from public.farm_visit_requests
      where requester_id = customer_id) <> 1
  then
    raise exception 'One-open-request control failed';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.sub', farmer_id::text, true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', farmer_id, 'role', 'authenticated',
      'email', 'farm-visit-farmer@farmerbook.invalid'
    )::text, true
  );
  begin
    perform public.create_farm_visit_request(
      '+919876543211', '44 Test Farm Road', null, 'Madhapur', 'Hyderabad',
      'Telangana', '500081', 'general', 1, 'either', null, true, second_key
    );
    raise exception 'Farmer account unexpectedly created a Customer request';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'CUSTOMER_ACCOUNT_REQUIRED' then
        raise exception 'Unexpected role rejection detail: %', error_detail;
      end if;
  end;

  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', '{"role":"service_role"}', true
  );
  select recorded.code, recorded.notification_state
  into result_code, result_state
  from public.record_farm_visit_notification(
    request_id_value, 'sent', 'synthetic-postmark-receipt', null
  ) recorded;
  if result_code <> 'RECORDED' or result_state <> 'sent'
    or not exists (
      select 1 from public.farm_visit_requests request
      where request.id = request_id_value
        and request.notification_state = 'sent'
        and request.notification_receipt_id = 'synthetic-postmark-receipt'
        and request.notification_attempted_at is not null
        and request.notification_failure_code is null
    )
  then
    raise exception 'Notification receipt was not safely recorded';
  end if;
  select replay_receipt.code into result_code
  from public.record_farm_visit_notification(
    request_id_value, 'failed', null, 'POSTMARK_HTTP_422'
  ) replay_receipt;
  if result_code <> 'ALREADY_RECORDED' then
    raise exception 'Notification terminal state was not idempotent';
  end if;

  delete from public.profiles where id = customer_id;
  if exists (
    select 1 from public.farm_visit_requests where requester_id = customer_id
  ) then
    raise exception 'Account deletion did not cascade to the private request';
  end if;
end;
$$;

select extensions.pass(
  'Farm Visits keeps addresses private, binds Customers and records one notification safely'
);
select * from extensions.finish();

rollback;
