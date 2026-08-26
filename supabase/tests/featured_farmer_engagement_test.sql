begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

do $$
declare
  customer_id constant uuid := '83000000-0000-4000-8000-000000000001';
  farmer_id constant uuid := '84000000-0000-4000-8000-000000000002';
  admin_id constant uuid := '85000000-0000-4000-8000-000000000003';
  recommendation_id_value uuid;
  delivery_id_value uuid;
  result_code text;
  result_status text;
  public_recommendations jsonb;
  view_count bigint;
  error_detail text;
  table_name text;
begin
  foreach table_name in array array[
    'featured_farmer_engagement_subjects',
    'featured_farmer_question_deliveries',
    'featured_farmer_recommendations',
    'featured_farmer_recommendation_events'
  ] loop
    if not exists (
      select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = table_name
        and relation.relrowsecurity
        and relation.relforcerowsecurity
    ) then
      raise exception '% must have forced RLS', table_name;
    end if;
    if pg_catalog.has_table_privilege(
      'anon', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE'
    ) or pg_catalog.has_table_privilege(
      'authenticated', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE'
    ) then
      raise exception 'Browser roles unexpectedly access %', table_name;
    end if;
  end loop;

  if not pg_catalog.has_function_privilege(
    'anon', 'public.get_featured_farmer_public_engagement(text)', 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'anon',
    'public.submit_featured_farmer_recommendation(text,text,text,boolean,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Public recommendation privileges are unsafe';
  end if;
  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.submit_featured_farmer_recommendation(text,text,text,boolean,uuid)',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.reserve_featured_farmer_question_delivery(text,text,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated recommendation/question privileges are unsafe';
  end if;
  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.reserve_featured_farmer_question_delivery(text,text,text,uuid)',
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role',
    'public.increment_featured_farmer_profile_view(text)',
    'EXECUTE'
  ) then
    raise exception 'Service engagement privileges are incomplete';
  end if;

  if exists (
    select 1 from information_schema.columns column_record
    where column_record.table_schema = 'public'
      and column_record.table_name = 'featured_farmer_question_deliveries'
      and column_record.column_name in (
        'sender_email', 'visitor_email', 'sender_name', 'message', 'message_body'
      )
  ) then
    raise exception 'Private question content must not be stored';
  end if;

  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values
    (
      customer_id, 'recommendation-customer@farmerbook.invalid',
      '{"full_name":"Recommendation Customer"}'::jsonb, '{}'::jsonb
    ),
    (
      farmer_id, 'recommendation-farmer@farmerbook.invalid',
      '{"full_name":"Recommendation Farmer"}'::jsonb, '{}'::jsonb
    ),
    (
      admin_id, 'recommendation-admin@farmerbook.invalid',
      '{"full_name":"Recommendation Admin"}'::jsonb,
      '{"role":"admin"}'::jsonb
    );
  update public.profiles
  set status = 'active', onboarding_complete = true,
      account_role = case
        when id = customer_id then 'customer'
        when id = farmer_id then 'farmer'
        else 'customer'
      end,
      farming_method = case when id = farmer_id then 'natural' else null end
  where id in (customer_id, farmer_id, admin_id);

  perform pg_catalog.set_config('request.jwt.claim.sub', customer_id::text, true);
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', customer_id, 'role', 'authenticated',
      'email', 'recommendation-customer@farmerbook.invalid',
      'app_metadata', '{}'::jsonb
    )::text,
    true
  );
  select result.code, result.recommendation_id, result.recommendation_status
  into result_code, recommendation_id_value, result_status
  from public.submit_featured_farmer_recommendation(
    'sandeep-dasari-avani-van-farms',
    'Regular Gir-cow milk customer',
    'Sandeep communicates clearly about availability and has always taken time to explain how the Gir cows are cared for at Avani Van Farms.',
    true,
    '83000000-0000-4000-8000-000000000010'
  ) result;
  if result_code <> 'CREATED' or result_status <> 'pending' then
    raise exception 'Customer recommendation was not created as pending';
  end if;
  select result.code into result_code
  from public.submit_featured_farmer_recommendation(
    'sandeep-dasari-avani-van-farms',
    'Regular Gir-cow milk customer',
    'Sandeep communicates clearly about availability and has always taken time to explain how the Gir cows are cared for at Avani Van Farms.',
    true,
    '83000000-0000-4000-8000-000000000010'
  ) result;
  if result_code <> 'IDEMPOTENT_REPLAY'
    or (select count(*) from public.featured_farmer_recommendations
      where reviewer_id = customer_id) <> 1
  then
    raise exception 'Recommendation submission was not idempotent';
  end if;

  select engagement.recommendations into public_recommendations
  from public.get_featured_farmer_public_engagement(
    'sandeep-dasari-avani-van-farms'
  ) engagement;
  if jsonb_array_length(public_recommendations) <> 0 then
    raise exception 'Pending recommendation leaked publicly';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.sub', farmer_id::text, true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', farmer_id, 'role', 'authenticated',
      'email', 'recommendation-farmer@farmerbook.invalid',
      'app_metadata', '{}'::jsonb
    )::text,
    true
  );
  begin
    perform public.submit_featured_farmer_recommendation(
      'sandeep-dasari-avani-van-farms',
      'Farm visitor',
      'This Farmer-role account must never pass the Customer-only recommendation boundary in the database function.',
      true,
      '83000000-0000-4000-8000-000000000011'
    );
    raise exception 'Farmer unexpectedly submitted a Customer recommendation';
  exception
    when insufficient_privilege then
      get stacked diagnostics error_detail = pg_exception_detail;
      if error_detail <> 'CUSTOMER_ACCOUNT_REQUIRED' then
        raise exception 'Unexpected Customer-role rejection detail: %', error_detail;
      end if;
  end;

  perform pg_catalog.set_config('request.jwt.claim.sub', admin_id::text, true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', admin_id, 'role', 'authenticated',
      'email', 'recommendation-admin@farmerbook.invalid',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
  );
  if not public.moderate_featured_farmer_recommendation(
    recommendation_id_value, 'approved', 'Suitable first-person customer experience.'
  ) then
    raise exception 'Administrator could not approve recommendation';
  end if;
  if not exists (
    select 1 from public.featured_farmer_recommendation_events event
    where event.recommendation_id = recommendation_id_value
      and event.moderator_id = admin_id
      and event.previous_status = 'pending'
      and event.next_status = 'approved'
  ) then
    raise exception 'Recommendation moderation was not audited';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  perform pg_catalog.set_config('request.jwt.claim.role', 'anon', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', '{"role":"anon"}', true
  );
  select engagement.recommendations into public_recommendations
  from public.get_featured_farmer_public_engagement(
    'sandeep-dasari-avani-van-farms'
  ) engagement;
  if jsonb_array_length(public_recommendations) <> 1
    or public_recommendations -> 0 ->> 'reviewerName' <> 'Recommendation Customer'
    or public_recommendations -> 0 ? 'reviewerId'
    or public_recommendations -> 0 ? 'email'
  then
    raise exception 'Approved recommendation projection is unsafe';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_catalog.set_config(
    'request.jwt.claims', '{"role":"service_role"}', true
  );
  select delivery.code, delivery.delivery_id
  into result_code, delivery_id_value
  from public.reserve_featured_farmer_question_delivery(
    'sandeep-dasari-avani-van-farms', repeat('a', 64), 'question',
    '83000000-0000-4000-8000-000000000020'
  ) delivery;
  if result_code <> 'CREATED' or delivery_id_value is null then
    raise exception 'Private question delivery was not reserved';
  end if;
  if not public.record_featured_farmer_question_notification(
    delivery_id_value, 'sent', 'synthetic-receipt', null
  ) then
    raise exception 'Question receipt was not recorded';
  end if;
  if not exists (
    select 1 from public.featured_farmer_question_deliveries delivery
    where delivery.id = delivery_id_value
      and delivery.notification_state = 'sent'
      and delivery.notification_receipt_id = 'synthetic-receipt'
  ) then
    raise exception 'Question receipt fields are incorrect';
  end if;

  perform public.reserve_featured_farmer_question_delivery(
    'sandeep-dasari-avani-van-farms', repeat('a', 64), 'question',
    '83000000-0000-4000-8000-000000000021'
  );
  perform public.reserve_featured_farmer_question_delivery(
    'sandeep-dasari-avani-van-farms', repeat('a', 64), 'comment',
    '83000000-0000-4000-8000-000000000022'
  );
  select delivery.code into result_code
  from public.reserve_featured_farmer_question_delivery(
    'sandeep-dasari-avani-van-farms', repeat('a', 64), 'question',
    '83000000-0000-4000-8000-000000000023'
  ) delivery;
  if result_code <> 'SENDER_RATE_LIMITED' then
    raise exception 'Keyed sender rate limit did not stop the fourth request';
  end if;

  select public.increment_featured_farmer_profile_view(
    'sandeep-dasari-avani-van-farms'
  ) into view_count;
  if view_count <> 1 then
    raise exception 'Profile view was not atomically incremented';
  end if;

  delete from public.profiles where id = customer_id;
  if exists (
    select 1 from public.featured_farmer_recommendations
    where reviewer_id = customer_id
  ) or exists (
    select 1 from public.featured_farmer_recommendation_events
    where recommendation_id = recommendation_id_value
  ) then
    raise exception 'Customer deletion did not remove recommendation and events';
  end if;
end;
$$;

select extensions.pass(
  'Featured Farmer engagement keeps questions private, recommendations moderated and views aggregate-only'
);
select * from extensions.finish();

rollback;
