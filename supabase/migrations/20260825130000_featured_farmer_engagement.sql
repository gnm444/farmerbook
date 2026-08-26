-- Standalone engagement for curated Featured Farmer profiles. This migration
-- depends only on the production baseline profiles/auth schema and does not
-- require the optional Featured Farmer newsroom tables.

create table public.featured_farmer_engagement_subjects (
  slug text primary key check (
    char_length(slug) between 3 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  display_name text not null check (
    char_length(display_name) between 2 and 160
    and display_name = btrim(display_name)
    and display_name !~ '[[:cntrl:]]'
  ),
  public_email text not null check (
    char_length(public_email) between 3 and 254
    and public_email = lower(btrim(public_email))
    and public_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  views_enabled boolean not null default false,
  questions_enabled boolean not null default false,
  recommendations_enabled boolean not null default false,
  profile_view_count bigint not null default 0 check (profile_view_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.featured_farmer_engagement_subjects (
  slug, display_name, public_email, views_enabled, questions_enabled,
  recommendations_enabled
) values (
  'sandeep-dasari-avani-van-farms',
  'Sandeep Dasari / Avani Van Farms',
  'avanivanfarms@gmail.com',
  true,
  true,
  true
);

create table public.featured_farmer_question_deliveries (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null
    references public.featured_farmer_engagement_subjects(slug) on delete restrict,
  sender_hash text not null check (sender_hash ~ '^[0-9a-f]{64}$'),
  message_kind text not null check (message_kind in ('question', 'comment')),
  idempotency_key uuid not null,
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
  created_at timestamptz not null default now(),
  unique (subject_slug, idempotency_key)
);

create index featured_farmer_question_sender_rate_idx
  on public.featured_farmer_question_deliveries (
    subject_slug, sender_hash, created_at desc
  );
create index featured_farmer_question_subject_rate_idx
  on public.featured_farmer_question_deliveries (subject_slug, created_at desc);

create table public.featured_farmer_recommendations (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null
    references public.featured_farmer_engagement_subjects(slug) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  relationship_context text not null check (
    char_length(relationship_context) between 2 and 160
    and relationship_context = btrim(relationship_context)
    and relationship_context !~ '[[:cntrl:]]'
  ),
  body text not null check (
    char_length(body) between 50 and 1000
    and body = btrim(body)
    and replace(body, chr(10), '') !~ '[[:cntrl:]]'
  ),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'withdrawn', 'hidden')
  ),
  public_display_consented_at timestamptz not null,
  last_submission_key uuid not null,
  moderation_note text check (
    moderation_note is null or (
      char_length(moderation_note) between 2 and 500
      and moderation_note = btrim(moderation_note)
      and replace(moderation_note, chr(10), '') !~ '[[:cntrl:]]'
    )
  ),
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_slug, reviewer_id)
);

create index featured_farmer_recommendations_public_idx
  on public.featured_farmer_recommendations (
    subject_slug, moderated_at desc, created_at desc
  ) where status = 'approved';
create index featured_farmer_recommendations_queue_idx
  on public.featured_farmer_recommendations (status, created_at asc);

create table public.featured_farmer_recommendation_events (
  id bigint generated always as identity primary key,
  recommendation_id uuid not null
    references public.featured_farmer_recommendations(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete restrict,
  previous_status text not null check (
    previous_status in ('pending', 'approved', 'rejected', 'withdrawn', 'hidden')
  ),
  next_status text not null check (
    next_status in ('approved', 'rejected', 'hidden')
  ),
  note text not null check (
    char_length(note) between 2 and 500
    and note = btrim(note)
    and replace(note, chr(10), '') !~ '[[:cntrl:]]'
  ),
  created_at timestamptz not null default now(),
  check (previous_status <> next_status)
);

create index featured_farmer_recommendation_events_target_idx
  on public.featured_farmer_recommendation_events (
    recommendation_id, created_at desc
  );

create trigger featured_farmer_engagement_subjects_set_updated_at
before update on public.featured_farmer_engagement_subjects
for each row execute function public.set_updated_at();

create trigger featured_farmer_recommendations_set_updated_at
before update on public.featured_farmer_recommendations
for each row execute function public.set_updated_at();

alter table public.featured_farmer_engagement_subjects enable row level security;
alter table public.featured_farmer_engagement_subjects force row level security;
alter table public.featured_farmer_question_deliveries enable row level security;
alter table public.featured_farmer_question_deliveries force row level security;
alter table public.featured_farmer_recommendations enable row level security;
alter table public.featured_farmer_recommendations force row level security;
alter table public.featured_farmer_recommendation_events enable row level security;
alter table public.featured_farmer_recommendation_events force row level security;

create or replace function public.get_featured_farmer_public_engagement(
  slug_input text
)
returns table(
  subject_slug text,
  display_name text,
  public_email text,
  profile_view_count bigint,
  views_enabled boolean,
  questions_enabled boolean,
  recommendations_enabled boolean,
  recommendations jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    subject.slug,
    subject.display_name,
    subject.public_email,
    subject.profile_view_count,
    subject.views_enabled,
    subject.questions_enabled,
    subject.recommendations_enabled,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', recommendation.id,
          'reviewerName', profile.full_name,
          'reviewerHandle', profile.handle,
          'relationshipContext', recommendation.relationship_context,
          'body', recommendation.body,
          'recommendedAt', recommendation.moderated_at
        ) order by recommendation.moderated_at desc, recommendation.created_at desc
      )
      from public.featured_farmer_recommendations recommendation
      join public.profiles profile on profile.id = recommendation.reviewer_id
      where recommendation.subject_slug = subject.slug
        and recommendation.status = 'approved'
        and profile.status = 'active'
    ), '[]'::jsonb)
  from public.featured_farmer_engagement_subjects subject
  where subject.slug = slug_input;
