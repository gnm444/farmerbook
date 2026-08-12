-- One-time outreach invitations connect a consented prospect to the account
-- they create without putting contact data in the URL. Only a token hash is
-- persisted; browser and service-role code carry the signed bearer token.

alter table public.outreach_events
  drop constraint if exists outreach_events_event_type_check;
alter table public.outreach_events
  add constraint outreach_events_event_type_check check (event_type in (
    'prospect_created', 'evidence_recorded', 'consent_blocked',
    'consent_requested', 'consent_granted', 'consent_withdrawn',
    'qualified', 'introduction_queued', 'delivered', 'delivery_failed',
    'followup_queued', 'invitation_issued', 'onboarding_started', 'joined',
    'declined', 'expired', 'suppressed', 'deleted'
  ));

create table public.outreach_invitations (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null
    references public.outreach_prospects (id) on delete cascade,
  source_outbox_id uuid not null unique
    references public.outreach_outbox (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (redeemed_by is null or redeemed_at is not null),
  check (revoked_at is null or revoked_at >= created_at)
);

create table public.outreach_account_links (
  prospect_id uuid primary key
    references public.outreach_prospects (id) on delete cascade,
  profile_id uuid not null unique
    references public.profiles (id) on delete cascade,
  invitation_id uuid not null unique
    references public.outreach_invitations (id) on delete restrict,
  linked_at timestamptz not null default now(),
  joined_at timestamptz,
  check (joined_at is null or joined_at >= linked_at)
);

create index outreach_invitations_active_token_idx
  on public.outreach_invitations (token_hash, expires_at)
  where redeemed_at is null and revoked_at is null;

create or replace function public.prepare_outreach_invitation(
  outbox_id_input uuid,
  token_input text,
  expires_at_input timestamptz,
  idempotency_key_input uuid
)
returns table(code text, invitation_id uuid, message_body text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox_record public.outreach_outbox%rowtype;
  application_origin_value text;
  invitation_id_value uuid;
  token_hash_value text;
  invitation_url text;
  message_value text;
  existing_invitation public.outreach_invitations%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if outbox_id_input is null
    or idempotency_key_input is null
    or token_input !~ '^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$'
    or char_length(split_part(token_input, '.', 1)) not between 20 and 600
    or char_length(split_part(token_input, '.', 2)) not between 20 and 100
    or split_part(token_input, '.', 3) <> ''
    or expires_at_input <= now()
    or expires_at_input > now() + interval '30 days'
  then
    raise exception 'Invalid outreach invitation'
      using errcode = '22023', detail = 'INVALID_INVITATION';
  end if;

  select outbox.* into outbox_record
  from public.outreach_outbox outbox
  where outbox.id = outbox_id_input
  for update;
  if not found then
    raise exception 'Outbox delivery not found'
      using errcode = 'P0002', detail = 'OUTBOX_NOT_FOUND';
  end if;
  select prospect.application_origin into application_origin_value
  from public.outreach_prospects prospect
  where prospect.id = outbox_record.prospect_id;
  if outbox_record.state <> 'processing'
    or outbox_record.purpose not in (
      'farmerbook_introduction', 'onboarding_followup'
    )
    or not public.has_active_outreach_consent(
      outbox_record.prospect_id,
      outbox_record.consent_id,
      outbox_record.channel,
      outbox_record.purpose
    )
  then
    raise exception 'Invitation requires a processing consented message'
      using errcode = '42501', detail = 'CONSENT_REQUIRED';
  end if;

  token_hash_value := encode(extensions.digest(token_input, 'sha256'), 'hex');
  select invitation.* into existing_invitation
  from public.outreach_invitations invitation
  where invitation.source_outbox_id = outbox_id_input
     or invitation.idempotency_key = idempotency_key_input
  order by invitation.created_at
  limit 1;
  if found then
    if existing_invitation.token_hash <> token_hash_value
      or existing_invitation.expires_at <> expires_at_input
    then
      raise exception 'Invitation idempotency conflict'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query
      select 'IDEMPOTENT_REPLAY', existing_invitation.id,
        outbox_record.message_body;
    return;
  end if;

  invitation_url := application_origin_value || '/invite/' || token_input;
  if char_length(invitation_url) > 1200 then
    raise exception 'Invitation URL is too long'
      using errcode = '22023', detail = 'INVALID_INVITATION';
  end if;
  message_value := case
    when position(application_origin_value || '/signup' in outbox_record.message_body) > 0
      then replace(
        outbox_record.message_body,
        application_origin_value || '/signup',
        invitation_url
      )
    when position('https://farmerbook.in/signup' in outbox_record.message_body) > 0
      then replace(
        outbox_record.message_body,
        'https://farmerbook.in/signup',
        invitation_url
      )
    else left(outbox_record.message_body, 760)
      || ' Use your private FarmerBook invitation: ' || invitation_url
  end;
  if char_length(message_value) not between 20 and 2000 then
    raise exception 'Invitation message is invalid'
      using errcode = '22023', detail = 'INVALID_INVITATION_MESSAGE';
  end if;

  insert into public.outreach_invitations (
    prospect_id, source_outbox_id, token_hash, expires_at, idempotency_key
  ) values (
    outbox_record.prospect_id, outbox_id_input, token_hash_value,
    expires_at_input, idempotency_key_input
  )
  returning id into invitation_id_value;

  update public.outreach_outbox
  set message_body = message_value
  where id = outbox_id_input;

  insert into public.outreach_events (
    prospect_id, event_type, previous_status, new_status, note,
    idempotency_key
  )
  select prospect.id, 'invitation_issued', prospect.status, prospect.status,
    'A one-time signed invitation was attached to a consented message.',
    idempotency_key_input
  from public.outreach_prospects prospect
  where prospect.id = outbox_record.prospect_id;

  return query select 'INVITATION_PREPARED', invitation_id_value, message_value;
end;
$$;

create or replace function public.validate_outreach_invitation(
  token_hash_input text
)
returns table(code text, invitation_expires_at timestamptz)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if token_hash_input !~ '^[0-9a-f]{64}$'
    or not public.is_ecosystem_release_enabled('outreach_agent')
  then
    return query select 'INVALID', null::timestamptz;
    return;
  end if;
  return query
    select 'ACTIVE', invitation.expires_at
    from public.outreach_invitations invitation
    where invitation.token_hash = token_hash_input
      and invitation.expires_at > now()
      and invitation.redeemed_at is null
      and invitation.revoked_at is null;
  if not found then
    return query select 'INVALID', null::timestamptz;
  end if;
end;
$$;

create or replace function public.redeem_outreach_invitation(
  token_hash_input text,
  profile_id_input uuid,
  idempotency_key_input uuid
)
returns table(code text, prospect_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.outreach_invitations%rowtype;
  profile_record public.profiles%rowtype;
  existing_link public.outreach_account_links%rowtype;
  next_status text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('outreach_agent') then
    raise exception 'Outreach agent is disabled'
      using errcode = '42501', detail = 'FEATURE_DISABLED';
  end if;
  if token_hash_input !~ '^[0-9a-f]{64}$'
    or profile_id_input is null
    or idempotency_key_input is null
  then
    raise exception 'Invalid invitation redemption'
      using errcode = '22023', detail = 'INVALID_INVITATION';
  end if;

  select profile.* into profile_record
  from public.profiles profile
  where profile.id = profile_id_input and profile.status = 'active';
  if not found then
    raise exception 'Active profile not found'
      using errcode = 'P0002', detail = 'PROFILE_NOT_FOUND';
  end if;

  select candidate.* into invitation
  from public.outreach_invitations candidate
  where candidate.token_hash = token_hash_input
  for update;
  if not found
    or invitation.expires_at <= now()
    or invitation.revoked_at is not null
  then
    raise exception 'Invitation is unavailable'
      using errcode = 'P0002', detail = 'INVITATION_UNAVAILABLE';
  end if;
  if invitation.redeemed_at is not null then
    if invitation.redeemed_by = profile_id_input then
      select prospect.status into next_status
      from public.outreach_prospects prospect
      where prospect.id = invitation.prospect_id;
      return query select 'IDEMPOTENT_REPLAY', next_status;
      return;
    end if;
    raise exception 'Invitation was already used'
      using errcode = '22023', detail = 'INVITATION_ALREADY_USED';
  end if;

  perform 1
  from public.outreach_prospects prospect
  where prospect.id = invitation.prospect_id
  for update;

  select link.* into existing_link
  from public.outreach_account_links link
  where link.prospect_id = invitation.prospect_id
     or link.profile_id = profile_id_input
  limit 1;
  if found then
    if existing_link.prospect_id = invitation.prospect_id
      and existing_link.profile_id = profile_id_input
    then
      return query
        select 'IDEMPOTENT_REPLAY', prospect.status
        from public.outreach_prospects prospect
        where prospect.id = invitation.prospect_id;
      return;
    end if;
    raise exception 'Invitation conflicts with an existing account link'
      using errcode = '22023', detail = 'ACCOUNT_LINK_CONFLICT';
  end if;

  update public.outreach_invitations
  set redeemed_by = profile_id_input, redeemed_at = now()
  where id = invitation.id;
  update public.outreach_invitations
  set revoked_at = coalesce(revoked_at, now())
  where prospect_id = invitation.prospect_id
    and id <> invitation.id
    and redeemed_at is null;

  next_status := case
    when profile_record.onboarding_complete then 'joined'
    else 'onboarding'
  end;
  insert into public.outreach_account_links (
    prospect_id, profile_id, invitation_id, joined_at
  ) values (
    invitation.prospect_id, profile_id_input, invitation.id,
    case when profile_record.onboarding_complete then now() else null end
  );
  update public.outreach_prospects
  set status = next_status, next_action_at = null
  where id = invitation.prospect_id
    and status not in ('withdrawn', 'suppressed', 'declined', 'expired');
  if not found then
    select prospect.status into next_status
    from public.outreach_prospects prospect
    where prospect.id = invitation.prospect_id;
  end if;
  update public.outreach_outbox
  set state = 'cancelled', last_failure_code = 'ACCOUNT_LINKED'
  where prospect_id = invitation.prospect_id
    and purpose = 'onboarding_followup'
    and state in ('pending', 'processing');

  insert into public.outreach_events (
    prospect_id, actor_id, event_type, new_status, note, idempotency_key
  ) values (
    invitation.prospect_id, profile_id_input,
    case when profile_record.onboarding_complete then 'joined'
      else 'onboarding_started' end,
    next_status,
    'A signed invitation was redeemed by an authenticated account.',
    idempotency_key_input
  ) on conflict (idempotency_key) do nothing;

  return query select 'INVITATION_REDEEMED', next_status;
end;
$$;

create or replace function public.sync_outreach_join_on_profile_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.onboarding_complete
    and not old.onboarding_complete
  then
    with linked as (
      update public.outreach_account_links link
      set joined_at = coalesce(link.joined_at, now())
      where link.profile_id = new.id
      returning link.prospect_id
    ), joined as (
      update public.outreach_prospects prospect
      set status = 'joined', next_action_at = null
      where prospect.id in (select linked.prospect_id from linked)
        and prospect.status not in (
          'withdrawn', 'suppressed', 'declined', 'expired'
        )
      returning prospect.id
    )
    insert into public.outreach_events (
      prospect_id, actor_id, event_type, new_status, note, idempotency_key
    )
    select joined.id, new.id, 'joined', 'joined',
      'The linked account completed FarmerBook onboarding.', gen_random_uuid()
    from joined;
  end if;
  return new;
end;
$$;

create or replace function public.revoke_outreach_invitations_on_terminal_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('withdrawn', 'suppressed', 'declined', 'expired')
    and new.status is distinct from old.status
  then
    update public.outreach_invitations invitation
    set revoked_at = coalesce(invitation.revoked_at, now())
    where invitation.prospect_id = new.id
      and invitation.redeemed_at is null;
  end if;
  return new;
end;
$$;

create trigger sync_outreach_join_after_profile_completion
after update of onboarding_complete on public.profiles
for each row execute function public.sync_outreach_join_on_profile_completion();

create trigger revoke_outreach_invitations_after_terminal_status
after update of status on public.outreach_prospects
for each row execute function public.revoke_outreach_invitations_on_terminal_status();

alter table public.outreach_invitations enable row level security;
alter table public.outreach_account_links enable row level security;

revoke all on table public.outreach_invitations
  from public, anon, authenticated;
revoke all on table public.outreach_account_links
  from public, anon, authenticated;
grant select, insert, update, delete on public.outreach_invitations
  to service_role;
grant select, insert, update, delete on public.outreach_account_links
  to service_role;

revoke all on function public.prepare_outreach_invitation(uuid, text, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_outreach_invitation(uuid, text, timestamptz, uuid)
  to service_role;
revoke all on function public.validate_outreach_invitation(text)
  from public, anon, authenticated;
grant execute on function public.validate_outreach_invitation(text)
  to service_role;
revoke all on function public.redeem_outreach_invitation(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.redeem_outreach_invitation(text, uuid, uuid)
  to service_role;
revoke all on function public.sync_outreach_join_on_profile_completion()
  from public, anon, authenticated;
revoke all on function public.revoke_outreach_invitations_on_terminal_status()
  from public, anon, authenticated;
