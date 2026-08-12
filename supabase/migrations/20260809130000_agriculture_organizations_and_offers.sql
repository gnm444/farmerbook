-- Agriculture organizations, offers, shared enquiries, private verification,
-- and atomic onboarding completion. Public catalog rows are intentionally
-- separated from registration, contact, evidence, and enquiry data.

alter table public.onboarding_progress
  add column last_idempotency_fingerprint text
    check (last_idempotency_fingerprint ~ '^[0-9a-f]{64}$');

grant insert (last_idempotency_fingerprint)
  on public.onboarding_progress to authenticated;
grant update (last_idempotency_fingerprint)
  on public.onboarding_progress to authenticated;

alter table public.profiles
  drop constraint if exists profiles_public_home_role_check;
alter table public.profiles
  add constraint profiles_public_home_role_check
    check (
      account_role in ('farmer', 'wholesaler')
      or not public_profile_enabled
    );
create index profiles_public_supplier_home_idx
  on public.profiles (handle)
  where status = 'active'
    and account_role in ('farmer', 'wholesaler')
    and public_profile_enabled;

create table public.ecosystem_release_controls (
  control_key text primary key check (control_key in (
    'resumable_onboarding', 'agri_businesses', 'business_offers',
    'extended_locales'
  )),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.ecosystem_release_controls (control_key, enabled) values
  ('resumable_onboarding', false),
  ('agri_businesses', false),
  ('business_offers', false),
  ('extended_locales', false);

create trigger ecosystem_release_controls_set_updated_at
before update on public.ecosystem_release_controls
for each row execute function public.set_updated_at();

alter table public.ecosystem_release_controls enable row level security;
revoke all on public.ecosystem_release_controls from public, anon, authenticated;
grant select, update (enabled) on public.ecosystem_release_controls to service_role;

create or replace function public.is_ecosystem_release_enabled(
  control_key_input text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select control.enabled
    from public.ecosystem_release_controls control
    where control.control_key = control_key_input
  ), false);
$$;

revoke all on function public.is_ecosystem_release_enabled(text)
  from public, anon, authenticated;
grant execute on function public.is_ecosystem_release_enabled(text)
  to anon, authenticated;

drop policy if exists "participants update own profile" on public.profiles;
create policy "participants update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and public.can_update_own_profile(id, account_role, onboarding_complete)
  and (
    preferred_locale in ('en-IN', 'hi-IN', 'mr-IN')
    or public.is_ecosystem_release_enabled('extended_locales')
  )
);

drop policy if exists "visitors send enquiries for active listings"
  on public.market_enquiries;
drop policy if exists "visitors send unlinked enquiries for active listings"
  on public.market_enquiries;
revoke insert on public.market_enquiries from anon;
revoke insert (
  listing_id, buyer_id, conversation_id, buyer_name, business_name, email,
  phone, location, quantity_needed, need_by, message
) on public.market_enquiries from anon;

-- A browser may save an in-progress draft, but only finalize_onboarding may
-- mark it complete. Completed records retain their idempotency receipt.
drop policy if exists "participants create own onboarding progress"
  on public.onboarding_progress;
drop policy if exists "participants update own onboarding progress"
  on public.onboarding_progress;
drop policy if exists "participants delete own onboarding progress"
  on public.onboarding_progress;
create policy "participants create own onboarding progress"
on public.onboarding_progress for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and public.is_ecosystem_release_enabled('resumable_onboarding')
  and (
    not (draft_data ? 'locale')
    or (draft_data ->> 'locale') in ('en-IN', 'hi-IN', 'mr-IN')
    or public.is_ecosystem_release_enabled('extended_locales')
  )
  and status in ('not_started', 'in_progress')
);
create policy "participants update own incomplete onboarding progress"
on public.onboarding_progress for update to authenticated
using (
  profile_id = (select auth.uid())
  and public.is_ecosystem_release_enabled('resumable_onboarding')
  and status <> 'complete'
)
with check (
  profile_id = (select auth.uid())
  and public.is_ecosystem_release_enabled('resumable_onboarding')
  and (
    not (draft_data ? 'locale')
    or (draft_data ->> 'locale') in ('en-IN', 'hi-IN', 'mr-IN')
    or public.is_ecosystem_release_enabled('extended_locales')
  )
  and status in ('not_started', 'in_progress')
);
create policy "participants delete own incomplete onboarding progress"
on public.onboarding_progress for delete to authenticated
using (
  profile_id = (select auth.uid())
  and public.is_ecosystem_release_enabled('resumable_onboarding')
  and status <> 'complete'
);

create table public.agriculture_legacy_crop_backfill_audit (
  migration_key text primary key,
  profiles_scanned integer not null check (profiles_scanned >= 0),
  values_scanned integer not null check (values_scanned >= 0),
  mapped_value_count integer not null check (mapped_value_count >= 0),
  safe_custom_value_count integer not null check (safe_custom_value_count >= 0),
  unsafe_skipped_count integer not null check (unsafe_skipped_count >= 0),
  mapped_affinity_insert_count integer not null check (mapped_affinity_insert_count >= 0),
  custom_request_insert_count integer not null check (custom_request_insert_count >= 0),
  custom_affinity_insert_count integer not null check (custom_affinity_insert_count >= 0),
  executed_at timestamptz not null default now()
);

create temporary table agriculture_legacy_crop_values on commit drop as
select distinct
  profile.id as profile_id,
  profile.account_role,
  crop.original_label,
  lower(regexp_replace(btrim(normalize(crop.original_label, NFKC)), '[[:space:]]+', ' ', 'g'))
    as normalized_label,
  case
    when lower(regexp_replace(btrim(normalize(crop.original_label, NFKC)), '[[:space:]]+', ' ', 'g'))
      in ('tomato', 'tomatoes') then 'tomato'
    when lower(regexp_replace(btrim(normalize(crop.original_label, NFKC)), '[[:space:]]+', ' ', 'g'))
      in ('onion', 'onions') then 'onion'
    when lower(regexp_replace(btrim(normalize(crop.original_label, NFKC)), '[[:space:]]+', ' ', 'g'))
      in ('grape', 'grapes') then 'grapes'
    when lower(regexp_replace(btrim(normalize(crop.original_label, NFKC)), '[[:space:]]+', ' ', 'g'))
      in ('pomegranate', 'pomegranates') then 'pomegranate'
    when lower(regexp_replace(btrim(normalize(crop.original_label, NFKC)), '[[:space:]]+', ' ', 'g'))
      in ('okra', 'lady finger', 'ladyfinger') then 'okra'
    when lower(regexp_replace(btrim(normalize(crop.original_label, NFKC)), '[[:space:]]+', ' ', 'g'))
      in ('millet', 'millets') then 'other-millets'
    else null
  end as mapped_slug,
  case
    when char_length(btrim(crop.original_label)) not between 2 and 80 then false
    when crop.original_label ~ '[[:cntrl:]]' then false
    when translate(
      crop.original_label,
      chr(8203) || chr(8234) || chr(8235) || chr(8236) || chr(8237) ||
      chr(8238) || chr(8288) || chr(8294) || chr(8295) || chr(8296) ||
      chr(8297) || chr(65279),
      ''
    ) <> crop.original_label then false
    when crop.original_label ~* '(https?://|www[.]|[[:alnum:]-]+[.](com|in|org|net|co|io)([^[:alnum:]]|$))' then false
    when crop.original_label ~ '@' then false
    when crop.original_label ~ '[+]?[0-9][0-9 ().-]{6,}[0-9]' then false
    when crop.original_label ~* '(buy[[:space:]]+now|call[[:space:]]+now|contact[[:space:]]+us|best[[:space:]]+price|limited[[:space:]]+time|discount|sale|offer|whats?app|[0-9]+[[:space:]]*%[[:space:]]*off)' then false
    else true
  end as is_safe
from public.profiles profile
cross join lateral unnest(profile.crops) crop(original_label)
where btrim(crop.original_label) <> '';

create temporary table agriculture_legacy_crop_backfill_counts (
  mapped_affinity_insert_count integer not null default 0,
  custom_request_insert_count integer not null default 0,
  custom_affinity_insert_count integer not null default 0
) on commit drop;
insert into agriculture_legacy_crop_backfill_counts default values;

with inserted as (
  insert into public.profile_category_affinities (
    profile_id, category_slug, relationship
  )
  select
    legacy.profile_id,
    legacy.mapped_slug,
    case legacy.account_role
      when 'farmer' then 'farms'
      when 'customer' then 'interested_in'
      when 'wholesaler' then 'buys'
      else 'services'
    end
  from agriculture_legacy_crop_values legacy
  where legacy.mapped_slug is not null
  on conflict do nothing
  returning 1
)
update agriculture_legacy_crop_backfill_counts
set mapped_affinity_insert_count = (select count(*) from inserted);

with inserted as (
  insert into public.custom_category_requests (
    requested_by, source, domain, relationship, original_label, locale_tag
  )
  select
    legacy.profile_id,
    'legacy_import',
    'farming_activity',
    case legacy.account_role
      when 'farmer' then 'farms'
      when 'customer' then 'interested_in'
      when 'wholesaler' then 'buys'
      else 'services'
    end,
    legacy.original_label,
    'en-IN'
  from agriculture_legacy_crop_values legacy
  where legacy.mapped_slug is null and legacy.is_safe
  on conflict (requested_by, domain, normalized_label)
    where status in ('pending', 'approved', 'merged')
  do nothing
  returning 1
)
update agriculture_legacy_crop_backfill_counts
set custom_request_insert_count = (select count(*) from inserted);

with inserted as (
  insert into public.profile_custom_category_affinities (
    profile_id, custom_category_request_id, relationship
  )
  select
    legacy.profile_id,
    request.id,
    request.relationship
  from agriculture_legacy_crop_values legacy
  join public.custom_category_requests request
    on request.requested_by = legacy.profile_id
   and request.domain = 'farming_activity'
   and request.normalized_label = legacy.normalized_label
   and request.status in ('pending', 'approved', 'merged')
  where legacy.mapped_slug is null and legacy.is_safe
  on conflict do nothing
  returning 1
)
update agriculture_legacy_crop_backfill_counts
set custom_affinity_insert_count = (select count(*) from inserted);

insert into public.agriculture_legacy_crop_backfill_audit (
  migration_key, profiles_scanned, values_scanned, mapped_value_count,
  safe_custom_value_count, unsafe_skipped_count,
  mapped_affinity_insert_count, custom_request_insert_count,
  custom_affinity_insert_count
)
select
  '20260809130000',
  (select count(distinct profile_id) from agriculture_legacy_crop_values),
  (select count(*) from agriculture_legacy_crop_values),
  (select count(*) from agriculture_legacy_crop_values where mapped_slug is not null),
  (select count(*) from agriculture_legacy_crop_values where mapped_slug is null and is_safe),
  (select count(*) from agriculture_legacy_crop_values where mapped_slug is null and not is_safe),
  counts.mapped_affinity_insert_count,
  counts.custom_request_insert_count,
  counts.custom_affinity_insert_count
from agriculture_legacy_crop_backfill_counts counts
on conflict (migration_key) do nothing;

do $$
declare
  audit_value public.agriculture_legacy_crop_backfill_audit%rowtype;
begin
  select * into audit_value
  from public.agriculture_legacy_crop_backfill_audit
  where migration_key = '20260809130000';
  raise notice 'Agriculture crop backfill: scanned=%, mapped=%, safe_custom=%, unsafe_skipped=%',
    audit_value.values_scanned,
    audit_value.mapped_value_count,
    audit_value.safe_custom_value_count,
    audit_value.unsafe_skipped_count;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    check (char_length(slug) between 3 and 80),
  display_name text not null
    check (char_length(btrim(display_name)) between 2 and 120),
  organization_type text not null check (organization_type in (
    'manufacturer_brand', 'dealer_distributor', 'retailer',
    'wholesaler_trader', 'processor_exporter', 'fpo_cooperative',
    'custom_hiring_rental_centre', 'logistics_warehouse',
    'finance_insurance', 'advisory_training_research', 'ngo',
    'government_support_body'
  )),
  description text not null
    check (char_length(btrim(description)) between 20 and 1500),
  state text not null check (char_length(btrim(state)) between 2 and 80),
  district text check (
    district is null or char_length(btrim(district)) between 2 and 80
  ),
  website_url text check (
    website_url is null
    or (char_length(website_url) <= 300 and website_url ~ '^https://')
  ),
  publication_state text not null default 'draft'
    check (publication_state in ('draft', 'published', 'unpublished')),
  verification_state text not null default 'unverified'
    check (verification_state in ('unverified', 'pending', 'verified', 'rejected')),
  moderation_state text not null default 'active'
    check (moderation_state in ('active', 'restricted', 'suspended')),
  normalized_search text generated always as (
    lower(regexp_replace(btrim(display_name || ' ' || description), '[[:space:]]+', ' ', 'g'))
  ) stored,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (publication_state <> 'published' or published_at is not null)
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in (
    'owner', 'admin', 'editor', 'enquiry_agent', 'viewer'
  )),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended', 'removed')),
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, profile_id),
  check ((status = 'active' and joined_at is not null) or status <> 'active')
);

create table public.organization_membership_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  subject_profile_id uuid not null,
  action text not null check (action in ('created', 'updated', 'removed')),
  old_role text,
  new_role text,
  old_status text,
  new_status text,
  created_at timestamptz not null default now(),
  check (old_role is null or old_role in (
    'owner', 'admin', 'editor', 'enquiry_agent', 'viewer'
  )),
  check (new_role is null or new_role in (
    'owner', 'admin', 'editor', 'enquiry_agent', 'viewer'
  )),
  check (old_status is null or old_status in (
    'invited', 'active', 'suspended', 'removed'
  )),
  check (new_status is null or new_status in (
    'invited', 'active', 'suspended', 'removed'
  ))
);

create table public.organization_category_affinities (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_slug text not null references public.agriculture_categories(slug)
    on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (organization_id, category_slug)
);

create table public.organization_service_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  state text not null check (char_length(btrim(state)) between 2 and 80),
  district text check (
    district is null or char_length(btrim(district)) between 2 and 80
  ),
  service_radius_km integer check (service_radius_km between 1 and 2000),
  created_at timestamptz not null default now()
);

create unique index organization_service_areas_unique_idx
  on public.organization_service_areas (
    organization_id, lower(state), lower(coalesce(district, ''))
  );

