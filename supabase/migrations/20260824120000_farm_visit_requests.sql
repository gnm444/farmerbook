-- Add a private, customer-only Farm Visits interest workflow. This migration
-- sends no email and publishes no address data; browser access is RPC-only.

create table public.farm_visit_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  requester_name text not null check (
    char_length(requester_name) between 2 and 120
    and requester_name = btrim(requester_name)
  ),
  requester_email text not null check (
    char_length(requester_email) between 3 and 254
    and requester_email = lower(btrim(requester_email))
    and requester_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  phone text not null check (phone ~ '^[+]91[6-9][0-9]{9}$'),
  address_line_1 text not null check (
    char_length(address_line_1) between 4 and 160
    and address_line_1 = btrim(address_line_1)
    and address_line_1 !~ '[[:cntrl:]]'
  ),
  address_line_2 text check (
    address_line_2 is null or (
      char_length(address_line_2) between 2 and 160
      and address_line_2 = btrim(address_line_2)
      and address_line_2 !~ '[[:cntrl:]]'
    )
  ),
  locality text not null check (
    char_length(locality) between 2 and 100 and locality = btrim(locality)
    and locality !~ '[[:cntrl:]]'
  ),
  district text not null check (
    char_length(district) between 2 and 100 and district = btrim(district)
    and district !~ '[[:cntrl:]]'
  ),
  state text not null check (state in (
    'Andaman and Nicobar Islands', 'Andhra Pradesh',
    'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
    'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
    'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
    'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
    'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
    'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal'
  )),
  postal_code text not null check (postal_code ~ '^[1-9][0-9]{5}$'),
  farming_interest text not null check (
    farming_interest in ('organic', 'natural', 'both', 'general')
  ),
  party_size smallint not null check (party_size between 1 and 20),
  preferred_schedule text not null check (
    preferred_schedule in ('weekday', 'weekend', 'either')
  ),
  notes text check (
    notes is null or (
      char_length(notes) between 2 and 500 and notes = btrim(notes)
      and replace(notes, chr(10), '') !~ '[[:cntrl:]]'
    )
  ),
  consented_at timestamptz not null,
  consent_policy_version text not null default 'farm-visits-v1'
    check (consent_policy_version = 'farm-visits-v1'),
  status text not null default 'new' check (status in (
    'new', 'reviewing', 'checking_farmer', 'offered', 'scheduled',
    'closed', 'cancelled'
  )),
  notification_state text not null default 'pending' check (
    notification_state in ('pending', 'sent', 'failed', 'unknown')
  ),
  notification_receipt_id text check (
    notification_receipt_id is null or (
      char_length(notification_receipt_id) between 1 and 300
      and notification_receipt_id = btrim(notification_receipt_id)
    )
  ),
  notification_failure_code text check (
    notification_failure_code is null
    or notification_failure_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  notification_attempted_at timestamptz,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, idempotency_key)
);

create unique index farm_visit_requests_one_open_per_customer_idx
  on public.farm_visit_requests (requester_id)
  where status in (
    'new', 'reviewing', 'checking_farmer', 'offered', 'scheduled'
  );

create index farm_visit_requests_created_at_idx
  on public.farm_visit_requests (created_at desc);

alter table public.farm_visit_requests enable row level security;
alter table public.farm_visit_requests force row level security;

