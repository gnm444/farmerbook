-- Atomic email double opt-in completion for a concrete provider integration.

create or replace function public.record_verified_email_double_opt_in(
  prospect_id_input uuid,
  receipt_input jsonb,
  introduction_idempotency_key_input uuid,
  followup_idempotency_key_input uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  purposes_value jsonb := receipt_input -> 'requestedPurposes';
  introduction_result record;
  followup_result record;
  record_followup boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if prospect_id_input is null
    or introduction_idempotency_key_input is null
    or followup_idempotency_key_input is null
    or jsonb_typeof(receipt_input) <> 'object'
    or jsonb_typeof(purposes_value) <> 'array'
    or not purposes_value @> '["farmerbook_introduction"]'::jsonb
    or not purposes_value <@ '["farmerbook_introduction","onboarding_followup"]'::jsonb
  then
    raise exception 'Invalid email consent receipt'
      using errcode = '22023', detail = 'INVALID_EMAIL_CONSENT_RECEIPT';
  end if;
  record_followup := purposes_value @> '["onboarding_followup"]'::jsonb;

  select * into introduction_result
  from public.record_verified_outreach_consent(
    prospect_id_input,
    (receipt_input - 'requestedPurposes') || jsonb_build_object(
      'purpose', 'farmerbook_introduction'
    ),
    introduction_idempotency_key_input
  );

  if record_followup then
    select * into followup_result
    from public.record_verified_outreach_consent(
      prospect_id_input,
      (receipt_input - 'requestedPurposes') || jsonb_build_object(
        'purpose', 'onboarding_followup'
      ),
      followup_idempotency_key_input
    );
  end if;

  return jsonb_build_object(
    'code', 'EMAIL_CONSENT_RECORDED',
    'introductionCode', introduction_result.code,
    'introductionConsentId', introduction_result.consent_id,
    'introductionOutboxId', introduction_result.outbox_id,
    'followupCode', case when record_followup then followup_result.code else null end,
    'followupConsentId', case
      when record_followup then followup_result.consent_id else null end
  );
end;
$$;

revoke all on function public.record_verified_email_double_opt_in(
  uuid, jsonb, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.record_verified_email_double_opt_in(
  uuid, jsonb, uuid, uuid
) to service_role;