create table public.organization_private_details (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,
  registration_type text check (
    registration_type is null or char_length(btrim(registration_type)) between 2 and 80
  ),
  registration_number text check (
    registration_number is null
    or char_length(btrim(registration_number)) between 2 and 100
  ),
  gstin text check (gstin is null or gstin ~ '^[0-9A-Z]{15}$'),
  cin text check (cin is null or cin ~ '^[A-Z0-9]{21}$'),
  contact_name text check (
    contact_name is null or char_length(btrim(contact_name)) between 2 and 100
  ),
  contact_email text check (
    contact_email is null
    or (char_length(contact_email) <= 160 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
  ),
  contact_phone text check (
    contact_phone is null or char_length(btrim(contact_phone)) between 7 and 24
  ),
  public_contact_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_verification_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'submitted' check (status in (
    'submitted', 'in_review', 'approved', 'rejected', 'withdrawn'
  )),
  evidence_path text check (
    evidence_path is null
    or (
      char_length(evidence_path) between 38 and 500
      and evidence_path like organization_id::text || '/%'
    )
  ),
  evidence_mime_type text check (
    evidence_mime_type is null
    or evidence_mime_type in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  evidence_size_bytes integer check (
    evidence_size_bytes is null or evidence_size_bytes between 1 and 10485760
  ),
  applicant_note text not null default ''
    check (char_length(applicant_note) <= 1000),
  moderator_note text not null default ''
    check (char_length(moderator_note) <= 2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
    or status in ('submitted', 'in_review', 'withdrawn')
  ),
  check (
    (evidence_path is null and evidence_mime_type is null and evidence_size_bytes is null)
    or (evidence_path is not null and evidence_mime_type is not null and evidence_size_bytes is not null)
  )
);

create table public.business_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in (
    'product', 'service', 'rental', 'promotion', 'finance', 'insurance',
    'advisory', 'training', 'support'
  )),
  content_locale text not null default 'en-IN'
    references public.supported_locales(locale_tag) on delete restrict,
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null
    check (char_length(btrim(description)) between 20 and 3000),
  terms text not null default '' check (char_length(terms) <= 2000),
  valid_from date not null,
  valid_until date not null,
  price_model text not null check (price_model in (
    'fixed', 'range', 'quote', 'free', 'subsidized'
  )),
  currency text check (currency is null or currency = 'INR'),
  price_min numeric(14, 2) check (
    price_min is null or price_min between 0.01 and 1000000000
  ),
  price_max numeric(14, 2) check (
    price_max is null or price_max between 0.01 and 1000000000
  ),
  price_unit text check (price_unit is null or price_unit in (
    'each', 'piece', 'set', 'kg', 'litre', 'tray', 'dozen', 'hour', 'day',
    'month', 'acre', 'hectare', 'service'
  )),
  publication_state text not null default 'draft' check (publication_state in (
    'draft', 'published', 'paused', 'archived'
  )),
  moderation_state text not null default 'not_required' check (moderation_state in (
    'not_required', 'pending', 'approved', 'rejected'
  )),
  expiry_state text not null default 'scheduled' check (expiry_state in (
    'scheduled', 'active', 'expired'
  )),
  requires_moderation_review boolean not null default false,
  normalized_search text generated always as (
    lower(regexp_replace(btrim(title || ' ' || description), '[[:space:]]+', ' ', 'g'))
  ) stored,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until >= valid_from),
  check (valid_until <= (valid_from + interval '5 years')),
  check (
    (price_model = 'fixed' and currency = 'INR' and price_min is not null and price_max is null)
    or (
      price_model = 'range' and currency = 'INR' and price_min is not null
      and price_max is not null and price_max >= price_min
    )
    or (
      price_model in ('quote', 'free') and currency is null
      and price_min is null and price_max is null and price_unit is null
    )
    or (
      price_model = 'subsidized' and currency = 'INR'
      and price_min is not null and price_max is null
    )
  ),
  check (price_min is null or price_unit is not null),
  check (publication_state <> 'published' or published_at is not null),
  check (
    not requires_moderation_review
    or publication_state <> 'published'
    or moderation_state = 'approved'
  )
);

create table public.business_offer_categories (
  offer_id uuid not null references public.business_offers(id) on delete cascade,
  category_slug text not null references public.agriculture_categories(slug)
    on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (offer_id, category_slug)
);

create table public.business_offer_service_areas (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.business_offers(id) on delete cascade,
  state text not null check (char_length(btrim(state)) between 2 and 80),
  district text check (
    district is null or char_length(btrim(district)) between 2 and 80
  ),
  service_radius_km integer check (service_radius_km between 1 and 2000),
  created_at timestamptz not null default now()
);

create unique index business_offer_service_areas_unique_idx
  on public.business_offer_service_areas (
    offer_id, lower(state), lower(coalesce(district, ''))
  );

