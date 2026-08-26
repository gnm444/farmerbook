-- Classify farm-visit enquiries so schools and corporates receive an urgent
-- owner notification without exposing private requests to browser clients.

alter table public.farm_visit_requests
  add column visitor_type text not null default 'individual' check (
    visitor_type in ('individual', 'school', 'fpo', 'corporate', 'other')
  ),
  add column organization_name text check (
    organization_name is null or (
      char_length(organization_name) between 2 and 160
      and organization_name = btrim(organization_name)
      and organization_name !~ '[[:cntrl:]]'
    )
  ),
  add column contact_role text check (
    contact_role is null or (
      char_length(contact_role) between 2 and 100
      and contact_role = btrim(contact_role)
      and contact_role !~ '[[:cntrl:]]'
    )
  ),
  add column priority text not null default 'normal' check (
    priority in ('normal', 'high')
  );

alter table public.farm_visit_requests
  add constraint farm_visit_requests_priority_matches_visitor_type_check check (
    (visitor_type in ('school', 'fpo', 'corporate') and priority = 'high'
      and organization_name is not null and contact_role is not null)
    or (visitor_type in ('individual', 'other') and priority = 'normal')
  );

create index farm_visit_requests_high_priority_created_at_idx
  on public.farm_visit_requests (created_at desc)
  where priority = 'high' and status in ('new', 'reviewing', 'checking_farmer');

create function public.create_farm_visit_request_v2(
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
  visitor_type_input text,
  organization_name_input text,
  contact_role_input text,
  notes_input text,
  consent_input boolean,
  idempotency_key_input uuid
)
returns table(code text, request_id uuid, created_at timestamptz, notification_state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  visitor_type_value text := btrim(coalesce(visitor_type_input, ''));
  organization_name_value text := nullif(btrim(coalesce(organization_name_input, '')), '');
  contact_role_value text := nullif(btrim(coalesce(contact_role_input, '')), '');
  result_record record;
begin
  if visitor_type_value not in ('individual', 'school', 'fpo', 'corporate', 'other')
    or (visitor_type_value in ('school', 'fpo', 'corporate') and (
      organization_name_value is null or contact_role_value is null
      or char_length(organization_name_value) not between 2 and 160
      or char_length(contact_role_value) not between 2 and 100
      or organization_name_value ~ '[[:cntrl:]]' or contact_role_value ~ '[[:cntrl:]]'
    ))
    or (visitor_type_value in ('individual', 'other') and (
      organization_name_value is not null or contact_role_value is not null
    ))
  then
    raise exception 'Visitor classification is invalid'
      using errcode = '22023', detail = 'INVALID_VISITOR_CLASSIFICATION';
  end if;

  select * into result_record from public.create_farm_visit_request(
    phone_input, address_line_1_input, address_line_2_input, locality_input,
    district_input, state_input, postal_code_input, farming_interest_input,
    party_size_input, preferred_schedule_input, notes_input, consent_input,
    idempotency_key_input
  );

  if result_record.code = 'CREATED' then
    update public.farm_visit_requests
    set visitor_type = visitor_type_value,
        organization_name = organization_name_value,
        contact_role = contact_role_value,
        priority = case when visitor_type_value in ('school', 'fpo', 'corporate') then 'high' else 'normal' end,
        updated_at = now()
    where id = result_record.request_id;
  end if;

  return query select result_record.code, result_record.request_id,
    result_record.created_at, result_record.notification_state;
end;
$$;

revoke all on function public.create_farm_visit_request_v2(
  text, text, text, text, text, text, text, text, integer, text, text, text,
  text, text, boolean, uuid
) from public, anon, authenticated;
grant execute on function public.create_farm_visit_request_v2(
  text, text, text, text, text, text, text, text, integer, text, text, text,
  text, text, boolean, uuid
) to authenticated;