$$;

create or replace function public.get_my_featured_farmer_recommendation(
  slug_input text
)
returns table(
  recommendation_id uuid,
  relationship_context text,
  body text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    recommendation.id,
    recommendation.relationship_context,
    recommendation.body,
    recommendation.status,
    recommendation.created_at,
    recommendation.updated_at
  from public.featured_farmer_recommendations recommendation
  where recommendation.subject_slug = slug_input
    and recommendation.reviewer_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.submit_featured_farmer_recommendation(
  slug_input text,
  relationship_context_input text,
  body_input text,
  consent_input boolean,
  idempotency_key_input uuid
)
returns table(
  code text,
  recommendation_id uuid,
  recommendation_status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing_recommendation public.featured_farmer_recommendations%rowtype;
  saved_recommendation public.featured_farmer_recommendations%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'authenticated' or actor_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501', detail = 'AUTHENTICATION_REQUIRED';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = actor_id
      and profile.status = 'active'
      and profile.onboarding_complete
      and profile.account_role = 'customer'
  ) then
    raise exception 'An active Customer account is required'
      using errcode = '42501', detail = 'CUSTOMER_ACCOUNT_REQUIRED';
  end if;
  if not exists (
    select 1 from public.featured_farmer_engagement_subjects subject
    where subject.slug = slug_input and subject.recommendations_enabled
  ) then
    raise exception 'Recommendations are unavailable'
      using errcode = '42501', detail = 'RECOMMENDATIONS_DISABLED';
  end if;
  if not consent_input or idempotency_key_input is null
    or char_length(btrim(coalesce(relationship_context_input, ''))) not between 2 and 160
    or btrim(coalesce(relationship_context_input, '')) ~ '[[:cntrl:]]'
    or char_length(btrim(coalesce(body_input, ''))) not between 50 and 1000
    or replace(btrim(coalesce(body_input, '')), chr(10), '') ~ '[[:cntrl:]]'
  then
    raise exception 'Recommendation details are invalid'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select recommendation.* into existing_recommendation
  from public.featured_farmer_recommendations recommendation
  where recommendation.subject_slug = slug_input
    and recommendation.reviewer_id = actor_id
  for update;

  if found and existing_recommendation.last_submission_key = idempotency_key_input then
    return query select
      'IDEMPOTENT_REPLAY', existing_recommendation.id,
      existing_recommendation.status, existing_recommendation.updated_at;
    return;
  end if;

  insert into public.featured_farmer_recommendations (
    subject_slug, reviewer_id, relationship_context, body, status,
    public_display_consented_at, last_submission_key,
    moderation_note, moderated_by, moderated_at
  ) values (
    slug_input, actor_id, btrim(relationship_context_input),
    btrim(body_input), 'pending', now(), idempotency_key_input,
    null, null, null
  )
  on conflict (subject_slug, reviewer_id) do update
    set relationship_context = excluded.relationship_context,
        body = excluded.body,
        status = 'pending',
        public_display_consented_at = excluded.public_display_consented_at,
        last_submission_key = excluded.last_submission_key,
        moderation_note = null,
        moderated_by = null,
        moderated_at = null,
        updated_at = now()
  returning * into saved_recommendation;

  return query select
    case when existing_recommendation.id is null then 'CREATED' else 'UPDATED' end,
    saved_recommendation.id, saved_recommendation.status,
    saved_recommendation.updated_at;
end;
$$;

create or replace function public.withdraw_featured_farmer_recommendation(
  slug_input text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'authenticated'
    or (select auth.uid()) is null then
    raise exception 'Authentication is required'
      using errcode = '42501', detail = 'AUTHENTICATION_REQUIRED';
  end if;
  update public.featured_farmer_recommendations recommendation
  set status = 'withdrawn', moderation_note = null, moderated_by = null,
      moderated_at = null, updated_at = now()
  where recommendation.subject_slug = slug_input
    and recommendation.reviewer_id = (select auth.uid())
    and recommendation.status <> 'withdrawn';
  return found;
end;
$$;

create or replace function public.list_featured_farmer_recommendation_queue(
  limit_input integer default 100
)
returns table(
  recommendation_id uuid,
  subject_slug text,
  subject_name text,
  reviewer_name text,
  reviewer_handle text,
  relationship_context text,
  body text,
  recommendation_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  return query
  select
    recommendation.id,
    recommendation.subject_slug,
    subject.display_name,
    profile.full_name,
    profile.handle,
    recommendation.relationship_context,
    recommendation.body,
    recommendation.status,
    recommendation.created_at,
    recommendation.updated_at
  from public.featured_farmer_recommendations recommendation
  join public.featured_farmer_engagement_subjects subject
    on subject.slug = recommendation.subject_slug
  join public.profiles profile on profile.id = recommendation.reviewer_id
  where recommendation.status in ('pending', 'approved', 'hidden')
  order by
    case recommendation.status when 'pending' then 0 else 1 end,
    recommendation.created_at asc
  limit greatest(1, least(coalesce(limit_input, 100), 200));
end;
$$;

create or replace function public.moderate_featured_farmer_recommendation(
  recommendation_id_input uuid,
  next_status_input text,
  note_input text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  recommendation_record public.featured_farmer_recommendations%rowtype;
  note_value text := btrim(coalesce(note_input, ''));
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Administrator access required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if recommendation_id_input is null
    or next_status_input not in ('approved', 'rejected', 'hidden')
    or char_length(note_value) not between 2 and 500
    or replace(note_value, chr(10), '') ~ '[[:cntrl:]]'
  then
    raise exception 'Moderation action is invalid'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  select recommendation.* into recommendation_record
  from public.featured_farmer_recommendations recommendation
  where recommendation.id = recommendation_id_input
  for update;
  if not found then return false; end if;
  if recommendation_record.status = next_status_input then return true; end if;

  update public.featured_farmer_recommendations recommendation
  set status = next_status_input,
      moderation_note = note_value,
      moderated_by = actor_id,
      moderated_at = now(),
      updated_at = now()
  where recommendation.id = recommendation_record.id;

  insert into public.featured_farmer_recommendation_events (
    recommendation_id, moderator_id, previous_status, next_status, note
  ) values (
    recommendation_record.id, actor_id, recommendation_record.status,
    next_status_input, note_value
  );
  return true;
end;
$$;

create or replace function public.reserve_featured_farmer_question_delivery(
  slug_input text,
  sender_hash_input text,
  message_kind_input text,
  idempotency_key_input uuid
)
returns table(
  code text,
  delivery_id uuid,
  created_at timestamptz,
  notification_state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_delivery public.featured_farmer_question_deliveries%rowtype;
  created_delivery public.featured_farmer_question_deliveries%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if sender_hash_input !~ '^[0-9a-f]{64}$'
    or message_kind_input not in ('question', 'comment')
    or idempotency_key_input is null
  then
    raise exception 'Question delivery details are invalid'
      using errcode = '22023', detail = 'INVALID_INPUT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(slug_input, 0));

  select delivery.* into existing_delivery
  from public.featured_farmer_question_deliveries delivery
  where delivery.subject_slug = slug_input
    and delivery.idempotency_key = idempotency_key_input;
  if found then
    return query select
      'IDEMPOTENT_REPLAY', existing_delivery.id, existing_delivery.created_at,
      existing_delivery.notification_state;
    return;
  end if;
  if not exists (
    select 1 from public.featured_farmer_engagement_subjects subject
    where subject.slug = slug_input and subject.questions_enabled
  ) then
    raise exception 'Questions are unavailable'
      using errcode = '42501', detail = 'QUESTIONS_DISABLED';
  end if;
  if (
    select count(*) from public.featured_farmer_question_deliveries delivery
    where delivery.subject_slug = slug_input
      and delivery.sender_hash = sender_hash_input
      and delivery.created_at >= now() - interval '24 hours'
  ) >= 3 then
    return query select
      'SENDER_RATE_LIMITED', null::uuid, now(), 'failed'::text;
    return;
  end if;
  if (
    select count(*) from public.featured_farmer_question_deliveries delivery
    where delivery.subject_slug = slug_input
      and delivery.created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
  ) >= 100 then
    return query select
      'SUBJECT_RATE_LIMITED', null::uuid, now(), 'failed'::text;
    return;
  end if;

  insert into public.featured_farmer_question_deliveries (
    subject_slug, sender_hash, message_kind, idempotency_key
  ) values (
    slug_input, sender_hash_input, message_kind_input, idempotency_key_input
  ) returning * into created_delivery;

  return query select
    'CREATED', created_delivery.id, created_delivery.created_at,
    created_delivery.notification_state;
end;
$$;

create or replace function public.record_featured_farmer_question_notification(
  delivery_id_input uuid,
  notification_state_input text,
  receipt_id_input text,
  failure_code_input text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_record public.featured_farmer_question_deliveries%rowtype;
  receipt_value text := nullif(btrim(coalesce(receipt_id_input, '')), '');
  failure_value text := nullif(btrim(coalesce(failure_code_input, '')), '');
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  if delivery_id_input is null
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

  select delivery.* into delivery_record
  from public.featured_farmer_question_deliveries delivery
  where delivery.id = delivery_id_input
  for update;
  if not found then return false; end if;
  if delivery_record.notification_state <> 'pending' then return true; end if;

  update public.featured_farmer_question_deliveries delivery
  set notification_state = notification_state_input,
      notification_receipt_id = receipt_value,
      notification_failure_code = failure_value,
      notification_attempted_at = now()
  where delivery.id = delivery_record.id;
  return true;
end;
$$;

create or replace function public.increment_featured_farmer_profile_view(
  slug_input text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count bigint;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;
  update public.featured_farmer_engagement_subjects subject
  set profile_view_count = subject.profile_view_count + 1,
      updated_at = now()
  where subject.slug = slug_input and subject.views_enabled
  returning subject.profile_view_count into updated_count;
  return updated_count;
end;
$$;

revoke all on table public.featured_farmer_engagement_subjects
  from public, anon, authenticated;
revoke all on table public.featured_farmer_question_deliveries
  from public, anon, authenticated;
revoke all on table public.featured_farmer_recommendations
  from public, anon, authenticated;
revoke all on table public.featured_farmer_recommendation_events
  from public, anon, authenticated;

revoke all on function public.get_featured_farmer_public_engagement(text)
  from public, anon, authenticated;
grant execute on function public.get_featured_farmer_public_engagement(text)
  to anon, authenticated;

revoke all on function public.get_my_featured_farmer_recommendation(text)
  from public, anon, authenticated;
grant execute on function public.get_my_featured_farmer_recommendation(text)
  to authenticated;

revoke all on function public.submit_featured_farmer_recommendation(
  text, text, text, boolean, uuid
) from public, anon, authenticated;
grant execute on function public.submit_featured_farmer_recommendation(
  text, text, text, boolean, uuid
) to authenticated;

revoke all on function public.withdraw_featured_farmer_recommendation(text)
  from public, anon, authenticated;
grant execute on function public.withdraw_featured_farmer_recommendation(text)
  to authenticated;

revoke all on function public.list_featured_farmer_recommendation_queue(integer)
  from public, anon, authenticated;
grant execute on function public.list_featured_farmer_recommendation_queue(integer)
  to authenticated;

revoke all on function public.moderate_featured_farmer_recommendation(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.moderate_featured_farmer_recommendation(
  uuid, text, text
) to authenticated;

revoke all on function public.reserve_featured_farmer_question_delivery(
  text, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.reserve_featured_farmer_question_delivery(
  text, text, text, uuid
) to service_role;

revoke all on function public.record_featured_farmer_question_notification(
  uuid, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.record_featured_farmer_question_notification(
  uuid, text, text, text
) to service_role;

revoke all on function public.increment_featured_farmer_profile_view(text)
  from public, anon, authenticated, service_role;
grant execute on function public.increment_featured_farmer_profile_view(text)
  to service_role;
