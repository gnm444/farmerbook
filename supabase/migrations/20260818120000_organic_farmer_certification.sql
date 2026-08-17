-- Organic status is documentary evidence, not a self-declared farming method.
-- Evidence stays private; only the reviewed status is exposed publicly.

create table public.organic_certification_submissions (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'revoked')),
  evidence_path text not null check (char_length(evidence_path) between 10 and 500),
  evidence_mime_type text not null
    check (evidence_mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  evidence_size_bytes bigint not null check (evidence_size_bytes between 1 and 10485760),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewer_note text check (reviewer_note is null or char_length(reviewer_note) <= 1000),
  updated_at timestamptz not null default now(),
  constraint organic_certification_review_provenance check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('verified', 'rejected', 'revoked') and reviewed_at is not null)
  )
);

create index organic_certification_review_queue_idx
  on public.organic_certification_submissions (status, submitted_at)
  where status = 'pending';

alter table public.organic_certification_submissions enable row level security;

create policy "farmers read own organic certification submission"
on public.organic_certification_submissions for select to authenticated
using (farmer_id = (select auth.uid()));

revoke all on public.organic_certification_submissions from anon, authenticated;
grant select on public.organic_certification_submissions to authenticated;
grant all on public.organic_certification_submissions to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'organic-certificates',
  'organic-certificates',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "farmers upload own organic certificate"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'organic-certificates'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_role = 'farmer'
      and profiles.farming_method = 'organic'
      and profiles.status = 'active'
  )
);

create policy "farmers read own organic certificate"
on storage.objects for select to authenticated
using (
  bucket_id = 'organic-certificates'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "farmers delete unverified organic certificate"
on storage.objects for delete to authenticated
using (
  bucket_id = 'organic-certificates'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1
    from public.organic_certification_submissions submission
    where submission.farmer_id = (select auth.uid())
      and submission.evidence_path = storage.objects.name
      and submission.status = 'verified'
  )
);