create or replace function public.create_farm_visit_request(
  phone_input text,
  address_line_1_input text,
  address_line_2_input text,
  locality_input text,
  district_input text,
  state_input text,
  postal_code_input text,
  farming_interest_input text,
  party_size_input integer,
  preferred_schedule_input text,
  notes_input text,
  consent_input boolean,
  idempotency_key_input uuid
)
returns table(
  code text,
  request_id uuid,
  created_at timestamptz,
  notification_state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_profile public.profiles%rowtype;
  actor_email text := lower(btrim(coalesce((select auth.jwt() ->> 'email'), '')));
  existing_request public.farm_visit_requests%rowtype;
  created_request public.farm_visit_requests%rowtype;
  address_line_2_value text := nullif(btrim(coalesce(address_line_2_input, '')), '');
  notes_value text := nullif(btrim(coalesce(notes_input, '')), '');
begin
  if coalesce((select auth.role()), '') <> 'authenticated' or actor_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501', detail = 'AUTHENTICATION_REQUIRED';
  end if;
  if idempotency_key_input is null then
    raise exception 'Idempotency key is required'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select request.* into existing_request
  from public.farm_visit_requests request
  where request.requester_id = actor_id
    and request.idempotency_key = idempotency_key_input;
  if found then
    return query select
      'IDEMPOTENT_REPLAY', existing_request.id, existing_request.created_at,
      existing_request.notification_state;
    return;
  end if;

  select profile.* into actor_profile
  from public.profiles profile
  where profile.id = actor_id
    and profile.status = 'active'
    and profile.onboarding_complete
    and profile.account_role = 'customer';
  if not found then
    raise exception 'An active Customer account is required'
      using errcode = '42501', detail = 'CUSTOMER_ACCOUNT_REQUIRED';
  end if;
  if actor_email = '' or actor_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'A verified account email is required'
      using errcode = '22023', detail = 'ACCOUNT_EMAIL_REQUIRED';
  end if;
  if not consent_input then
    raise exception 'Consent is required'
      using errcode = '22023', detail = 'CONSENT_REQUIRED';
  end if;
  if btrim(coalesce(phone_input, '')) !~ '^[+]91[6-9][0-9]{9}$'
    or char_length(btrim(coalesce(address_line_1_input, ''))) not between 4 and 160
    or btrim(coalesce(address_line_1_input, '')) ~ '[[:cntrl:]]'
    or (address_line_2_value is not null
      and (
        char_length(address_line_2_value) not between 2 and 160
        or address_line_2_value ~ '[[:cntrl:]]'
      ))
    or char_length(btrim(coalesce(locality_input, ''))) not between 2 and 100
    or btrim(coalesce(locality_input, '')) ~ '[[:cntrl:]]'
    or char_length(btrim(coalesce(district_input, ''))) not between 2 and 100
    or btrim(coalesce(district_input, '')) ~ '[[:cntrl:]]'
    or coalesce(state_input, '') not in (
      'Andaman and Nicobar Islands', 'Andhra Pradesh',
      'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
      'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
      'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
      'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
      'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
      'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
      'West Bengal'
    )
    or btrim(coalesce(postal_code_input, '')) !~ '^[1-9][0-9]{5}$'
    or coalesce(farming_interest_input, '') not in ('organic', 'natural', 'both', 'general')
    or party_size_input not between 1 and 20
    or coalesce(preferred_schedule_input, '') not in ('weekday', 'weekend', 'either')
    or (notes_value is not null and (
      char_length(notes_value) not between 2 and 500
      or replace(notes_value, chr(10), '') ~ '[[:cntrl:]]'
    ))
  then
    raise exception 'Farm visit request details are invalid'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  begin
    insert into public.farm_visit_requests (
      requester_id, requester_name, requester_email, phone,
      address_line_1, address_line_2, locality, district, state, postal_code,
      farming_interest, party_size, preferred_schedule, notes, consented_at,
      idempotency_key
    ) values (
      actor_id, btrim(actor_profile.full_name), actor_email,
      btrim(phone_input), btrim(address_line_1_input), address_line_2_value,
      btrim(locality_input), btrim(district_input), state_input,
      btrim(postal_code_input), farming_interest_input, party_size_input,
      preferred_schedule_input, notes_value, now(), idempotency_key_input
    ) returning * into created_request;
  exception
    when unique_violation then
      select request.* into existing_request
      from public.farm_visit_requests request
      where request.requester_id = actor_id
        and request.status in (
          'new', 'reviewing', 'checking_farmer', 'offered', 'scheduled'
        )
      order by request.created_at desc
      limit 1;
      return query select
        'OPEN_REQUEST_EXISTS', existing_request.id,
        existing_request.created_at, existing_request.notification_state;
      return;
  end;

  return query select
    'CREATED', created_request.id, created_request.created_at,
    created_request.notification_state;
end;
$$;

create or replace function public.record_farm_visit_notification(
  request_id_input uuid,
  notification_state_input text,
  receipt_id_input text,
  failure_code_input text
)
returns table(
  code text,
  request_id uuid,
  notification_state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.farm_visit_requests%rowtype;
  receipt_value text := nullif(btrim(coalesce(receipt_id_input, '')), '');
  failure_value text := nullif(btrim(coalesce(failure_code_input, '')), '');
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if request_id_input is null
    or notification_state_input not in ('sent', 'failed', 'unknown')
    or (notification_state_input = 'sent' and (
      receipt_value is null or char_length(receipt_value) > 300
    ))
    or (notification_state_input <> 'sent' and receipt_value is not null)
    or (notification_state_input = 'sent' and failure_value is not null)
    or (notification_state_input <> 'sent' and (
      failure_value is null or failure_value !~ '^[A-Z0-9_]{2,80}$'
    ))
  then
    raise exception 'Notification result is invalid'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select request.* into request_record
  from public.farm_visit_requests request
  where request.id = request_id_input
  for update;
  if not found then
    return query select
      'REQUEST_NOT_FOUND', request_id_input, null::text;
    return;
  end if;
  if request_record.notification_state <> 'pending' then
    return query select
      'ALREADY_RECORDED', request_record.id, request_record.notification_state;
    return;
  end if;

  update public.farm_visit_requests request
  set notification_state = notification_state_input,
      notification_receipt_id = receipt_value,
      notification_failure_code = failure_value,
      notification_attempted_at = now(),
      updated_at = now()
  where request.id = request_record.id;

  return query select
    'RECORDED', request_record.id, notification_state_input;
end;
$$;

revoke all on table public.farm_visit_requests from public, anon, authenticated;
revoke all on function public.create_farm_visit_request(
  text, text, text, text, text, text, text, text, integer, text, text, boolean,
  uuid
) from public, anon, authenticated;
grant execute on function public.create_farm_visit_request(
  text, text, text, text, text, text, text, text, integer, text, text, boolean,
  uuid
) to authenticated;
revoke all on function public.record_farm_visit_notification(
  uuid, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.record_farm_visit_notification(
  uuid, text, text, text
) to service_role;