create table public.business_offer_media (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.business_offers(id) on delete cascade,
  storage_path text not null unique
    check (char_length(storage_path) between 38 and 500),
  mime_type text not null check (mime_type in (
    'image/jpeg', 'image/png', 'image/webp'
  )),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  alt_text text not null check (char_length(btrim(alt_text)) between 2 and 200),
  sort_order smallint not null default 0 check (sort_order between 0 and 20),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.certification_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  offer_id uuid references public.business_offers(id) on delete cascade,
  claim_type text not null check (claim_type in (
    'registration', 'organic', 'quality', 'traceability', 'finance',
    'insurance', 'pesticide', 'veterinary', 'other'
  )),
  claim_text text not null check (char_length(btrim(claim_text)) between 2 and 300),
  issuer_name text check (
    issuer_name is null or char_length(btrim(issuer_name)) between 2 and 160
  ),
  certificate_number text check (
    certificate_number is null
    or char_length(btrim(certificate_number)) between 2 and 100
  ),
  valid_from date,
  valid_until date,
  risk_level text not null default 'standard'
    check (risk_level in ('standard', 'high')),
  verification_state text not null default 'self_declared' check (
    verification_state in ('self_declared', 'pending', 'reviewed', 'rejected', 'expired')
  ),
  publication_state text not null default 'draft'
    check (publication_state in ('draft', 'published', 'archived')),
  moderation_state text not null default 'active'
    check (moderation_state in ('active', 'restricted', 'removed')),
  evidence_path text check (
    evidence_path is null
    or (
      char_length(evidence_path) between 38 and 500
      and evidence_path like organization_id::text || '/%'
    )
  ),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text not null default '' check (char_length(reviewer_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from),
  check (
    claim_type not in ('finance', 'insurance', 'pesticide', 'veterinary')
    or risk_level = 'high'
  ),
  check (
    publication_state <> 'published'
    or risk_level = 'standard'
    or verification_state = 'reviewed'
  ),
  check (
    verification_state <> 'reviewed'
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.business_offer_enquiries (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.business_offers(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key uuid not null,
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  quantity_needed text check (
    quantity_needed is null
    or char_length(btrim(quantity_needed)) between 1 and 120
  ),
  need_by date,
  status text not null default 'new' check (status in (
    'new', 'open', 'in_progress', 'responded', 'closed', 'spam'
  )),
  offer_snapshot jsonb not null
    check (jsonb_typeof(offer_snapshot) = 'object')
    check (pg_column_size(offer_snapshot) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, offer_id, idempotency_key)
);

create table public.business_offer_enquiry_events (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.business_offer_enquiries(id)
    on delete cascade,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'message', 'status_changed', 'assigned', 'unassigned', 'note'
  )),
  body text not null default '' check (char_length(body) <= 2000),
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
    check (pg_column_size(metadata) <= 8192),
  created_at timestamptz not null default now(),
  check (from_status is null or from_status in (
    'new', 'open', 'in_progress', 'responded', 'closed', 'spam'
  )),
  check (to_status is null or to_status in (
    'new', 'open', 'in_progress', 'responded', 'closed', 'spam'
  ))
);

create table public.business_offer_enquiry_assignments (
  enquiry_id uuid not null references public.business_offer_enquiries(id)
    on delete cascade,
  assignee_profile_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  primary key (enquiry_id, assignee_profile_id),
  check ((active and unassigned_at is null) or (not active and unassigned_at is not null))
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();
create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();
create trigger organization_private_details_set_updated_at
before update on public.organization_private_details
for each row execute function public.set_updated_at();
create trigger organization_verification_requests_set_updated_at
before update on public.organization_verification_requests
for each row execute function public.set_updated_at();
create trigger business_offers_set_updated_at
before update on public.business_offers
for each row execute function public.set_updated_at();
create trigger business_offer_media_set_updated_at
before update on public.business_offer_media
for each row execute function public.set_updated_at();
create trigger certification_claims_set_updated_at
before update on public.certification_claims
for each row execute function public.set_updated_at();
create trigger business_offer_enquiries_set_updated_at
before update on public.business_offer_enquiries
for each row execute function public.set_updated_at();

create or replace function public.validate_certification_claim_offer_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.offer_id is not null and not exists (
    select 1 from public.business_offers offer
    where offer.id = new.offer_id
      and offer.organization_id = new.organization_id
  ) then
    raise exception 'Certification claim offer must belong to the same organization'
      using errcode = '23514', detail = 'CERTIFICATION_OFFER_ORGANIZATION_MISMATCH';
  end if;
  return new;
end;
$$;

create trigger certification_claims_validate_offer_owner
before insert or update of organization_id, offer_id on public.certification_claims
for each row execute function public.validate_certification_claim_offer_owner();

revoke all on function public.validate_certification_claim_offer_owner()
  from public, anon, authenticated;

create or replace function public.invalidate_edited_certification_claim_trust()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.offer_id is distinct from old.offer_id
    or new.claim_type is distinct from old.claim_type
    or new.claim_text is distinct from old.claim_text
    or new.issuer_name is distinct from old.issuer_name
    or new.certificate_number is distinct from old.certificate_number
    or new.valid_from is distinct from old.valid_from
    or new.valid_until is distinct from old.valid_until
    or new.risk_level is distinct from old.risk_level
    or new.evidence_path is distinct from old.evidence_path
  then
    new.verification_state := case
      when new.risk_level = 'high' then 'pending'
      else 'self_declared'
    end;
    new.publication_state := 'draft';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.reviewer_note := '';
  end if;
  return new;
end;
$$;

create trigger certification_claims_invalidate_edited_trust
before update of
  organization_id, offer_id, claim_type, claim_text, issuer_name,
  certificate_number, valid_from, valid_until, risk_level, evidence_path
on public.certification_claims
for each row execute function public.invalidate_edited_certification_claim_trust();

revoke all on function public.invalidate_edited_certification_claim_trust()
  from public, anon, authenticated;

create index organizations_public_cursor_idx
  on public.organizations (published_at desc, id desc)
  where publication_state = 'published' and moderation_state = 'active';
create index organizations_type_state_cursor_idx
  on public.organizations (organization_type, state, published_at desc, id desc)
  where publication_state = 'published' and moderation_state = 'active';
create index organizations_search_idx
  on public.organizations using gin (to_tsvector('simple', normalized_search));
create index organization_memberships_profile_idx
  on public.organization_memberships (profile_id, status, organization_id);
create index organization_memberships_active_role_idx
  on public.organization_memberships (organization_id, role, profile_id)
  where status = 'active';
create index organization_membership_audit_org_idx
  on public.organization_membership_audit (organization_id, created_at desc, id desc);
create index organization_category_affinities_category_idx
  on public.organization_category_affinities (category_slug, organization_id);
create index organization_service_areas_discovery_idx
  on public.organization_service_areas (
    lower(state), lower(coalesce(district, '')), organization_id
  );
create index organization_verification_queue_idx
  on public.organization_verification_requests (status, created_at, id)
  where status in ('submitted', 'in_review');
create unique index organization_verification_one_active_idx
  on public.organization_verification_requests (organization_id)
  where status in ('submitted', 'in_review');

create index business_offers_public_cursor_idx
  on public.business_offers (published_at desc, id desc)
  where publication_state = 'published'
    and moderation_state in ('not_required', 'approved');
create index business_offers_kind_cursor_idx
  on public.business_offers (kind, published_at desc, id desc)
  where publication_state = 'published'
    and moderation_state in ('not_required', 'approved');
create index business_offers_organization_idx
  on public.business_offers (organization_id, publication_state, updated_at desc);
create index business_offers_validity_idx
  on public.business_offers (valid_until, valid_from, publication_state);
create index business_offers_price_idx
  on public.business_offers (price_model, price_unit, price_min, price_max);
create index business_offers_search_idx
  on public.business_offers using gin (to_tsvector('simple', normalized_search));
create index business_offer_categories_discovery_idx
  on public.business_offer_categories (category_slug, offer_id);
create index business_offer_service_areas_discovery_idx
  on public.business_offer_service_areas (
    lower(state), lower(coalesce(district, '')), offer_id
  );
create index business_offer_media_offer_idx
  on public.business_offer_media (offer_id, status, sort_order, id);
create index certification_claims_org_idx
  on public.certification_claims (organization_id, publication_state, created_at desc);
create index certification_claims_review_idx
  on public.certification_claims (verification_state, created_at, id)
  where verification_state = 'pending';
create index business_offer_enquiries_requester_idx
  on public.business_offer_enquiries (requester_id, created_at desc, id desc);
create index business_offer_enquiries_org_queue_idx
  on public.business_offer_enquiries (organization_id, status, updated_at desc, id desc);
create index business_offer_enquiry_events_timeline_idx
  on public.business_offer_enquiry_events (enquiry_id, created_at, id);
create index business_offer_enquiry_assignments_assignee_idx
  on public.business_offer_enquiry_assignments (assignee_profile_id, active, assigned_at desc);

create or replace function public.can_manage_organization(
  organization_id_input uuid,
  minimum_role_input text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_ecosystem_release_enabled('agri_businesses') and exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization
      on organization.id = membership.organization_id
    join public.profiles actor on actor.id = membership.profile_id
    where membership.organization_id = organization_id_input
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
      and actor.status = 'active'
      and actor.onboarding_complete
      and organization.moderation_state <> 'suspended'
      and case minimum_role_input
        when 'owner' then membership.role = 'owner'
        when 'admin' then membership.role in ('owner', 'admin')
        when 'editor' then membership.role in ('owner', 'admin', 'editor')
        when 'enquiry_agent' then membership.role in ('owner', 'admin', 'enquiry_agent')
        when 'viewer' then membership.role in (
          'owner', 'admin', 'editor', 'enquiry_agent', 'viewer'
        )
        else false
      end
  );
$$;

create or replace function public.can_respond_to_organization_enquiry(
  organization_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_ecosystem_release_enabled('agri_businesses')
    and public.is_ecosystem_release_enabled('business_offers')
    and public.can_manage_organization(organization_id_input, 'enquiry_agent');
$$;

create or replace function public.is_public_organization(
  organization_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_ecosystem_release_enabled('agri_businesses') and exists (
    select 1
    from public.organizations
    where organizations.id = organization_id_input
      and organizations.publication_state = 'published'
      and organizations.moderation_state = 'active'
  );
$$;

create or replace function public.is_public_business_offer(
  offer_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_ecosystem_release_enabled('agri_businesses')
    and public.is_ecosystem_release_enabled('business_offers')
    and exists (
    select 1
    from public.business_offers offer
    join public.organizations organization on organization.id = offer.organization_id
    where offer.id = offer_id_input
      and offer.publication_state = 'published'
      and offer.moderation_state in ('not_required', 'approved')
      and offer.valid_from <= current_date
      and offer.valid_until >= current_date
      and offer.expiry_state <> 'expired'
      and organization.publication_state = 'published'
      and organization.moderation_state = 'active'
  );
$$;

create or replace function public.can_access_business_offer_enquiry(
  enquiry_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_ecosystem_release_enabled('agri_businesses')
    and public.is_ecosystem_release_enabled('business_offers')
    and exists (
    select 1
    from public.business_offer_enquiries enquiry
    join public.profiles actor on actor.id = (select auth.uid())
    where enquiry.id = enquiry_id_input
      and actor.status = 'active'
      and actor.onboarding_complete
      and (
        enquiry.requester_id = actor.id
        or public.can_respond_to_organization_enquiry(enquiry.organization_id)
        or public.is_admin()
      )
  );
$$;

revoke all on function public.can_manage_organization(uuid, text)
  from public, anon, authenticated;
grant execute on function public.can_manage_organization(uuid, text)
  to authenticated;
revoke all on function public.can_respond_to_organization_enquiry(uuid)
  from public, anon, authenticated;
grant execute on function public.can_respond_to_organization_enquiry(uuid)
  to authenticated;
revoke all on function public.is_public_organization(uuid)
  from public, anon, authenticated;
grant execute on function public.is_public_organization(uuid)
  to anon, authenticated;
revoke all on function public.is_public_business_offer(uuid)
  from public, anon, authenticated;
grant execute on function public.is_public_business_offer(uuid)
  to anon, authenticated;
revoke all on function public.can_access_business_offer_enquiry(uuid)
  from public, anon, authenticated;
grant execute on function public.can_access_business_offer_enquiry(uuid)
  to authenticated;

create or replace function public.guard_organization_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  losing_last_owner boolean := false;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old.organization_id::text, 0)
    );
  end if;

  if tg_op = 'UPDATE'
     and actor_id is not null
     and actor_id = old.profile_id
     and (new.role <> old.role or new.status <> old.status)
  then
    raise exception 'Members cannot promote or change their own membership'
      using errcode = '42501', detail = 'SELF_MEMBERSHIP_CHANGE';
  end if;

  if tg_op = 'DELETE' then
    losing_last_owner := old.role = 'owner' and old.status = 'active';
  elsif tg_op = 'UPDATE' then
    losing_last_owner := old.role = 'owner' and old.status = 'active'
      and (new.role <> 'owner' or new.status <> 'active');
  end if;

  if losing_last_owner and not exists (
    select 1
    from public.organization_memberships other_owner
    where other_owner.organization_id = old.organization_id
      and other_owner.profile_id <> old.profile_id
      and other_owner.role = 'owner'
      and other_owner.status = 'active'
  ) then
    raise exception 'Transfer ownership before removing the last owner'
      using errcode = '23514', detail = 'LAST_OWNER_REQUIRED';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger organization_memberships_guard_before_change
before update or delete on public.organization_memberships
for each row execute function public.guard_organization_membership_change();

create or replace function public.audit_organization_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.organization_membership_audit (
      organization_id, actor_profile_id, subject_profile_id, action,
      new_role, new_status
    ) values (
      new.organization_id, (select auth.uid()), new.profile_id, 'created',
      new.role, new.status
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.organization_membership_audit (
      organization_id, actor_profile_id, subject_profile_id, action,
      old_role, new_role, old_status, new_status
    ) values (
      new.organization_id, (select auth.uid()), new.profile_id, 'updated',
      old.role, new.role, old.status, new.status
    );
    return new;
  else
    insert into public.organization_membership_audit (
      organization_id, actor_profile_id, subject_profile_id, action,
      old_role, old_status
    ) values (
      old.organization_id, (select auth.uid()), old.profile_id, 'removed',
      old.role, old.status
    );
    return old;
  end if;
end;
$$;

create trigger organization_memberships_audit_after_change
after insert or update or delete on public.organization_memberships
for each row execute function public.audit_organization_membership_change();

create or replace function public.prevent_immutable_row_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit and event rows are immutable'
    using errcode = '55000', detail = 'IMMUTABLE_ROW';
end;
$$;

create trigger organization_membership_audit_immutable
before update or delete on public.organization_membership_audit
for each row execute function public.prevent_immutable_row_change();
create trigger business_offer_enquiry_events_immutable
before update or delete on public.business_offer_enquiry_events
for each row execute function public.prevent_immutable_row_change();

create or replace function public.validate_business_offer_media_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id_value uuid;
begin
  select organization_id into organization_id_value
  from public.business_offers
  where id = new.offer_id;

  if organization_id_value is null
     or split_part(new.storage_path, '/', 1) <> organization_id_value::text
  then
    raise exception 'Offer media must use the organization folder'
      using errcode = '23514', detail = 'INVALID_MEDIA_PATH';
  end if;
  return new;
end;
$$;

create trigger business_offer_media_path_before_write
before insert or update of offer_id, storage_path on public.business_offer_media
for each row execute function public.validate_business_offer_media_path();

create or replace function public.validate_business_offer_enquiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.business_offers offer
    where offer.id = new.offer_id
      and offer.organization_id = new.organization_id
  ) then
    raise exception 'Enquiry organization does not own the offer'
      using errcode = '23514', detail = 'ENQUIRY_ORGANIZATION_MISMATCH';
  end if;
  return new;
end;
$$;

create trigger business_offer_enquiry_validate_before_insert
before insert on public.business_offer_enquiries
for each row execute function public.validate_business_offer_enquiry();

create or replace function public.validate_enquiry_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id_value uuid;
begin
  select organization_id into organization_id_value
  from public.business_offer_enquiries
  where id = new.enquiry_id;

  if not exists (
    select 1
    from public.organization_memberships membership
    join public.profiles assignee on assignee.id = membership.profile_id
    where membership.organization_id = organization_id_value
      and membership.profile_id = new.assignee_profile_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'enquiry_agent')
      and assignee.status = 'active'
      and assignee.onboarding_complete
  ) then
    raise exception 'Assignee is not an active enquiry agent'
      using errcode = '23514', detail = 'INVALID_ENQUIRY_ASSIGNEE';
  end if;
  return new;
end;
$$;

create trigger business_offer_enquiry_assignment_validate_before_write
before insert or update on public.business_offer_enquiry_assignments
for each row execute function public.validate_enquiry_assignment();

create or replace function public.audit_business_offer_enquiry_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> old.status then
    insert into public.business_offer_enquiry_events (
      enquiry_id, actor_profile_id, event_type, from_status, to_status
    ) values (
      new.id, (select auth.uid()), 'status_changed', old.status, new.status
    );
  end if;
  return new;
end;
$$;

create trigger business_offer_enquiry_status_audit_after_update
after update of status on public.business_offer_enquiries
for each row execute function public.audit_business_offer_enquiry_status();

create or replace function public.audit_business_offer_enquiry_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.active <> old.active then
    insert into public.business_offer_enquiry_events (
      enquiry_id, actor_profile_id, event_type, metadata
    ) values (
      new.enquiry_id,
      (select auth.uid()),
      case when new.active then 'assigned' else 'unassigned' end,
      jsonb_build_object('assignee_profile_id', new.assignee_profile_id)
    );
  end if;
  return new;
end;
$$;

create trigger business_offer_enquiry_assignment_audit_after_write
after insert or update of active on public.business_offer_enquiry_assignments
for each row execute function public.audit_business_offer_enquiry_assignment();

revoke all on function public.guard_organization_membership_change()
  from public, anon, authenticated;
revoke all on function public.audit_organization_membership_change()
  from public, anon, authenticated;
revoke all on function public.prevent_immutable_row_change()
  from public, anon, authenticated;
revoke all on function public.validate_business_offer_media_path()
  from public, anon, authenticated;
revoke all on function public.validate_business_offer_enquiry()
  from public, anon, authenticated;
revoke all on function public.validate_enquiry_assignment()
  from public, anon, authenticated;
revoke all on function public.audit_business_offer_enquiry_status()
  from public, anon, authenticated;
revoke all on function public.audit_business_offer_enquiry_assignment()
  from public, anon, authenticated;

create or replace function public.is_india_state_or_union_territory(
  value_input text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value_input = any (array[
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh',
    'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
    'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
    'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ]::text[]);
$$;

revoke all on function public.is_india_state_or_union_territory(text)
  from public, anon, authenticated;

create or replace function public.valid_service_areas_input(
  service_areas_input jsonb
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  radius_text text;
begin
  if jsonb_typeof(service_areas_input) <> 'array'
     or jsonb_array_length(service_areas_input) not between 1 and 50
  then
    return false;
  end if;

  for item in select value from jsonb_array_elements(service_areas_input)
  loop
    if jsonb_typeof(item) <> 'object'
       or jsonb_typeof(item -> 'state') <> 'string'
       or not public.is_india_state_or_union_territory(item ->> 'state')
       or (
         item ? 'district'
         and jsonb_typeof(item -> 'district') not in ('string', 'null')
       )
       or (
         jsonb_typeof(item -> 'district') = 'string'
         and char_length(btrim(item ->> 'district')) not between 2 and 80
       )
       or (
         item ? 'service_radius_km'
         and jsonb_typeof(item -> 'service_radius_km') not in ('number', 'null')
       )
    then
      return false;
    end if;

    if jsonb_typeof(item -> 'service_radius_km') = 'number' then
      radius_text := item ->> 'service_radius_km';
      if radius_text !~ '^[0-9]+$'
         or radius_text::numeric not between 1 and 2000
      then
        return false;
      end if;
    end if;
  end loop;

  return (
    select count(*) = count(distinct (
      lower(btrim(item ->> 'state')) || '|' ||
      lower(btrim(coalesce(item ->> 'district', '')))
    ))
    from jsonb_array_elements(service_areas_input) item
  );
end;
$$;

create or replace function public.offer_requires_human_review(
  kind_input text,
  category_slugs_input text[],
  caller_requires_review_input boolean
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(caller_requires_review_input, false)
    or kind_input in ('finance', 'insurance')
    or exists (
      select 1
      from unnest(coalesce(category_slugs_input, '{}'::text[])) category_slug
      where category_slug in (
        'finance-credit-payments', 'insurance-risk-services',
        'crop-protection-biologicals', 'veterinary-animal-health',
        'certification-traceability'
      )
    );
$$;

revoke all on function public.valid_service_areas_input(jsonb)
  from public, anon, authenticated;
revoke all on function public.offer_requires_human_review(text, text[], boolean)
  from public, anon, authenticated;

create or replace function public.create_organization_with_owner(
  slug_input text,
  display_name_input text,
  organization_type_input text,
  description_input text,
  state_input text,
  district_input text,
  website_url_input text,
  category_slugs_input text[],
  service_areas_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_id_value uuid;
begin
  if not public.is_ecosystem_release_enabled('agri_businesses') then
    raise exception 'Agricultural businesses are not released'
      using errcode = '55000', detail = 'AGRI_BUSINESSES_DISABLED';
  end if;
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', detail = 'UNAUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = actor_id
      and status = 'active'
      and onboarding_complete
      and account_role = 'agri_business'
  ) then
    raise exception 'An active completed agricultural-business profile is required'
      using errcode = '42501', detail = 'AGRI_BUSINESS_PROFILE_REQUIRED';
  end if;

  if exists (
    select 1 from public.organization_memberships
    where profile_id = actor_id and role = 'owner' and status = 'active'
  ) then
    raise exception 'The first release supports one owned organization'
      using errcode = '23505', detail = 'ORGANIZATION_LIMIT_REACHED';
  end if;

  if category_slugs_input is null
     or cardinality(category_slugs_input) not between 1 and 12
     or cardinality(category_slugs_input) <> (
       select count(distinct slug) from unnest(category_slugs_input) slug
     )
     or exists (
       select 1
       from unnest(category_slugs_input) requested_slug
       left join public.agriculture_categories category
         on category.slug = requested_slug
       where category.slug is null
         or category.domain <> 'business_sector'
         or category.status <> 'active'
         or not category.selectable
     )
  then
    raise exception 'Choose one to twelve active business sectors'
      using errcode = '22023', detail = 'INVALID_ORGANIZATION_CATEGORIES';
  end if;

  if not public.valid_service_areas_input(service_areas_input) then
    raise exception 'Choose one to fifty valid, unique service areas'
      using errcode = '22023', detail = 'INVALID_SERVICE_AREAS';
  end if;
  if not public.is_india_state_or_union_territory(state_input) then
    raise exception 'Choose an Indian state or union territory'
      using errcode = '22023', detail = 'INVALID_ORGANIZATION_STATE';
  end if;

  insert into public.organizations (
    slug, display_name, organization_type, description, state, district,
    website_url, publication_state, published_at
  ) values (
    btrim(slug_input), btrim(display_name_input), organization_type_input,
    btrim(description_input), btrim(state_input), nullif(btrim(district_input), ''),
    nullif(btrim(website_url_input), ''), 'draft', null
  )
  returning id into organization_id_value;

  insert into public.organization_memberships (
    organization_id, profile_id, role, status, invited_by, joined_at
  ) values (
    organization_id_value, actor_id, 'owner', 'active', actor_id, now()
  );

  insert into public.organization_category_affinities (
    organization_id, category_slug, is_primary
  )
  select organization_id_value, category_slug, row_number() over () = 1
  from unnest(category_slugs_input) category_slug;

  insert into public.organization_service_areas (
    organization_id, state, district, service_radius_km
  )
  select
    organization_id_value,
    btrim(item ->> 'state'),
    nullif(btrim(item ->> 'district'), ''),
    case
      when jsonb_typeof(item -> 'service_radius_km') = 'number'
        then (item ->> 'service_radius_km')::integer
      else null
    end
  from jsonb_array_elements(service_areas_input) item;

  return jsonb_build_object(
    'organization_id', organization_id_value,
    'slug', btrim(slug_input)
  );
exception
  when unique_violation then
    raise exception 'Organization slug is already in use'
      using errcode = '23505', detail = 'ORGANIZATION_SLUG_CONFLICT';
end;
$$;

create or replace function public.update_organization(
  slug_input text,
  display_name_input text,
  organization_type_input text,
  description_input text,
  state_input text,
  district_input text,
  website_url_input text,
  category_slugs_input text[],
  service_areas_input jsonb,
  organization_id_input uuid,
  expected_updated_at_input timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_organization public.organizations%rowtype;
  updated_at_value timestamptz;
begin
  if not public.is_ecosystem_release_enabled('agri_businesses') then
    raise exception 'Agricultural businesses are not released'
      using errcode = '55000', detail = 'AGRI_BUSINESSES_DISABLED';
  end if;
  if not public.can_manage_organization(organization_id_input, 'editor') then
    raise exception 'Organization management permission required'
      using errcode = '42501', detail = 'ORGANIZATION_MANAGEMENT_REQUIRED';
  end if;

  select * into current_organization
  from public.organizations
  where id = organization_id_input
  for update;

  if current_organization.id is null then
    raise exception 'Organization not found'
      using errcode = 'P0002', detail = 'ORGANIZATION_NOT_FOUND';
  end if;
  if current_organization.updated_at <> expected_updated_at_input then
    raise exception 'Organization changed'
      using errcode = '40001', detail = 'ORGANIZATION_REVISION_CONFLICT';
  end if;

  if category_slugs_input is null
     or cardinality(category_slugs_input) not between 1 and 12
     or cardinality(category_slugs_input) <> (
       select count(distinct slug) from unnest(category_slugs_input) slug
     )
     or exists (
       select 1
       from unnest(category_slugs_input) requested_slug
       left join public.agriculture_categories category
         on category.slug = requested_slug
       where category.slug is null
         or category.domain <> 'business_sector'
         or category.status <> 'active'
         or not category.selectable
     )
  then
    raise exception 'Choose one to twelve active business sectors'
      using errcode = '22023', detail = 'INVALID_ORGANIZATION_CATEGORIES';
  end if;

  if not public.valid_service_areas_input(service_areas_input) then
    raise exception 'Choose one to fifty valid, unique service areas'
      using errcode = '22023', detail = 'INVALID_SERVICE_AREAS';
  end if;
  if not public.is_india_state_or_union_territory(state_input) then
    raise exception 'Choose an Indian state or union territory'
      using errcode = '22023', detail = 'INVALID_ORGANIZATION_STATE';
  end if;

  update public.organizations
  set slug = btrim(slug_input),
      display_name = btrim(display_name_input),
      organization_type = organization_type_input,
      description = btrim(description_input),
      state = btrim(state_input),
      district = nullif(btrim(district_input), ''),
      website_url = nullif(btrim(website_url_input), ''),
      verification_state = 'unverified',
      publication_state = case
        when publication_state = 'published' then 'unpublished'
        else publication_state
      end
  where id = organization_id_input
  returning updated_at into updated_at_value;

  delete from public.organization_category_affinities
  where organization_id = organization_id_input;
  insert into public.organization_category_affinities (
    organization_id, category_slug, is_primary
  )
  select organization_id_input, category_slug, row_number() over () = 1
  from unnest(category_slugs_input) category_slug;

  delete from public.organization_service_areas
  where organization_id = organization_id_input;
  insert into public.organization_service_areas (
    organization_id, state, district, service_radius_km
  )
  select
    organization_id_input,
    btrim(item ->> 'state'),
    nullif(btrim(item ->> 'district'), ''),
    case
      when jsonb_typeof(item -> 'service_radius_km') = 'number'
        then (item ->> 'service_radius_km')::integer
      else null
    end
  from jsonb_array_elements(service_areas_input) item;

  update public.organization_verification_requests
  set status = 'withdrawn'
  where organization_id = organization_id_input
    and status in ('submitted', 'in_review');

  select updated_at into updated_at_value
  from public.organizations
  where id = organization_id_input;

  return jsonb_build_object(
    'organization_id', organization_id_input,
    'slug', btrim(slug_input),
    'updated_at', updated_at_value
  );
exception
  when unique_violation then
    raise exception 'Organization slug is already in use'
      using errcode = '23505', detail = 'ORGANIZATION_SLUG_CONFLICT';
end;
$$;

create or replace function public.set_organization_publication(
  organization_id_input uuid,
  publication_state_input text,
  expected_updated_at_input timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_value public.organizations%rowtype;
  updated_at_value timestamptz;
begin
  if not public.is_ecosystem_release_enabled('agri_businesses') then
    raise exception 'Agricultural businesses are not released'
      using errcode = '55000', detail = 'AGRI_BUSINESSES_DISABLED';
  end if;
  select * into organization_value
  from public.organizations
  where id = organization_id_input
  for update;

  if organization_value.id is null then
    raise exception 'Organization not found'
      using errcode = 'P0002', detail = 'ORGANIZATION_NOT_FOUND';
  end if;
  if not public.can_manage_organization(organization_id_input, 'admin') then
    raise exception 'Organization owner or administrator required'
      using errcode = '42501', detail = 'ORGANIZATION_ADMIN_REQUIRED';
  end if;
  if organization_value.updated_at <> expected_updated_at_input then
    raise exception 'Organization changed'
      using errcode = '40001', detail = 'ORGANIZATION_REVISION_CONFLICT';
  end if;
  if publication_state_input not in ('published', 'unpublished') then
    raise exception 'Invalid organization publication state'
      using errcode = '22023', detail = 'INVALID_ORGANIZATION_PUBLICATION_STATE';
  end if;

  if publication_state_input = 'published' and (
    organization_value.moderation_state <> 'active'
    or not exists (
      select 1
      from public.organization_category_affinities affinity
      join public.agriculture_categories category
        on category.slug = affinity.category_slug
      where affinity.organization_id = organization_id_input
        and category.domain = 'business_sector'
        and category.status = 'active'
        and category.selectable
    )
    or not exists (
      select 1
      from public.organization_service_areas service_area
      where service_area.organization_id = organization_id_input
        and public.is_india_state_or_union_territory(service_area.state)
    )
  ) then
    raise exception 'Organization is not publishable'
      using errcode = '55000', detail = 'ORGANIZATION_NOT_PUBLISHABLE';
  end if;

  update public.organizations
  set publication_state = publication_state_input,
      published_at = case
        when publication_state_input = 'published' then coalesce(published_at, now())
        else published_at
      end
  where id = organization_id_input
  returning updated_at into updated_at_value;

  return jsonb_build_object(
    'organization_id', organization_id_input,
    'slug', organization_value.slug,
    'publication_state', publication_state_input,
    'updated_at', updated_at_value
  );
end;
$$;

create or replace function public.valid_offer_price(
  price_model_input text,
  currency_input text,
  price_min_input numeric,
  price_max_input numeric,
  price_unit_input text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    price_model_input in ('fixed', 'range', 'quote', 'free', 'subsidized')
    and (currency_input is null or currency_input = 'INR')
    and (price_min_input is null or price_min_input between 0.01 and 1000000000)
    and (price_max_input is null or price_max_input between 0.01 and 1000000000)
    and (price_unit_input is null or price_unit_input in (
      'each', 'piece', 'set', 'kg', 'litre', 'tray', 'dozen', 'hour', 'day',
      'month', 'acre', 'hectare', 'service'
    ))
    and (
      (
        price_model_input = 'fixed' and currency_input = 'INR'
        and price_min_input is not null and price_max_input is null
        and price_unit_input is not null
      )
      or (
        price_model_input = 'range' and currency_input = 'INR'
        and price_min_input is not null and price_max_input is not null
        and price_max_input >= price_min_input and price_unit_input is not null
      )
      or (
        price_model_input in ('quote', 'free') and currency_input is null
        and price_min_input is null and price_max_input is null
        and price_unit_input is null
      )
      or (
        price_model_input = 'subsidized' and currency_input = 'INR'
        and price_min_input is not null and price_max_input is null
        and price_unit_input is not null
      )
    );
$$;

revoke all on function public.valid_offer_price(text, text, numeric, numeric, text)
  from public, anon, authenticated;

create or replace function public.create_business_offer(
  organization_id_input uuid,
  kind_input text,
  content_locale_input text,
  title_input text,
  description_input text,
  terms_input text,
  valid_from_input date,
  valid_until_input date,
  price_model_input text,
  currency_input text,
  price_min_input numeric,
  price_max_input numeric,
  price_unit_input text,
  category_slugs_input text[],
  service_areas_input jsonb,
  publication_intent_input text,
  requires_moderation_review_input boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer_id_value uuid;
  requires_review_value boolean;
  publication_state_value text;
  moderation_state_value text;
begin
  if not public.is_ecosystem_release_enabled('agri_businesses')
     or not public.is_ecosystem_release_enabled('business_offers')
  then
    raise exception 'Business offers are not released'
      using errcode = '55000', detail = 'BUSINESS_OFFERS_DISABLED';
  end if;
  if not public.can_manage_organization(organization_id_input, 'editor') then
    raise exception 'Organization management permission required'
      using errcode = '42501', detail = 'ORGANIZATION_MANAGEMENT_REQUIRED';
  end if;
  if publication_intent_input not in ('draft', 'submit') then
    raise exception 'Invalid publication intent'
      using errcode = '22023', detail = 'INVALID_PUBLICATION_INTENT';
  end if;
  if valid_from_input is null or valid_until_input is null
     or valid_until_input < valid_from_input
     or valid_until_input < current_date
     or valid_until_input > valid_from_input + 1826
  then
    raise exception 'Offer validity dates are invalid'
      using errcode = '22023', detail = 'INVALID_OFFER_VALIDITY';
  end if;
  if not public.valid_offer_price(
    price_model_input, currency_input, price_min_input, price_max_input,
    price_unit_input
  ) then
    raise exception 'Offer price is invalid'
      using errcode = '22023', detail = 'INVALID_OFFER_PRICE';
  end if;
  if category_slugs_input is null
     or cardinality(category_slugs_input) not between 1 and 12
     or cardinality(category_slugs_input) <> (
       select count(distinct slug) from unnest(category_slugs_input) slug
     )
     or exists (
       select 1
       from unnest(category_slugs_input) requested_slug
       left join public.agriculture_categories category
         on category.slug = requested_slug
       where category.slug is null
         or category.domain not in ('business_sector', 'offer_category')
         or category.status <> 'active'
         or not category.selectable
     )
  then
    raise exception 'Choose one to twelve active offer categories'
      using errcode = '22023', detail = 'INVALID_OFFER_CATEGORIES';
  end if;
  if not public.valid_service_areas_input(service_areas_input) then
    raise exception 'Choose one to fifty valid, unique service areas'
      using errcode = '22023', detail = 'INVALID_SERVICE_AREAS';
  end if;
  if not exists (
    select 1 from public.supported_locales
    where locale_tag = content_locale_input and enabled
  ) then
    raise exception 'Unsupported content locale'
      using errcode = '22023', detail = 'INVALID_CONTENT_LOCALE';
  end if;
  if content_locale_input not in ('en-IN', 'hi-IN', 'mr-IN')
     and not public.is_ecosystem_release_enabled('extended_locales')
  then
    raise exception 'Extended locales are not released'
      using errcode = '55000', detail = 'EXTENDED_LOCALES_DISABLED';
  end if;

  requires_review_value := public.offer_requires_human_review(
    kind_input, category_slugs_input, requires_moderation_review_input
  );
  moderation_state_value := case
    when requires_review_value then 'pending' else 'not_required'
  end;
  publication_state_value := case
    when publication_intent_input = 'submit' and not requires_review_value
      then 'published'
    else 'draft'
  end;

  if publication_state_value = 'published' and not exists (
    select 1 from public.organizations
    where id = organization_id_input
      and publication_state = 'published'
      and moderation_state = 'active'
  ) then
    raise exception 'Organization is not publishable'
      using errcode = '55000', detail = 'ORGANIZATION_NOT_PUBLISHED';
  end if;

  insert into public.business_offers (
    organization_id, kind, content_locale, title, description, terms,
    valid_from, valid_until, price_model, currency, price_min, price_max,
    price_unit, publication_state, moderation_state, expiry_state,
    requires_moderation_review, published_at
  ) values (
    organization_id_input, kind_input, content_locale_input, btrim(title_input),
    btrim(description_input), coalesce(terms_input, ''), valid_from_input,
    valid_until_input, price_model_input, currency_input, price_min_input,
    price_max_input, price_unit_input, publication_state_value,
    moderation_state_value,
    case
      when valid_until_input < current_date then 'expired'
      when valid_from_input > current_date then 'scheduled'
      else 'active'
    end,
    requires_review_value,
    case when publication_state_value = 'published' then now() else null end
  )
  returning id into offer_id_value;

  insert into public.business_offer_categories (offer_id, category_slug, is_primary)
  select offer_id_value, category_slug, ordinal = 1
  from unnest(category_slugs_input) with ordinality category(category_slug, ordinal);

  insert into public.business_offer_service_areas (
    offer_id, state, district, service_radius_km
  )
  select
    offer_id_value,
    btrim(item ->> 'state'),
    nullif(btrim(item ->> 'district'), ''),
    case
      when jsonb_typeof(item -> 'service_radius_km') = 'number'
        then (item ->> 'service_radius_km')::integer
      else null
    end
  from jsonb_array_elements(service_areas_input) item;

  return jsonb_build_object(
    'offer_id', offer_id_value,
    'publication_state', publication_state_value,
    'moderation_state', moderation_state_value
  );
end;
$$;

create or replace function public.update_business_offer(
  organization_id_input uuid,
  kind_input text,
  content_locale_input text,
  title_input text,
  description_input text,
  terms_input text,
  valid_from_input date,
  valid_until_input date,
  price_model_input text,
  currency_input text,
  price_min_input numeric,
  price_max_input numeric,
  price_unit_input text,
  category_slugs_input text[],
  service_areas_input jsonb,
  publication_intent_input text,
  requires_moderation_review_input boolean,
  offer_id_input uuid,
  expected_updated_at_input timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_organization_id uuid;
  current_updated_at timestamptz;
  updated_at_value timestamptz;
  requires_review_value boolean;
  publication_state_value text;
  moderation_state_value text;
begin
  if not public.is_ecosystem_release_enabled('agri_businesses')
     or not public.is_ecosystem_release_enabled('business_offers')
  then
    raise exception 'Business offers are not released'
      using errcode = '55000', detail = 'BUSINESS_OFFERS_DISABLED';
  end if;
  select organization_id, updated_at
  into current_organization_id, current_updated_at
  from public.business_offers
  where id = offer_id_input
  for update;

  if current_organization_id is null then
    raise exception 'Offer not found'
      using errcode = 'P0002', detail = 'OFFER_NOT_FOUND';
  end if;
  if current_organization_id <> organization_id_input then
    raise exception 'Offer organization cannot change'
      using errcode = '22023', detail = 'OFFER_ORGANIZATION_IMMUTABLE';
  end if;
  if not public.can_manage_organization(organization_id_input, 'editor') then
    raise exception 'Organization management permission required'
      using errcode = '42501', detail = 'ORGANIZATION_MANAGEMENT_REQUIRED';
  end if;
  if current_updated_at <> expected_updated_at_input then
    raise exception 'Offer changed'
      using errcode = '40001', detail = 'OFFER_REVISION_CONFLICT';
  end if;
  if publication_intent_input not in ('draft', 'submit') then
    raise exception 'Invalid publication intent'
      using errcode = '22023', detail = 'INVALID_PUBLICATION_INTENT';
  end if;
  if valid_from_input is null or valid_until_input is null
     or valid_until_input < valid_from_input
     or valid_until_input < current_date
     or valid_until_input > valid_from_input + 1826
  then
    raise exception 'Offer validity dates are invalid'
      using errcode = '22023', detail = 'INVALID_OFFER_VALIDITY';
  end if;
  if not public.valid_offer_price(
    price_model_input, currency_input, price_min_input, price_max_input,
    price_unit_input
  ) then
    raise exception 'Offer price is invalid'
      using errcode = '22023', detail = 'INVALID_OFFER_PRICE';
  end if;
  if category_slugs_input is null
     or cardinality(category_slugs_input) not between 1 and 12
     or cardinality(category_slugs_input) <> (
       select count(distinct slug) from unnest(category_slugs_input) slug
     )
     or exists (
       select 1
       from unnest(category_slugs_input) requested_slug
       left join public.agriculture_categories category
         on category.slug = requested_slug
       where category.slug is null
         or category.domain not in ('business_sector', 'offer_category')
         or category.status <> 'active'
         or not category.selectable
     )
  then
    raise exception 'Choose one to twelve active offer categories'
      using errcode = '22023', detail = 'INVALID_OFFER_CATEGORIES';
  end if;
  if not public.valid_service_areas_input(service_areas_input) then
    raise exception 'Choose one to fifty valid, unique service areas'
      using errcode = '22023', detail = 'INVALID_SERVICE_AREAS';
  end if;
  if not exists (
    select 1 from public.supported_locales
    where locale_tag = content_locale_input and enabled
  ) then
    raise exception 'Unsupported content locale'
      using errcode = '22023', detail = 'INVALID_CONTENT_LOCALE';
  end if;
  if content_locale_input not in ('en-IN', 'hi-IN', 'mr-IN')
     and not public.is_ecosystem_release_enabled('extended_locales')
  then
    raise exception 'Extended locales are not released'
      using errcode = '55000', detail = 'EXTENDED_LOCALES_DISABLED';
  end if;

  requires_review_value := public.offer_requires_human_review(
    kind_input, category_slugs_input, requires_moderation_review_input
  );
  moderation_state_value := case
    when requires_review_value then 'pending' else 'not_required'
  end;
  publication_state_value := case
    when publication_intent_input = 'submit' and not requires_review_value
      then 'published'
    else 'draft'
  end;

  if publication_state_value = 'published' and not public.is_public_organization(
    organization_id_input
  ) then
    raise exception 'Organization is not publishable'
      using errcode = '55000', detail = 'ORGANIZATION_NOT_PUBLISHED';
  end if;

  update public.business_offers
  set kind = kind_input,
      content_locale = content_locale_input,
      title = btrim(title_input),
      description = btrim(description_input),
      terms = coalesce(terms_input, ''),
      valid_from = valid_from_input,
      valid_until = valid_until_input,
      price_model = price_model_input,
      currency = currency_input,
      price_min = price_min_input,
      price_max = price_max_input,
      price_unit = price_unit_input,
      publication_state = publication_state_value,
      moderation_state = moderation_state_value,
      expiry_state = case
        when valid_until_input < current_date then 'expired'
        when valid_from_input > current_date then 'scheduled'
        else 'active'
      end,
      requires_moderation_review = requires_review_value,
      published_at = case
        when publication_state_value = 'published' then coalesce(published_at, now())
        else published_at
      end
  where id = offer_id_input
  returning updated_at into updated_at_value;

  delete from public.business_offer_categories where offer_id = offer_id_input;
  insert into public.business_offer_categories (offer_id, category_slug, is_primary)
  select offer_id_input, category_slug, ordinal = 1
  from unnest(category_slugs_input) with ordinality category(category_slug, ordinal);

  delete from public.business_offer_service_areas where offer_id = offer_id_input;
  insert into public.business_offer_service_areas (
    offer_id, state, district, service_radius_km
  )
  select
    offer_id_input,
    btrim(item ->> 'state'),
    nullif(btrim(item ->> 'district'), ''),
    case
      when jsonb_typeof(item -> 'service_radius_km') = 'number'
        then (item ->> 'service_radius_km')::integer
      else null
    end
  from jsonb_array_elements(service_areas_input) item;

  return jsonb_build_object(
    'offer_id', offer_id_input,
    'publication_state', publication_state_value,
    'moderation_state', moderation_state_value,
    'updated_at', updated_at_value
  );
end;
$$;

create or replace function public.set_business_offer_publication(
  offer_id_input uuid,
  publication_state_input text,
  expected_updated_at_input timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer_value public.business_offers%rowtype;
  updated_at_value timestamptz;
begin
  if not public.is_ecosystem_release_enabled('agri_businesses')
     or not public.is_ecosystem_release_enabled('business_offers')
  then
    raise exception 'Business offers are not released'
      using errcode = '55000', detail = 'BUSINESS_OFFERS_DISABLED';
  end if;
  select * into offer_value
  from public.business_offers
  where id = offer_id_input
  for update;

  if offer_value.id is null then
    raise exception 'Offer not found'
      using errcode = 'P0002', detail = 'OFFER_NOT_FOUND';
  end if;
  if not public.can_manage_organization(offer_value.organization_id, 'editor') then
    raise exception 'Organization management permission required'
      using errcode = '42501', detail = 'ORGANIZATION_MANAGEMENT_REQUIRED';
  end if;
  if offer_value.updated_at <> expected_updated_at_input then
    raise exception 'Offer changed'
      using errcode = '40001', detail = 'OFFER_REVISION_CONFLICT';
  end if;
  if publication_state_input not in ('draft', 'published', 'paused', 'archived') then
    raise exception 'Invalid publication state'
      using errcode = '22023', detail = 'INVALID_PUBLICATION_STATE';
  end if;

  if publication_state_input = 'published' then
    if offer_value.valid_until < current_date then
      raise exception 'Expired offers cannot be published'
        using errcode = '55000', detail = 'OFFER_EXPIRED';
    end if;
    if offer_value.moderation_state = 'rejected'
       or (
         offer_value.requires_moderation_review
         and offer_value.moderation_state <> 'approved'
       )
    then
      raise exception 'Offer requires moderation approval'
        using errcode = '55000', detail = 'OFFER_REVIEW_REQUIRED';
    end if;
    if not public.is_public_organization(offer_value.organization_id) then
      raise exception 'Organization is not publishable'
        using errcode = '55000', detail = 'ORGANIZATION_NOT_PUBLISHED';
    end if;
  end if;

  update public.business_offers
  set publication_state = publication_state_input,
      published_at = case
        when publication_state_input = 'published' then coalesce(published_at, now())
        else published_at
      end,
      expiry_state = case
        when valid_until < current_date then 'expired'
        when valid_from > current_date then 'scheduled'
        else 'active'
      end
  where id = offer_id_input
  returning updated_at into updated_at_value;

  return jsonb_build_object(
    'offer_id', offer_id_input,
    'publication_state', publication_state_input,
    'moderation_state', offer_value.moderation_state,
    'updated_at', updated_at_value
  );
end;
$$;

create or replace function public.connect_to_business_offer(
  offer_id_input uuid,
  message_input text,
  quantity_needed_input text,
  need_by_input text,
  idempotency_key_input uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  offer_value public.business_offers%rowtype;
  organization_value public.organizations%rowtype;
  enquiry_id_value uuid;
  event_id_value uuid;
  existing_enquiry public.business_offer_enquiries%rowtype;
  parsed_need_by date;
  snapshot_value jsonb;
begin
  if not public.is_ecosystem_release_enabled('agri_businesses')
     or not public.is_ecosystem_release_enabled('business_offers')
  then
    raise exception 'Business offers are not released'
      using errcode = '55000', detail = 'BUSINESS_OFFERS_DISABLED';
  end if;
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', detail = 'UNAUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = actor_id
      and status = 'active'
      and onboarding_complete
      and account_role in ('farmer', 'customer', 'wholesaler', 'agri_business')
  ) then
    raise exception 'An active completed participant is required'
      using errcode = '42501', detail = 'ACTIVE_PARTICIPANT_REQUIRED';
  end if;
  if idempotency_key_input is null then
    raise exception 'Idempotency key is required'
      using errcode = '22023', detail = 'IDEMPOTENCY_KEY_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':' || idempotency_key_input::text, 0)
  );
  if char_length(btrim(message_input)) not between 10 and 2000 then
    raise exception 'Enquiry message is invalid'
      using errcode = '22023', detail = 'INVALID_ENQUIRY_MESSAGE';
  end if;
  if quantity_needed_input is not null
     and char_length(btrim(quantity_needed_input)) not between 1 and 120
  then
    raise exception 'Quantity needed is invalid'
      using errcode = '22023', detail = 'INVALID_QUANTITY_NEEDED';
  end if;
  if need_by_input is not null and btrim(need_by_input) <> '' then
    if btrim(need_by_input) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'Need-by date must use YYYY-MM-DD'
        using errcode = '22007', detail = 'INVALID_NEED_BY_DATE';
    end if;
    begin
      parsed_need_by := btrim(need_by_input)::date;
    exception when others then
      raise exception 'Need-by date is invalid'
        using errcode = '22007', detail = 'INVALID_NEED_BY_DATE';
    end;
    if parsed_need_by < current_date or parsed_need_by > current_date + 1826 then
      raise exception 'Need-by date is outside the supported range'
        using errcode = '22007', detail = 'INVALID_NEED_BY_DATE';
    end if;
  end if;

  select * into existing_enquiry
  from public.business_offer_enquiries
  where requester_id = actor_id
    and offer_id = offer_id_input
    and idempotency_key = idempotency_key_input;

  if existing_enquiry.id is not null then
    if existing_enquiry.message <> btrim(message_input)
       or existing_enquiry.quantity_needed is distinct from nullif(btrim(quantity_needed_input), '')
       or existing_enquiry.need_by is distinct from parsed_need_by
    then
      raise exception 'Idempotency key was already used for different content'
        using errcode = '22023', detail = 'IDEMPOTENCY_CONFLICT';
    end if;
    select id into event_id_value
    from public.business_offer_enquiry_events
    where enquiry_id = existing_enquiry.id and event_type = 'created'
    order by created_at, id
    limit 1;
    return jsonb_build_object(
      'enquiry_id', existing_enquiry.id,
      'event_id', event_id_value
    );
  end if;

  select * into offer_value
  from public.business_offers
  where id = offer_id_input
  for share;
  if offer_value.id is null then
    raise exception 'Offer not found'
      using errcode = 'P0002', detail = 'OFFER_NOT_FOUND';
  end if;
  select * into organization_value
  from public.organizations
  where id = offer_value.organization_id
  for share;

  if offer_value.publication_state <> 'published'
     or offer_value.moderation_state not in ('not_required', 'approved')
     or offer_value.expiry_state = 'expired'
     or offer_value.valid_from > current_date
     or offer_value.valid_until < current_date
     or organization_value.publication_state <> 'published'
     or organization_value.moderation_state <> 'active'
  then
    raise exception 'Offer is unavailable'
      using errcode = '55000', detail = 'OFFER_UNAVAILABLE';
  end if;

  if exists (
    select 1 from public.organization_memberships
    where organization_id = organization_value.id
      and profile_id = actor_id
      and status = 'active'
  ) then
    raise exception 'Members cannot enquire about their own organization offer'
      using errcode = '42501', detail = 'OWN_ORGANIZATION_ENQUIRY';
  end if;

  if exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = organization_value.id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'enquiry_agent')
      and public.is_blocked(actor_id, membership.profile_id)
  ) then
    raise exception 'Offer is unavailable'
      using errcode = '55000', detail = 'ORGANIZATION_BLOCKED';
  end if;

  snapshot_value := jsonb_build_object(
    'offer_id', offer_value.id,
    'organization_id', organization_value.id,
    'organization_slug', organization_value.slug,
    'organization_name', organization_value.display_name,
    'title', offer_value.title,
    'kind', offer_value.kind,
    'content_locale', offer_value.content_locale,
    'price_model', offer_value.price_model,
    'currency', offer_value.currency,
    'price_min', offer_value.price_min,
    'price_max', offer_value.price_max,
    'price_unit', offer_value.price_unit,
    'valid_from', offer_value.valid_from,
    'valid_until', offer_value.valid_until,
    'captured_at', now()
  );

  insert into public.business_offer_enquiries (
    offer_id, organization_id, requester_id, idempotency_key, message,
    quantity_needed, need_by, offer_snapshot
  ) values (
    offer_value.id, organization_value.id, actor_id, idempotency_key_input,
    btrim(message_input), nullif(btrim(quantity_needed_input), ''), parsed_need_by,
    snapshot_value
  ) returning id into enquiry_id_value;

  insert into public.business_offer_enquiry_events (
    enquiry_id, actor_profile_id, event_type,
    metadata
  ) values (
    enquiry_id_value, actor_id, 'created',
    jsonb_build_object('snapshot_version', 1)
  ) returning id into event_id_value;

  return jsonb_build_object(
    'enquiry_id', enquiry_id_value,
    'event_id', event_id_value
  );
end;
$$;

create or replace function public.sha256_hex(value_input text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  extension_schema name;
  digest_value text;
begin
  select namespace.nspname into extension_schema
  from pg_catalog.pg_extension extension
  join pg_catalog.pg_namespace namespace
    on namespace.oid = extension.extnamespace
  where extension.extname = 'pgcrypto';

  if extension_schema is null then
    raise exception 'pgcrypto extension is required'
      using errcode = '55000', detail = 'PGCRYPTO_REQUIRED';
  end if;

  execute pg_catalog.format(
    'select pg_catalog.encode(%I.digest($1, ''sha256''), ''hex'')',
    extension_schema
  ) into digest_value using value_input;
  return digest_value;
end;
$$;

revoke all on function public.sha256_hex(text)
  from public, anon, authenticated;

-- Draft JSON contract consumed by this RPC:
-- locale, accountRole, identity{fullName,handle,state,district,bio},
-- selectedCategorySlugs[], customCategoryLabels[],
-- roleDetails{accountRole,...,organization{organizationName,
-- organizationSlug,organizationType,description,websiteUrl,serviceStates[],
-- companySectorSlugs[]}}, and
-- reviewVisibility{profileVisibility,termsAccepted}.
create or replace function public.finalize_onboarding(
  expected_revision_input integer,
  idempotency_key_input uuid
)
returns table(code text, revision integer, organization_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  progress_value public.onboarding_progress%rowtype;
  profile_value public.profiles%rowtype;
  draft_value jsonb;
  identity_value jsonb;
  role_details_value jsonb;
  organization_value jsonb;
  category_values jsonb;
  custom_values jsonb;
  category_slugs_value text[] := '{}'::text[];
  custom_labels_value text[] := '{}'::text[];
  company_sector_slugs_value text[] := '{}'::text[];
  account_role_value text;
  participant_type_value text;
  locale_value text;
  relationship_value text;
  farming_method_value text;
  experience_years_value integer;
  profile_visibility_value text;
  organization_result jsonb;
  organization_id_value uuid;
  organization_service_areas jsonb;
  fingerprint_value text;
  next_revision integer;
begin
  if not public.is_ecosystem_release_enabled('resumable_onboarding') then
    raise exception 'Resumable onboarding is not released'
      using errcode = '55000', detail = 'RESUMABLE_ONBOARDING_DISABLED';
  end if;
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', detail = 'UNAUTHENTICATED';
  end if;
  if idempotency_key_input is null then
    raise exception 'Idempotency key is required'
      using errcode = '22023', detail = 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into progress_value
  from public.onboarding_progress
  where profile_id = actor_id
  for update;

  if progress_value.profile_id is null then
    raise exception 'Onboarding draft not found'
      using errcode = 'P0002', detail = 'ONBOARDING_DRAFT_NOT_FOUND';
  end if;

  fingerprint_value := public.sha256_hex(
    'finalize:' || expected_revision_input::text
  );

  if progress_value.last_idempotency_key = idempotency_key_input
     and progress_value.last_idempotency_fingerprint is distinct from fingerprint_value
  then
    return query select
      'IDEMPOTENCY_CONFLICT'::text,
      progress_value.revision,
      null::uuid;
    return;
  end if;

  if progress_value.status = 'complete' then
    if progress_value.last_idempotency_key = idempotency_key_input
       and progress_value.last_idempotency_fingerprint = fingerprint_value
    then
      select membership.organization_id into organization_id_value
      from public.organization_memberships membership
      where membership.profile_id = actor_id
        and membership.role = 'owner'
        and membership.status = 'active'
      order by membership.created_at
      limit 1;
      return query select
        'IDEMPOTENT_REPLAY'::text,
        progress_value.revision,
        organization_id_value;
    else
      return query select
        'ALREADY_COMPLETED'::text,
        progress_value.revision,
        null::uuid;
    end if;
    return;
  end if;

  if progress_value.revision <> expected_revision_input then
    return query select
      'REVISION_CONFLICT'::text,
      progress_value.revision,
      null::uuid;
    return;
  end if;

  select * into profile_value
  from public.profiles
  where id = actor_id
  for update;
  if profile_value.id is null then
    raise exception 'Profile not found'
      using errcode = 'P0002', detail = 'PROFILE_NOT_FOUND';
  end if;
  if profile_value.status <> 'active' then
    raise exception 'An active profile is required'
      using errcode = '42501', detail = 'ACTIVE_PROFILE_REQUIRED';
  end if;
  if profile_value.onboarding_complete then
    raise exception 'Onboarding is already complete'
      using errcode = '55000', detail = 'ONBOARDING_ALREADY_COMPLETE';
  end if;

  if progress_value.flow_version <> 1
     or cardinality(progress_value.completed_steps) <> 6
     or not progress_value.completed_steps @> array[
       'language', 'role', 'identity_location', 'agriculture', 'role_details',
       'review_visibility'
     ]::text[]
  then
    raise exception 'All six onboarding steps must be complete'
      using errcode = '22023', detail = 'INCOMPLETE_ONBOARDING_DRAFT';
  end if;

  draft_value := progress_value.draft_data;
  account_role_value := progress_value.account_role;
  locale_value := draft_value ->> 'locale';
  identity_value := draft_value -> 'identity';
  role_details_value := draft_value -> 'roleDetails';
  category_values := draft_value -> 'selectedCategorySlugs';
  custom_values := draft_value -> 'customCategoryLabels';
  profile_visibility_value := draft_value #>> '{reviewVisibility,profileVisibility}';

  if account_role_value is null
     or account_role_value not in ('farmer', 'customer', 'wholesaler', 'agri_business')
     or draft_value ->> 'accountRole' is distinct from account_role_value
     or jsonb_typeof(identity_value) <> 'object'
     or jsonb_typeof(role_details_value) <> 'object'
     or role_details_value ->> 'accountRole' is distinct from account_role_value
     or jsonb_typeof(category_values) <> 'array'
     or jsonb_array_length(category_values) > 20
     or jsonb_typeof(custom_values) <> 'array'
     or jsonb_array_length(custom_values) > 3
     or profile_visibility_value is null
     or profile_visibility_value not in ('members', 'public')
     or jsonb_typeof(draft_value #> '{reviewVisibility,termsAccepted}') <> 'boolean'
     or draft_value #> '{reviewVisibility,termsAccepted}' <> 'true'::jsonb
  then
    raise exception 'Onboarding draft structure is invalid'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_DRAFT';
  end if;

  if exists (
    select 1 from jsonb_array_elements(category_values) item
    where jsonb_typeof(item) <> 'string'
  ) or exists (
    select 1 from jsonb_array_elements(custom_values) item
    where jsonb_typeof(item) <> 'string'
  ) then
    raise exception 'Onboarding category values must be strings'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_CATEGORIES';
  end if;

  select coalesce(array_agg(value order by ordinal), '{}'::text[])
  into category_slugs_value
  from jsonb_array_elements_text(category_values) with ordinality item(value, ordinal);
  select coalesce(array_agg(value order by ordinal), '{}'::text[])
  into custom_labels_value
  from jsonb_array_elements_text(custom_values) with ordinality item(value, ordinal);

  if cardinality(category_slugs_value) + cardinality(custom_labels_value) < 1
     or cardinality(category_slugs_value) <> (
       select count(distinct slug) from unnest(category_slugs_value) slug
     )
     or cardinality(custom_labels_value) <> (
       select count(distinct lower(regexp_replace(
         btrim(normalize(label, NFKC)), '[[:space:]]+', ' ', 'g'
       ))) from unnest(custom_labels_value) label
     )
     or exists (
       select 1
       from unnest(category_slugs_value) requested_slug
       left join public.agriculture_categories category
         on category.slug = requested_slug
       where category.slug is null
         or category.domain not in ('farming_activity', 'commodity')
         or category.status <> 'active'
         or not category.selectable
     )
     or exists (
       select 1
       from unnest(custom_labels_value) custom_label
       join public.agriculture_categories category
         on category.domain in ('farming_activity', 'commodity')
        and category.status = 'active'
        and (
          lower(regexp_replace(
            btrim(normalize(custom_label, NFKC)), '[[:space:]]+', ' ', 'g'
          )) = replace(category.slug, '-', ' ')
          or regexp_replace(
            lower(normalize(custom_label, NFKC)), '[^[:alnum:]]', '', 'g'
          ) = regexp_replace(category.slug, '[^[:alnum:]]', '', 'g')
        )
     )
  then
    raise exception 'Onboarding categories are invalid'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_CATEGORIES';
  end if;

  if not exists (
    select 1 from public.supported_locales
    where locale_tag = locale_value and enabled
  ) then
    raise exception 'Onboarding locale is invalid'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_LOCALE';
  end if;
  if locale_value not in ('en-IN', 'hi-IN', 'mr-IN')
     and not public.is_ecosystem_release_enabled('extended_locales')
  then
    raise exception 'Extended locales are not released'
      using errcode = '55000', detail = 'EXTENDED_LOCALES_DISABLED';
  end if;

  if identity_value ->> 'fullName' is null
     or identity_value ->> 'handle' is null
     or identity_value ->> 'state' is null
     or identity_value ->> 'district' is null
     or char_length(btrim(identity_value ->> 'fullName')) not between 2 and 80
     or (identity_value ->> 'handle') !~ '^[a-z0-9_]{3,30}$'
     or not public.is_india_state_or_union_territory(identity_value ->> 'state')
     or char_length(btrim(identity_value ->> 'district')) not between 2 and 80
     or char_length(coalesce(identity_value ->> 'bio', '')) > 500
  then
    raise exception 'Identity and location are invalid'
      using errcode = '22023', detail = 'INVALID_IDENTITY_LOCATION';
  end if;

  if exists (
    select 1 from public.profiles
    where handle = identity_value ->> 'handle' and id <> actor_id
  ) then
    raise exception 'Handle is already in use'
      using errcode = '23505', detail = 'HANDLE_CONFLICT';
  end if;

  if role_details_value ? 'experienceYears' then
    if jsonb_typeof(role_details_value -> 'experienceYears') <> 'number'
       or (role_details_value ->> 'experienceYears') !~ '^[0-9]+$'
       or (role_details_value ->> 'experienceYears')::numeric not between 0 and 80
    then
      raise exception 'Experience years are invalid'
        using errcode = '22023', detail = 'INVALID_ROLE_DETAILS';
    end if;
    experience_years_value := (role_details_value ->> 'experienceYears')::integer;
  end if;

  if account_role_value = 'farmer' then
    farming_method_value := role_details_value ->> 'farmingMethod';
    if farming_method_value not in ('organic', 'natural', 'conventional', 'mixed')
       or experience_years_value is null
    then
      raise exception 'Farmer details are invalid'
        using errcode = '22023', detail = 'INVALID_ROLE_DETAILS';
    end if;
    participant_type_value := 'farmer';
    relationship_value := 'farms';
  elsif account_role_value = 'customer' then
    participant_type_value := 'buyer';
    relationship_value := 'interested_in';
  elsif account_role_value = 'wholesaler' then
    participant_type_value := 'fpo';
    relationship_value := 'buys';
  else
    participant_type_value := 'agri_business';
    relationship_value := 'services';
  end if;

  if account_role_value in ('customer', 'agri_business')
     and profile_visibility_value <> 'members'
  then
    raise exception 'This role uses member-only representative visibility'
      using errcode = '22023', detail = 'INVALID_PROFILE_VISIBILITY';
  end if;

  update public.profiles
  set full_name = btrim(identity_value ->> 'fullName'),
      handle = identity_value ->> 'handle',
      state = btrim(identity_value ->> 'state'),
      district = btrim(identity_value ->> 'district'),
      bio = coalesce(identity_value ->> 'bio', ''),
      account_role = account_role_value,
      participant_type = participant_type_value,
      farming_method = farming_method_value,
      experience_years = experience_years_value,
      preferred_locale = locale_value,
      preferred_language = case
        when locale_value = 'hi-IN' then 'hi'
        when locale_value = 'mr-IN' then 'mr'
        else 'en'
      end,
      public_profile_enabled = (
        account_role_value in ('farmer', 'wholesaler')
        and profile_visibility_value = 'public'
      ),
      onboarding_complete = true
  where id = actor_id;

  delete from public.profile_category_affinities where profile_id = actor_id;
  insert into public.profile_category_affinities (
    profile_id, category_slug, relationship, is_primary
  )
  select actor_id, category_slug, relationship_value, ordinal = 1
  from unnest(category_slugs_value) with ordinality category(category_slug, ordinal);

  delete from public.profile_custom_category_affinities where profile_id = actor_id;
  insert into public.custom_category_requests (
    requested_by, source, domain, relationship, original_label, locale_tag
  )
  select
    actor_id, 'onboarding_submission', 'farming_activity', relationship_value,
    original_label, locale_value
  from unnest(custom_labels_value) original_label
  on conflict (requested_by, domain, normalized_label)
    where status in ('pending', 'approved', 'merged')
  do nothing;

  insert into public.profile_custom_category_affinities (
    profile_id, custom_category_request_id, relationship, is_primary
  )
  select
    actor_id,
    request.id,
    request.relationship,
    row_number() over (order by request.created_at, request.id) = 1
  from public.custom_category_requests request
  where request.requested_by = actor_id
    and request.domain = 'farming_activity'
    and request.status in ('pending', 'approved', 'merged')
    and request.normalized_label in (
      select lower(regexp_replace(
        btrim(normalize(label, NFKC)), '[[:space:]]+', ' ', 'g'
      ))
      from unnest(custom_labels_value) label
    )
  on conflict do nothing;

  if account_role_value = 'agri_business' then
    if not public.is_ecosystem_release_enabled('agri_businesses') then
      raise exception 'Agricultural businesses are not released'
        using errcode = '55000', detail = 'AGRI_BUSINESSES_DISABLED';
    end if;
    organization_value := role_details_value -> 'organization';
    if jsonb_typeof(organization_value) <> 'object'
       or jsonb_typeof(organization_value -> 'serviceStates') <> 'array'
       or jsonb_array_length(organization_value -> 'serviceStates') not between 1 and 36
       or jsonb_typeof(organization_value -> 'companySectorSlugs') <> 'array'
       or jsonb_array_length(organization_value -> 'companySectorSlugs') not between 1 and 12
       or jsonb_typeof(draft_value -> 'companySectorSlugs') <> 'array'
       or draft_value -> 'companySectorSlugs'
         is distinct from organization_value -> 'companySectorSlugs'
       or exists (
         select 1 from jsonb_array_elements(organization_value -> 'serviceStates') item
         where jsonb_typeof(item) <> 'string'
       )
       or exists (
         select 1 from jsonb_array_elements(organization_value -> 'companySectorSlugs') item
         where jsonb_typeof(item) <> 'string'
       )
    then
      raise exception 'Organization onboarding details are invalid'
        using errcode = '22023', detail = 'INVALID_ORGANIZATION_DRAFT';
    end if;

    select coalesce(array_agg(value order by ordinal), '{}'::text[])
    into company_sector_slugs_value
    from jsonb_array_elements_text(draft_value -> 'companySectorSlugs')
      with ordinality item(value, ordinal);
    select jsonb_agg(jsonb_build_object(
      'state', value,
      'district', null,
      'service_radius_km', null
    ) order by ordinal)
    into organization_service_areas
    from jsonb_array_elements_text(organization_value -> 'serviceStates')
      with ordinality item(value, ordinal);

    organization_result := public.create_organization_with_owner(
      organization_value ->> 'organizationSlug',
      organization_value ->> 'organizationName',
      organization_value ->> 'organizationType',
      organization_value ->> 'description',
      identity_value ->> 'state',
      identity_value ->> 'district',
      organization_value ->> 'websiteUrl',
      company_sector_slugs_value,
      organization_service_areas
    );
    organization_id_value := (organization_result ->> 'organization_id')::uuid;
  end if;

  insert into public.product_events (user_id, event_name)
  select actor_id, 'profile_completed'
  where not exists (
    select 1 from public.product_events
    where user_id = actor_id and event_name = 'profile_completed'
  );

  next_revision := progress_value.revision + 1;
  update public.onboarding_progress
  set status = 'complete',
      revision = next_revision,
      last_idempotency_key = idempotency_key_input,
      last_idempotency_fingerprint = fingerprint_value
  where profile_id = actor_id;

  return query select 'COMPLETED'::text, next_revision, organization_id_value;
exception
  when check_violation then
    raise exception 'Final onboarding values failed validation'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_DRAFT';
end;
$$;

-- Extend the existing moderation queue only after every new target exists.
alter table public.reports
  drop constraint if exists reports_target_type_check;
alter table public.reports
  add constraint reports_target_type_check check (target_type in (
    'profile', 'post', 'comment', 'message', 'review', 'organization',
    'business_offer', 'produce_listing', 'certification_claim'
  ));

alter table public.moderation_actions
  drop constraint if exists moderation_actions_target_type_check;
alter table public.moderation_actions
  add constraint moderation_actions_target_type_check check (target_type in (
    'profile', 'post', 'comment', 'message', 'review', 'organization',
    'business_offer', 'produce_listing', 'certification_claim'
  ));

create or replace function public.apply_moderation_action(
  report_id_input uuid,
  action_input text,
  target_id_input uuid,
  target_type_input text,
  note_input text,
  moderator_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if action_input not in (
    'dismiss', 'hide', 'restore', 'suspend', 'unsuspend', 'verify', 'reject'
  ) then
    raise exception 'Unsupported moderation action'
      using errcode = '22023', detail = 'INVALID_MODERATION_ACTION';
  end if;
  if target_type_input not in (
    'profile', 'post', 'comment', 'message', 'review', 'organization',
    'business_offer', 'produce_listing', 'certification_claim'
  ) then
    raise exception 'Unsupported moderation target'
      using errcode = '22023', detail = 'INVALID_MODERATION_TARGET';
  end if;
  if char_length(coalesce(note_input, '')) > 1000 then
    raise exception 'Moderation note is too long'
      using errcode = '22023', detail = 'INVALID_MODERATION_NOTE';
  end if;

  if report_id_input is not null and not exists (
    select 1 from public.reports report
    where report.id = report_id_input
      and report.target_type = target_type_input
      and report.target_id = target_id_input
  ) then
    raise exception 'Report target does not match the moderation request'
      using errcode = '22023', detail = 'REPORT_TARGET_MISMATCH';
  end if;

  if action_input = 'dismiss' then
    update public.reports
    set status = 'dismissed', decided_at = now()
    where id = report_id_input;
  elsif target_type_input = 'profile' then
    update public.profiles
    set status = case
      when action_input = 'suspend' then 'suspended'
      when action_input in ('restore', 'unsuspend') then 'active'
      else status
    end,
    verification_status = case
      when action_input = 'verify' then 'verified'
      when action_input = 'reject' then 'rejected'
      else verification_status
    end
    where id = target_id_input;
  elsif target_type_input = 'post' then
    update public.posts
    set status = case when action_input = 'restore' then 'active' else 'hidden' end
    where id = target_id_input;
  elsif target_type_input = 'comment' then
    update public.comments
    set status = case when action_input = 'restore' then 'active' else 'hidden' end
    where id = target_id_input;
  elsif target_type_input = 'message' then
    update public.messages
    set status = case when action_input = 'restore' then 'active' else 'hidden' end
    where id = target_id_input;
  elsif target_type_input = 'review' then
    update public.market_reviews
    set status = case when action_input = 'restore' then 'active' else 'hidden' end
    where id = target_id_input;
  elsif target_type_input = 'organization' then
    update public.organizations
    set moderation_state = case
      when action_input = 'suspend' then 'suspended'
      when action_input in ('hide', 'reject') then 'restricted'
      when action_input in ('restore', 'unsuspend') then 'active'
      else moderation_state
    end
    where id = target_id_input;
  elsif target_type_input = 'business_offer' then
    update public.business_offers
    set moderation_state = case
          when action_input = 'verify' then 'approved'
          when action_input in ('hide', 'reject') then 'rejected'
          when action_input = 'restore' and requires_moderation_review then 'pending'
          when action_input = 'restore' then 'not_required'
          else moderation_state
        end,
        publication_state = case
          when action_input in ('hide', 'reject') and publication_state = 'published'
            then 'paused'
          else publication_state
        end
    where id = target_id_input;
  elsif target_type_input = 'produce_listing' then
    update public.produce_listings
    set status = case when action_input = 'restore' then 'active' else 'paused' end
    where id = target_id_input;
  elsif target_type_input = 'certification_claim' then
    update public.certification_claims
    set moderation_state = case
          when action_input = 'restore' then 'active'
          when action_input in ('hide', 'reject') then 'restricted'
          else moderation_state
        end,
        verification_state = case
          when action_input = 'verify' then 'reviewed'
          when action_input = 'reject' then 'rejected'
          else verification_state
        end,
        reviewed_by = case
          when action_input in ('verify', 'reject') then moderator_id_input
          else reviewed_by
        end,
        reviewed_at = case
          when action_input in ('verify', 'reject') then now()
          else reviewed_at
        end
    where id = target_id_input;
  end if;

  if action_input <> 'dismiss' and report_id_input is not null then
    update public.reports
    set status = 'actioned', decided_at = now()
    where id = report_id_input;
  end if;

  insert into public.moderation_actions (
    report_id, moderator_id, action, target_type, target_id, note
  ) values (
    report_id_input, moderator_id_input, action_input, target_type_input,
    target_id_input, coalesce(note_input, '')
  );
end;
$$;

revoke all on function public.apply_moderation_action(
  uuid, text, uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.apply_moderation_action(
  uuid, text, uuid, text, text, uuid
) to service_role;

alter table public.agriculture_legacy_crop_backfill_audit enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_membership_audit enable row level security;
alter table public.organization_category_affinities enable row level security;
alter table public.organization_service_areas enable row level security;
alter table public.organization_private_details enable row level security;
alter table public.organization_verification_requests enable row level security;
alter table public.certification_claims enable row level security;
alter table public.business_offers enable row level security;
alter table public.business_offer_categories enable row level security;
alter table public.business_offer_service_areas enable row level security;
alter table public.business_offer_media enable row level security;
alter table public.business_offer_enquiries enable row level security;
alter table public.business_offer_enquiry_events enable row level security;
alter table public.business_offer_enquiry_assignments enable row level security;

create trigger agriculture_legacy_crop_backfill_audit_immutable
before update or delete on public.agriculture_legacy_crop_backfill_audit
for each row execute function public.prevent_immutable_row_change();

create policy "administrators read crop backfill audit"
on public.agriculture_legacy_crop_backfill_audit for select to authenticated
using (public.is_admin());

create policy "visitors browse published organizations"
on public.organizations for select to anon
using (public.is_public_organization(id));
create policy "participants browse published or member organizations"
on public.organizations for select to authenticated
using (
  public.is_admin()
  or public.is_public_organization(id)
  or public.can_manage_organization(id, 'viewer')
);

create policy "members read permitted organization memberships"
on public.organization_memberships for select to authenticated
using (
  profile_id = (select auth.uid())
  or public.can_manage_organization(organization_id, 'admin')
  or public.is_admin()
);
create policy "organization administrators invite members"
on public.organization_memberships for insert to authenticated
with check (
  public.can_manage_organization(organization_id, 'admin')
  and profile_id <> (select auth.uid())
  and invited_by = (select auth.uid())
  and (role <> 'owner' or public.can_manage_organization(organization_id, 'owner'))
);
create policy "organization administrators update members"
on public.organization_memberships for update to authenticated
using (
  public.can_manage_organization(organization_id, 'admin')
  and (role <> 'owner' or public.can_manage_organization(organization_id, 'owner'))
)
with check (
  public.can_manage_organization(organization_id, 'admin')
  and (role <> 'owner' or public.can_manage_organization(organization_id, 'owner'))
);
create policy "organization administrators remove members"
on public.organization_memberships for delete to authenticated
using (
  public.can_manage_organization(organization_id, 'admin')
  and (role <> 'owner' or public.can_manage_organization(organization_id, 'owner'))
);

create policy "organization administrators read membership audit"
on public.organization_membership_audit for select to authenticated
using (
  subject_profile_id = (select auth.uid())
  or public.can_manage_organization(organization_id, 'admin')
  or public.is_admin()
);

create policy "visitors browse published organization categories"
on public.organization_category_affinities for select to anon
using (public.is_public_organization(organization_id));
create policy "participants browse permitted organization categories"
on public.organization_category_affinities for select to authenticated
using (
  public.is_public_organization(organization_id)
  or public.can_manage_organization(organization_id, 'viewer')
  or public.is_admin()
);
create policy "visitors browse published organization service areas"
on public.organization_service_areas for select to anon
using (public.is_public_organization(organization_id));
create policy "participants browse permitted organization service areas"
on public.organization_service_areas for select to authenticated
using (
  public.is_public_organization(organization_id)
  or public.can_manage_organization(organization_id, 'viewer')
  or public.is_admin()
);

create policy "organization administrators read private details"
on public.organization_private_details for select to authenticated
using (public.can_manage_organization(organization_id, 'admin') or public.is_admin());
create policy "organization administrators create private details"
on public.organization_private_details for insert to authenticated
with check (public.can_manage_organization(organization_id, 'admin'));
create policy "organization administrators update private details"
on public.organization_private_details for update to authenticated
using (public.can_manage_organization(organization_id, 'admin'))
with check (public.can_manage_organization(organization_id, 'admin'));
create policy "organization owners delete private details"
on public.organization_private_details for delete to authenticated
using (public.can_manage_organization(organization_id, 'owner'));

create policy "organization administrators read verification requests"
on public.organization_verification_requests for select to authenticated
using (public.can_manage_organization(organization_id, 'admin') or public.is_admin());
create policy "organization administrators submit verification requests"
on public.organization_verification_requests for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and public.can_manage_organization(organization_id, 'admin')
  and status = 'submitted'
  and reviewed_by is null
  and reviewed_at is null
);
create policy "organization administrators withdraw verification requests"
on public.organization_verification_requests for update to authenticated
using (
  requested_by = (select auth.uid())
  and public.can_manage_organization(organization_id, 'admin')
  and status in ('submitted', 'in_review')
)
with check (status = 'withdrawn');
create policy "visitors browse safe published certification claims"
on public.certification_claims for select to anon
using (
  publication_state = 'published'
  and moderation_state = 'active'
  and verification_state in ('self_declared', 'reviewed')
  and public.is_public_organization(organization_id)
  and (valid_until is null or valid_until >= current_date)
);
create policy "participants browse permitted certification claims"
on public.certification_claims for select to authenticated
using (
  (
    publication_state = 'published'
    and moderation_state = 'active'
    and verification_state in ('self_declared', 'reviewed')
    and public.is_public_organization(organization_id)
    and (valid_until is null or valid_until >= current_date)
  )
  or public.can_manage_organization(organization_id, 'viewer')
  or public.is_admin()
);
create policy "organization editors create certification claims"
on public.certification_claims for insert to authenticated
with check (
  public.can_manage_organization(organization_id, 'editor')
  and publication_state = 'draft'
  and verification_state = 'self_declared'
  and moderation_state = 'active'
  and reviewed_by is null
  and reviewed_at is null
);
create policy "organization editors update certification claims"
on public.certification_claims for update to authenticated
using (public.can_manage_organization(organization_id, 'editor'))
with check (public.can_manage_organization(organization_id, 'editor'));
create policy "organization editors delete draft certification claims"
on public.certification_claims for delete to authenticated
using (
  public.can_manage_organization(organization_id, 'editor')
  and publication_state = 'draft'
);

create policy "visitors browse current published business offers"
on public.business_offers for select to anon
using (public.is_public_business_offer(id));
create policy "participants browse public or managed business offers"
on public.business_offers for select to authenticated
using (
  public.is_public_business_offer(id)
  or public.can_manage_organization(organization_id, 'viewer')
  or public.is_admin()
);

create policy "visitors browse published offer categories"
on public.business_offer_categories for select to anon
using (public.is_public_business_offer(offer_id));
create policy "participants browse permitted offer categories"
on public.business_offer_categories for select to authenticated
using (
  public.is_public_business_offer(offer_id)
  or exists (
    select 1 from public.business_offers offer
    where offer.id = business_offer_categories.offer_id
      and public.can_manage_organization(offer.organization_id, 'viewer')
  )
  or public.is_admin()
);
create policy "visitors browse published offer service areas"
on public.business_offer_service_areas for select to anon
using (public.is_public_business_offer(offer_id));
create policy "participants browse permitted offer service areas"
on public.business_offer_service_areas for select to authenticated
using (
  public.is_public_business_offer(offer_id)
  or exists (
    select 1 from public.business_offers offer
    where offer.id = business_offer_service_areas.offer_id
      and public.can_manage_organization(offer.organization_id, 'viewer')
  )
  or public.is_admin()
);

create policy "visitors browse published offer media metadata"
on public.business_offer_media for select to anon
using (status = 'active' and public.is_public_business_offer(offer_id));
create policy "participants browse permitted offer media metadata"
on public.business_offer_media for select to authenticated
using (
  (status = 'active' and public.is_public_business_offer(offer_id))
  or exists (
    select 1 from public.business_offers offer
    where offer.id = business_offer_media.offer_id
      and public.can_manage_organization(offer.organization_id, 'viewer')
  )
  or public.is_admin()
);
create policy "organization editors create offer media metadata"
on public.business_offer_media for insert to authenticated
with check (
  exists (
    select 1 from public.business_offers offer
    where offer.id = business_offer_media.offer_id
      and public.can_manage_organization(offer.organization_id, 'editor')
  )
);
create policy "organization editors update offer media metadata"
on public.business_offer_media for update to authenticated
using (
  exists (
    select 1 from public.business_offers offer
    where offer.id = business_offer_media.offer_id
      and public.can_manage_organization(offer.organization_id, 'editor')
  )
)
with check (
  exists (
    select 1 from public.business_offers offer
    where offer.id = business_offer_media.offer_id
      and public.can_manage_organization(offer.organization_id, 'editor')
  )
);
create policy "organization editors delete offer media metadata"
on public.business_offer_media for delete to authenticated
using (
  exists (
    select 1 from public.business_offers offer
    where offer.id = business_offer_media.offer_id
      and public.can_manage_organization(offer.organization_id, 'editor')
  )
);

create policy "requesters and agents read offer enquiries"
on public.business_offer_enquiries for select to authenticated
using (public.can_access_business_offer_enquiry(id));
create policy "authorized agents update offer enquiry status"
on public.business_offer_enquiries for update to authenticated
using (
  public.can_respond_to_organization_enquiry(organization_id)
  or public.is_admin()
)
with check (
  public.can_respond_to_organization_enquiry(organization_id)
  or public.is_admin()
);

create policy "requesters and agents read immutable enquiry events"
on public.business_offer_enquiry_events for select to authenticated
using (public.can_access_business_offer_enquiry(enquiry_id));
create policy "requesters and agents send enquiry messages"
on public.business_offer_enquiry_events for insert to authenticated
with check (
  actor_profile_id = (select auth.uid())
  and event_type = 'message'
  and char_length(btrim(body)) between 1 and 2000
  and from_status is null
  and to_status is null
  and metadata = '{}'::jsonb
  and public.can_access_business_offer_enquiry(enquiry_id)
);

create policy "requesters and agents read enquiry assignments"
on public.business_offer_enquiry_assignments for select to authenticated
using (public.can_access_business_offer_enquiry(enquiry_id));
create policy "authorized agents assign offer enquiries"
on public.business_offer_enquiry_assignments for insert to authenticated
with check (
  assigned_by_profile_id = (select auth.uid())
  and exists (
    select 1 from public.business_offer_enquiries enquiry
    where enquiry.id = business_offer_enquiry_assignments.enquiry_id
      and public.can_respond_to_organization_enquiry(enquiry.organization_id)
  )
);
create policy "authorized agents update offer enquiry assignments"
on public.business_offer_enquiry_assignments for update to authenticated
using (
  exists (
    select 1 from public.business_offer_enquiries enquiry
    where enquiry.id = business_offer_enquiry_assignments.enquiry_id
      and public.can_respond_to_organization_enquiry(enquiry.organization_id)
  )
)
with check (
  exists (
    select 1 from public.business_offer_enquiries enquiry
    where enquiry.id = business_offer_enquiry_assignments.enquiry_id
      and public.can_respond_to_organization_enquiry(enquiry.organization_id)
  )
);

-- Start from no browser privileges, then grant only columns used by a policy.
revoke all on table
  public.agriculture_legacy_crop_backfill_audit,
  public.organizations,
  public.organization_memberships,
  public.organization_membership_audit,
  public.organization_category_affinities,
  public.organization_service_areas,
  public.organization_private_details,
  public.organization_verification_requests,
  public.certification_claims,
  public.business_offers,
  public.business_offer_categories,
  public.business_offer_service_areas,
  public.business_offer_media,
  public.business_offer_enquiries,
  public.business_offer_enquiry_events,
  public.business_offer_enquiry_assignments
from anon, authenticated;

grant select (
  migration_key, profiles_scanned, values_scanned, mapped_value_count,
  safe_custom_value_count, unsafe_skipped_count, mapped_affinity_insert_count,
  custom_request_insert_count, custom_affinity_insert_count, executed_at
) on public.agriculture_legacy_crop_backfill_audit to authenticated;

grant select (
  id, slug, display_name, organization_type, description, state, district,
  website_url, publication_state, verification_state, moderation_state,
  created_at, updated_at, published_at
) on public.organizations to anon, authenticated;

grant select (
  organization_id, profile_id, role, status, invited_by, joined_at,
  created_at, updated_at
) on public.organization_memberships to authenticated;
grant insert (
  organization_id, profile_id, role, status, invited_by, joined_at
) on public.organization_memberships to authenticated;
grant update (role, status, joined_at)
  on public.organization_memberships to authenticated;
grant delete on public.organization_memberships to authenticated;

grant select (
  id, organization_id, actor_profile_id, subject_profile_id, action,
  old_role, new_role, old_status, new_status, created_at
) on public.organization_membership_audit to authenticated;

grant select (organization_id, category_slug, is_primary, created_at)
  on public.organization_category_affinities to anon, authenticated;
grant select (
  id, organization_id, state, district, service_radius_km, created_at
) on public.organization_service_areas to anon, authenticated;

grant select on public.organization_private_details to authenticated;
grant insert (
  organization_id, registration_type, registration_number, gstin, cin,
  contact_name, contact_email, contact_phone, public_contact_consent
) on public.organization_private_details to authenticated;
grant update (
  registration_type, registration_number, gstin, cin, contact_name,
  contact_email, contact_phone, public_contact_consent
) on public.organization_private_details to authenticated;
grant delete on public.organization_private_details to authenticated;

grant select on public.organization_verification_requests to authenticated;
grant insert (
  organization_id, requested_by, evidence_path, evidence_mime_type,
  evidence_size_bytes, applicant_note
) on public.organization_verification_requests to authenticated;
grant update (
  status, evidence_path, evidence_mime_type, evidence_size_bytes, applicant_note
) on public.organization_verification_requests to authenticated;

grant select (
  id, organization_id, offer_id, claim_type, claim_text, issuer_name,
  certificate_number, valid_from, valid_until, risk_level,
  verification_state, publication_state, moderation_state, created_at, updated_at
) on public.certification_claims to anon, authenticated;
grant insert (
  organization_id, offer_id, claim_type, claim_text, issuer_name,
  certificate_number, valid_from, valid_until, risk_level, evidence_path
) on public.certification_claims to authenticated;
grant update (
  offer_id, claim_type, claim_text, issuer_name, certificate_number,
  valid_from, valid_until, risk_level, publication_state, evidence_path
) on public.certification_claims to authenticated;
grant delete on public.certification_claims to authenticated;

grant select (
  id, organization_id, kind, content_locale, title, description, terms,
  valid_from, valid_until, price_model, currency, price_min, price_max,
  price_unit, publication_state, moderation_state, requires_moderation_review,
  created_at, updated_at, published_at
) on public.business_offers to anon, authenticated;
grant select (offer_id, category_slug, is_primary, created_at)
  on public.business_offer_categories to anon, authenticated;
grant select (id, offer_id, state, district, service_radius_km, created_at)
  on public.business_offer_service_areas to anon, authenticated;
grant select (
  id, offer_id, storage_path, mime_type, size_bytes, alt_text, sort_order,
  status, created_at, updated_at
) on public.business_offer_media to anon, authenticated;
grant insert (
  offer_id, storage_path, mime_type, size_bytes, alt_text, sort_order, status
) on public.business_offer_media to authenticated;
grant update (alt_text, sort_order, status)
  on public.business_offer_media to authenticated;
grant delete on public.business_offer_media to authenticated;

grant select (
  id, offer_id, organization_id, requester_id, idempotency_key, message,
  quantity_needed, need_by, status, offer_snapshot, created_at, updated_at
) on public.business_offer_enquiries to authenticated;
grant update (status) on public.business_offer_enquiries to authenticated;
grant select (
  id, enquiry_id, actor_profile_id, event_type, body, from_status, to_status,
  metadata, created_at
) on public.business_offer_enquiry_events to authenticated;
grant insert (enquiry_id, actor_profile_id, event_type, body, metadata)
  on public.business_offer_enquiry_events to authenticated;
grant select on public.business_offer_enquiry_assignments to authenticated;
grant insert (
  enquiry_id, assignee_profile_id, assigned_by_profile_id, active,
  assigned_at, unassigned_at
) on public.business_offer_enquiry_assignments to authenticated;
grant update (active, unassigned_at)
  on public.business_offer_enquiry_assignments to authenticated;

-- Mutation RPCs are the only browser write path for organization and offer rows.
revoke all on function public.create_organization_with_owner(
  text, text, text, text, text, text, text, text[], jsonb
) from public, anon, authenticated;
grant execute on function public.create_organization_with_owner(
  text, text, text, text, text, text, text, text[], jsonb
) to authenticated;

revoke all on function public.update_organization(
  text, text, text, text, text, text, text, text[], jsonb, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.update_organization(
  text, text, text, text, text, text, text, text[], jsonb, uuid, timestamptz
) to authenticated;

revoke all on function public.set_organization_publication(
  uuid, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.set_organization_publication(
  uuid, text, timestamptz
) to authenticated;

revoke all on function public.create_business_offer(
  uuid, text, text, text, text, text, date, date, text, text, numeric,
  numeric, text, text[], jsonb, text, boolean
) from public, anon, authenticated;
grant execute on function public.create_business_offer(
  uuid, text, text, text, text, text, date, date, text, text, numeric,
  numeric, text, text[], jsonb, text, boolean
) to authenticated;

revoke all on function public.update_business_offer(
  uuid, text, text, text, text, text, date, date, text, text, numeric,
  numeric, text, text[], jsonb, text, boolean, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.update_business_offer(
  uuid, text, text, text, text, text, date, date, text, text, numeric,
  numeric, text, text[], jsonb, text, boolean, uuid, timestamptz
) to authenticated;

revoke all on function public.set_business_offer_publication(
  uuid, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.set_business_offer_publication(
  uuid, text, timestamptz
) to authenticated;

revoke all on function public.connect_to_business_offer(
  uuid, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.connect_to_business_offer(
  uuid, text, text, text, uuid
) to authenticated;

revoke all on function public.finalize_onboarding(integer, uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_onboarding(integer, uuid)
  to authenticated;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values
  (
    'organization-verification', 'organization-verification', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'offer-images', 'offer-images', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "organization administrators read verification evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'organization-verification'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and (
        public.can_manage_organization(organization.id, 'admin')
        or public.is_admin()
      )
  )
);
create policy "organization administrators upload verification evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'organization-verification'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_manage_organization(organization.id, 'admin')
  )
);
create policy "organization administrators replace verification evidence"
on storage.objects for update to authenticated
using (
  bucket_id = 'organization-verification'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_manage_organization(organization.id, 'admin')
  )
)
with check (
  bucket_id = 'organization-verification'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_manage_organization(organization.id, 'admin')
  )
);
create policy "organization administrators delete verification evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'organization-verification'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_manage_organization(organization.id, 'admin')
  )
);

create policy "organization members read their offer images"
on storage.objects for select to authenticated
using (
  bucket_id = 'offer-images'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and (
        public.can_manage_organization(organization.id, 'viewer')
        or public.is_admin()
      )
  )
);
create policy "organization editors upload offer images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'offer-images'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_manage_organization(organization.id, 'editor')
  )
);
create policy "organization editors replace offer images"
on storage.objects for update to authenticated
using (
  bucket_id = 'offer-images'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_manage_organization(organization.id, 'editor')
  )
)
with check (
  bucket_id = 'offer-images'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_manage_organization(organization.id, 'editor')
  )
);
create policy "organization editors delete offer images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'offer-images'
  and exists (
    select 1 from public.organizations organization
    where organization.id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_manage_organization(organization.id, 'editor')
  )
);

create or replace function public.guard_verification_request_review_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and not (
       (old.status = 'submitted' and new.status in (
         'in_review', 'approved', 'rejected', 'withdrawn'
       ))
       or (old.status = 'in_review' and new.status in (
         'approved', 'rejected', 'withdrawn'
       ))
     )
  then
    raise exception 'Verification request state transition is invalid'
      using errcode = '23514', detail = 'INVALID_VERIFICATION_TRANSITION';
  end if;

  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if new.moderator_note is distinct from old.moderator_note
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.status not in ('submitted', 'withdrawn')
  then
    raise exception 'Only platform administrators can review verification requests'
      using errcode = '42501', detail = 'VERIFICATION_REVIEW_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger organization_verification_requests_guard_review_fields
before update on public.organization_verification_requests
for each row execute function public.guard_verification_request_review_fields();

revoke all on function public.guard_verification_request_review_fields()
  from public, anon, authenticated;

create or replace function public.sync_organization_verification_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    update public.organizations
    set verification_state = case new.status
      when 'approved' then 'verified'
      when 'rejected' then 'rejected'
      when 'submitted' then 'pending'
      when 'in_review' then 'pending'
      when 'withdrawn' then 'unverified'
      else verification_state
    end
    where id = new.organization_id;
  end if;
  return new;
end;
$$;

create trigger organization_verification_requests_sync_organization
after insert or update of status on public.organization_verification_requests
for each row execute function public.sync_organization_verification_state();

revoke all on function public.sync_organization_verification_state()
  from public, anon, authenticated;

create or replace function public.review_organization_verification_request(
  request_id_input uuid,
  decision_input text,
  moderator_note_input text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request_row public.organization_verification_requests%rowtype;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'Platform administrator access is required'
      using errcode = '42501', detail = 'ADMIN_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('agri_businesses') then
    raise exception 'Agricultural businesses are not enabled'
      using errcode = '55000', detail = 'AGRI_BUSINESSES_DISABLED';
  end if;
  if decision_input not in ('in_review', 'approved', 'rejected') then
    raise exception 'Verification decision is invalid'
      using errcode = '22023', detail = 'INVALID_VERIFICATION_DECISION';
  end if;
  if char_length(coalesce(moderator_note_input, '')) > 2000 then
    raise exception 'Moderator note is too long'
      using errcode = '22023', detail = 'INVALID_MODERATOR_NOTE';
  end if;

  select * into request_row
  from public.organization_verification_requests verification_request
  where verification_request.id = request_id_input
  for update;
  if not found then
    raise exception 'Verification request was not found'
      using errcode = 'P0002', detail = 'VERIFICATION_REQUEST_NOT_FOUND';
  end if;
  if request_row.status not in ('submitted', 'in_review') then
    raise exception 'Verification request is no longer reviewable'
      using errcode = '55000', detail = 'VERIFICATION_REQUEST_FINAL';
  end if;
  if request_row.status = 'in_review' and decision_input = 'in_review' then
    return jsonb_build_object(
      'request_id', request_row.id,
      'organization_id', request_row.organization_id,
      'status', request_row.status,
      'reviewed_by', request_row.reviewed_by,
      'reviewed_at', request_row.reviewed_at
    );
  end if;

  update public.organization_verification_requests
  set status = decision_input,
      moderator_note = coalesce(moderator_note_input, ''),
      reviewed_by = actor_id,
      reviewed_at = now()
  where id = request_row.id
  returning * into request_row;

  return jsonb_build_object(
    'request_id', request_row.id,
    'organization_id', request_row.organization_id,
    'status', request_row.status,
    'reviewed_by', request_row.reviewed_by,
    'reviewed_at', request_row.reviewed_at
  );
end;
$$;

revoke all on function public.review_organization_verification_request(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.review_organization_verification_request(
  uuid, text, text
) to authenticated;

-- Remove every accumulated browser UPDATE grant on profiles, including grants
-- from legacy migrations, then restore only ordinary owner-editable settings.
revoke update on table public.profiles from authenticated;
do $$
declare
  profile_column record;
begin
  for profile_column in
    select attribute.attname as column_name
    from pg_catalog.pg_attribute attribute
    where attribute.attrelid = 'public.profiles'::regclass
      and attribute.attnum > 0
      and not attribute.attisdropped
  loop
    execute pg_catalog.format(
      'revoke update (%I) on table public.profiles from authenticated',
      profile_column.column_name
    );
  end loop;
end;
$$;

grant update (
  handle, full_name, district, state, crops, bio, experience_years,
  farm_size_text, preferred_language, preferred_locale, avatar_path,
  cover_path, public_profile_enabled, farming_method, website_url,
  linkedin_url, instagram_url, facebook_url, youtube_url, updated_at
) on public.profiles to authenticated;

create or replace function public.complete_legacy_onboarding(
  profile_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_profile public.profiles%rowtype;
  social_links_value jsonb;
  account_role_value text;
  participant_type_value text;
  expected_participant_type text;
  locale_value text;
  legacy_language_value text;
  farming_method_value text;
  experience_years_value integer;
  crops_value text[];
  website_value text;
  linkedin_value text;
  instagram_value text;
  facebook_value text;
  youtube_value text;
begin
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', detail = 'UNAUTHENTICATED';
  end if;
  if jsonb_typeof(profile_input) <> 'object'
     or pg_column_size(profile_input) > 8192
  then
    raise exception 'Legacy onboarding payload is invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_ONBOARDING';
  end if;
  if exists (
    select 1 from jsonb_object_keys(profile_input) key
    where key <> all (array[
      'fullName', 'handle', 'participantType', 'accountRole', 'district',
      'state', 'crops', 'bio', 'preferredLanguage', 'preferredLocale',
      'experienceYears', 'farmingMethod', 'socialLinks', 'termsAccepted'
    ]::text[])
  ) then
    raise exception 'Legacy onboarding payload contains unsupported fields'
      using errcode = '22023', detail = 'UNSUPPORTED_LEGACY_ONBOARDING_FIELD';
  end if;

  select * into current_profile
  from public.profiles
  where id = actor_id
  for update;

  if current_profile.id is null then
    raise exception 'Profile not found'
      using errcode = 'P0002', detail = 'PROFILE_NOT_FOUND';
  end if;
  if current_profile.status <> 'active' then
    raise exception 'An active profile is required'
      using errcode = '42501', detail = 'ACTIVE_PROFILE_REQUIRED';
  end if;
  if current_profile.onboarding_complete then
    raise exception 'Onboarding is already complete'
      using errcode = '55000', detail = 'ONBOARDING_ALREADY_COMPLETE';
  end if;

  if jsonb_typeof(profile_input -> 'fullName') <> 'string'
     or jsonb_typeof(profile_input -> 'handle') <> 'string'
     or jsonb_typeof(profile_input -> 'participantType') <> 'string'
     or jsonb_typeof(profile_input -> 'accountRole') <> 'string'
     or jsonb_typeof(profile_input -> 'district') <> 'string'
     or jsonb_typeof(profile_input -> 'state') <> 'string'
     or jsonb_typeof(profile_input -> 'crops') <> 'array'
     or jsonb_typeof(profile_input -> 'bio') <> 'string'
     or jsonb_typeof(profile_input -> 'termsAccepted') <> 'boolean'
     or profile_input -> 'termsAccepted' <> 'true'::jsonb
  then
    raise exception 'Required legacy onboarding fields are invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_ONBOARDING';
  end if;

  account_role_value := profile_input ->> 'accountRole';
  participant_type_value := profile_input ->> 'participantType';
  if account_role_value not in ('farmer', 'customer', 'wholesaler') then
    raise exception 'Agricultural businesses must use the new onboarding flow'
      using errcode = '22023', detail = 'LEGACY_ROLE_NOT_SUPPORTED';
  end if;
  expected_participant_type := case account_role_value
    when 'farmer' then 'farmer'
    when 'customer' then 'buyer'
    when 'wholesaler' then 'fpo'
  end;
  if participant_type_value <> expected_participant_type then
    raise exception 'Legacy participant type does not match the account role'
      using errcode = '22023', detail = 'LEGACY_ROLE_MISMATCH';
  end if;

  if char_length(btrim(profile_input ->> 'fullName')) not between 2 and 80
     or (profile_input ->> 'handle') !~ '^[a-z0-9_]{3,30}$'
     or char_length(btrim(profile_input ->> 'district')) not between 2 and 80
     or not public.is_india_state_or_union_territory(profile_input ->> 'state')
     or char_length(profile_input ->> 'bio') > 500
  then
    raise exception 'Legacy identity and location are invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_IDENTITY';
  end if;
  if exists (
    select 1 from public.profiles profile
    where profile.handle = profile_input ->> 'handle'
      and profile.id <> actor_id
  ) then
    raise exception 'Handle is already in use'
      using errcode = '23505', detail = 'HANDLE_CONFLICT';
  end if;

  if jsonb_array_length(profile_input -> 'crops') > 8
     or exists (
       select 1 from jsonb_array_elements(profile_input -> 'crops') crop
       where jsonb_typeof(crop) <> 'string'
          or char_length(btrim(crop #>> '{}')) not between 1 and 40
          or (crop #>> '{}') ~ '[[:cntrl:]]'
          or translate(
            crop #>> '{}',
            chr(8203) || chr(8234) || chr(8235) || chr(8236) || chr(8237) ||
            chr(8238) || chr(8288) || chr(8294) || chr(8295) || chr(8296) ||
            chr(8297) || chr(65279),
            ''
          ) <> crop #>> '{}'
          or (crop #>> '{}') ~* '(https?://|www[.]|@|whats?app|buy[[:space:]]+now|call[[:space:]]+now)'
          or (crop #>> '{}') ~ '[+]?[0-9][0-9 ().-]{6,}[0-9]'
     )
  then
    raise exception 'Legacy crop values are invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_CROPS';
  end if;

  select coalesce(array_agg(btrim(value) order by ordinal), '{}'::text[])
  into crops_value
  from jsonb_array_elements_text(profile_input -> 'crops')
    with ordinality crop(value, ordinal);
  if cardinality(crops_value) <> (
       select count(distinct lower(value)) from unnest(crops_value) value
     )
     or (
       account_role_value in ('farmer', 'wholesaler')
       and cardinality(crops_value) < 1
     )
  then
    raise exception 'Legacy crop selections are invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_CROPS';
  end if;

  if profile_input ? 'experienceYears'
     and jsonb_typeof(profile_input -> 'experienceYears') <> 'null'
  then
    if jsonb_typeof(profile_input -> 'experienceYears') <> 'number'
       or (profile_input ->> 'experienceYears') !~ '^[0-9]+$'
       or (profile_input ->> 'experienceYears')::numeric not between 0 and 80
    then
      raise exception 'Legacy experience is invalid'
        using errcode = '22023', detail = 'INVALID_LEGACY_EXPERIENCE';
    end if;
    experience_years_value := (profile_input ->> 'experienceYears')::integer;
  end if;

  if account_role_value = 'farmer' then
    if jsonb_typeof(profile_input -> 'farmingMethod') <> 'string'
       or profile_input ->> 'farmingMethod' not in (
         'organic', 'natural', 'conventional', 'mixed'
       )
    then
      raise exception 'Legacy farming method is invalid'
        using errcode = '22023', detail = 'INVALID_LEGACY_FARMING_METHOD';
    end if;
    farming_method_value := profile_input ->> 'farmingMethod';
  elsif profile_input ? 'farmingMethod'
        and jsonb_typeof(profile_input -> 'farmingMethod') <> 'null'
  then
    raise exception 'Farming method applies only to farmers'
      using errcode = '22023', detail = 'INVALID_LEGACY_FARMING_METHOD';
  end if;

  if profile_input ? 'preferredLanguage'
     and (
       jsonb_typeof(profile_input -> 'preferredLanguage') <> 'string'
       or profile_input ->> 'preferredLanguage' not in ('en', 'hi', 'mr')
     )
  then
    raise exception 'Legacy language is invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_LOCALE';
  end if;
  legacy_language_value := coalesce(profile_input ->> 'preferredLanguage', 'en');
  locale_value := coalesce(
    profile_input ->> 'preferredLocale',
    case legacy_language_value
      when 'hi' then 'hi-IN'
      when 'mr' then 'mr-IN'
      else 'en-IN'
    end
  );
  if (profile_input ? 'preferredLocale' and jsonb_typeof(profile_input -> 'preferredLocale') <> 'string')
     or not exists (
       select 1 from public.supported_locales locale
       where locale.locale_tag = locale_value and locale.enabled
     )
  then
    raise exception 'Legacy locale is invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_LOCALE';
  end if;
  if locale_value not in ('en-IN', 'hi-IN', 'mr-IN')
     and not public.is_ecosystem_release_enabled('extended_locales')
  then
    raise exception 'Extended locales are not released'
      using errcode = '55000', detail = 'EXTENDED_LOCALES_DISABLED';
  end if;

  social_links_value := coalesce(profile_input -> 'socialLinks', '{}'::jsonb);
  if jsonb_typeof(social_links_value) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(social_links_value) key
       where key <> all (array[
         'website', 'linkedin', 'instagram', 'facebook', 'youtube'
       ]::text[])
     )
     or exists (
       select 1 from jsonb_each(social_links_value) link
       where jsonb_typeof(link.value) not in ('string', 'null')
          or (
            jsonb_typeof(link.value) = 'string'
            and (
              char_length(link.value #>> '{}') > 300
              or (link.value #>> '{}') !~ '^https://[^[:space:]]+$'
            )
          )
     )
  then
    raise exception 'Legacy social links are invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_SOCIAL_LINKS';
  end if;

  website_value := nullif(btrim(social_links_value ->> 'website'), '');
  linkedin_value := nullif(btrim(social_links_value ->> 'linkedin'), '');
  instagram_value := nullif(btrim(social_links_value ->> 'instagram'), '');
  facebook_value := nullif(btrim(social_links_value ->> 'facebook'), '');
  youtube_value := nullif(btrim(social_links_value ->> 'youtube'), '');
  if (linkedin_value is not null and linkedin_value !~* '^https://([^/]+[.])?linkedin[.]com(/|$)')
     or (instagram_value is not null and instagram_value !~* '^https://([^/]+[.])?instagram[.]com(/|$)')
     or (facebook_value is not null and facebook_value !~* '^https://([^/]+[.])?(facebook[.]com|fb[.]com)(/|$)')
     or (youtube_value is not null and youtube_value !~* '^https://([^/]+[.])?(youtube[.]com|youtu[.]be)(/|$)')
  then
    raise exception 'Legacy social-network host is invalid'
      using errcode = '22023', detail = 'INVALID_LEGACY_SOCIAL_LINKS';
  end if;

  update public.profiles
  set full_name = btrim(profile_input ->> 'fullName'),
      handle = profile_input ->> 'handle',
      participant_type = expected_participant_type,
      account_role = account_role_value,
      district = btrim(profile_input ->> 'district'),
      state = profile_input ->> 'state',
      crops = crops_value,
      bio = profile_input ->> 'bio',
      preferred_locale = locale_value,
      preferred_language = case
        when locale_value = 'hi-IN' then 'hi'
        when locale_value = 'mr-IN' then 'mr'
        else 'en'
      end,
      experience_years = experience_years_value,
      farming_method = farming_method_value,
      website_url = website_value,
      linkedin_url = linkedin_value,
      instagram_url = instagram_value,
      facebook_url = facebook_value,
      youtube_url = youtube_value,
      public_profile_enabled = false,
      onboarding_complete = true
  where id = actor_id;

  insert into public.product_events (user_id, event_name)
  select actor_id, 'profile_completed'
  where not exists (
    select 1 from public.product_events
    where user_id = actor_id and event_name = 'profile_completed'
  );

  return jsonb_build_object(
    'code', 'COMPLETED',
    'account_role', account_role_value,
    'preferred_locale', locale_value
  );
exception
  when unique_violation then
    raise exception 'Handle is already in use'
      using errcode = '23505', detail = 'HANDLE_CONFLICT';
  when check_violation then
    raise exception 'Legacy onboarding values failed validation'
      using errcode = '22023', detail = 'INVALID_LEGACY_ONBOARDING';
end;
$$;

revoke all on function public.complete_legacy_onboarding(jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_legacy_onboarding(jsonb)
  to authenticated;