create or replace function public.submit_organic_certification(
  evidence_path_input text,
  evidence_mime_type_input text,
  evidence_size_bytes_input bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  farmer_id_value uuid := (select auth.uid());
  submission_id_value uuid;
begin
  if farmer_id_value is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;
  if evidence_path_input is null
     or evidence_path_input not like farmer_id_value::text || '/%'
     or char_length(evidence_path_input) > 500 then
    raise exception 'ORGANIC_CERTIFICATE_PATH_INVALID';
  end if;
  if evidence_mime_type_input not in ('application/pdf', 'image/jpeg', 'image/png')
     or evidence_size_bytes_input not between 1 and 10485760 then
    raise exception 'ORGANIC_CERTIFICATE_FILE_INVALID';
  end if;
  if not exists (
    select 1 from public.profiles
    where profiles.id = farmer_id_value
      and profiles.account_role = 'farmer'
      and profiles.farming_method = 'organic'
      and profiles.status = 'active'
  ) then
    raise exception 'ORGANIC_FARMER_REQUIRED';
  end if;
  if not exists (
    select 1 from storage.objects
    where objects.bucket_id = 'organic-certificates'
      and objects.name = evidence_path_input
  ) then
    raise exception 'ORGANIC_CERTIFICATE_UPLOAD_REQUIRED';
  end if;

  insert into public.organic_certification_submissions (
    farmer_id,
    status,
    evidence_path,
    evidence_mime_type,
    evidence_size_bytes,
    submitted_at,
    reviewed_at,
    reviewed_by,
    reviewer_note,
    updated_at
  ) values (
    farmer_id_value,
    'pending',
    evidence_path_input,
    evidence_mime_type_input,
    evidence_size_bytes_input,
    now(),
    null,
    null,
    null,
    now()
  )
  on conflict (farmer_id) do update set
    status = 'pending',
    evidence_path = excluded.evidence_path,
    evidence_mime_type = excluded.evidence_mime_type,
    evidence_size_bytes = excluded.evidence_size_bytes,
    submitted_at = excluded.submitted_at,
    reviewed_at = null,
    reviewed_by = null,
    reviewer_note = null,
    updated_at = now()
  returning id into submission_id_value;

  return submission_id_value;
end;
$$;

revoke all on function public.submit_organic_certification(text, text, bigint)
  from public, anon;
grant execute on function public.submit_organic_certification(text, text, bigint)
  to authenticated;

create or replace function public.review_organic_certification(
  submission_id_input uuid,
  decision_input text,
  reviewer_id_input uuid,
  reviewer_note_input text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission_value public.organic_certification_submissions%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;
  if decision_input not in ('verified', 'rejected') then
    raise exception 'ORGANIC_CERTIFICATION_DECISION_INVALID';
  end if;
  if reviewer_id_input is null or not exists (
       select 1 from public.profiles
       where profiles.id = reviewer_id_input
         and profiles.status = 'active'
     ) then
    raise exception 'ACTIVE_ADMIN_REQUIRED';
  end if;

  select * into submission_value
  from public.organic_certification_submissions
  where id = submission_id_input and status = 'pending'
  for update;
  if not found then
    raise exception 'PENDING_ORGANIC_CERTIFICATION_NOT_FOUND';
  end if;
  if decision_input = 'verified' and (
    not exists (
      select 1 from storage.objects
      where objects.bucket_id = 'organic-certificates'
        and objects.name = submission_value.evidence_path
    )
    or not exists (
      select 1 from public.profiles
      where profiles.id = submission_value.farmer_id
        and profiles.account_role = 'farmer'
        and profiles.farming_method = 'organic'
        and profiles.status = 'active'
    )
  ) then
    raise exception 'ORGANIC_CERTIFICATION_EVIDENCE_NOT_ELIGIBLE';
  end if;

  update public.organic_certification_submissions set
    status = decision_input,
    reviewed_at = now(),
    reviewed_by = reviewer_id_input,
    reviewer_note = nullif(trim(reviewer_note_input), ''),
    updated_at = now()
  where id = submission_id_input;
end;
$$;

revoke all on function public.review_organic_certification(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.review_organic_certification(uuid, text, uuid, text)
  to service_role;

create or replace function public.revoke_organic_certification_on_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.farming_method = 'organic'
     and (new.farming_method is distinct from 'organic' or new.status <> 'active') then
    update public.organic_certification_submissions set
      status = 'revoked',
      reviewed_at = now(),
      reviewer_note = 'Automatically revoked because the profile is no longer an active organic-practices profile.',
      updated_at = now()
    where farmer_id = new.id and status in ('pending', 'verified');
  end if;
  return new;
end;
$$;

create trigger profiles_revoke_organic_certification
after update of farming_method, status on public.profiles
for each row execute function public.revoke_organic_certification_on_profile_change();

revoke all on function public.revoke_organic_certification_on_profile_change()
  from public, anon, authenticated;

create view public.public_organic_certification_status
with (security_barrier = true)
as
select
  submission.farmer_id as profile_id,
  true as verified,
  submission.reviewed_at as verified_at
from public.organic_certification_submissions submission
join public.profiles profile on profile.id = submission.farmer_id
where submission.status = 'verified'
  and profile.account_role = 'farmer'
  and profile.farming_method = 'organic'
  and profile.status = 'active'
  and exists (
    select 1 from storage.objects
    where objects.bucket_id = 'organic-certificates'
      and objects.name = submission.evidence_path
  );

revoke all on public.public_organic_certification_status from public;
grant select on public.public_organic_certification_status to anon, authenticated;

comment on view public.public_organic_certification_status is
  'Public proof status only. Certificate files and reviewer notes remain private.';

create or replace function public.prevent_listing_organic_certification_claim()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(coalesce(new.certifications, array[]::text[])) claim
    where claim ~* '\m(certified[[:space:]-]*organic|organic[[:space:]-]*certif|npop|pgs[[:space:]-]*india)\M'
  ) then
    raise exception 'ORGANIC_CERTIFICATION_IS_AUTHORITATIVE_PROFILE_STATUS';
  end if;
  return new;
end;
$$;

create trigger produce_listings_prevent_organic_certification_claim
before insert or update of certifications on public.produce_listings
for each row execute function public.prevent_listing_organic_certification_claim();

revoke all on function public.prevent_listing_organic_certification_claim()
  from public, anon, authenticated;
