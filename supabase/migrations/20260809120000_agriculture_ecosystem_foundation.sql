-- Agriculture ecosystem foundation: scheduled Indian languages, a normalized
-- agriculture taxonomy, resumable onboarding, custom-category moderation, and
-- an additive agricultural-business role. Existing profile, crop, marketplace,
-- and participant-type columns remain unchanged for application compatibility.

create table public.supported_locales (
  locale_tag text primary key
    check (locale_tag ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  english_name text not null unique
    check (char_length(trim(english_name)) between 2 and 80),
  native_name text not null
    check (char_length(trim(native_name)) between 1 and 80),
  text_direction text not null default 'ltr'
    check (text_direction in ('ltr', 'rtl')),
  fallback_locale text references public.supported_locales(locale_tag)
    on delete restrict,
  enabled boolean not null default true,
  human_review_status text not null default 'pending'
    check (human_review_status in ('pending', 'reviewed', 'changes_requested')),
  human_reviewed_at timestamptz,
  human_reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (fallback_locale is null or fallback_locale <> locale_tag),
  check (
    (human_review_status = 'reviewed' and human_reviewed_at is not null)
    or human_review_status <> 'reviewed'
  )
);

insert into public.supported_locales (
  locale_tag, english_name, native_name, text_direction, fallback_locale,
  human_review_status, human_reviewed_at
) values
  ('en-IN', 'English', 'English', 'ltr', null, 'reviewed', now()),
  ('as-IN', 'Assamese', 'অসমীয়া', 'ltr', 'en-IN', 'pending', null),
  ('bn-IN', 'Bengali', 'বাংলা', 'ltr', 'en-IN', 'pending', null),
  ('brx-IN', 'Bodo', 'बड़ो', 'ltr', 'en-IN', 'pending', null),
  ('doi-IN', 'Dogri', 'डोगरी', 'ltr', 'en-IN', 'pending', null),
  ('gu-IN', 'Gujarati', 'ગુજરાતી', 'ltr', 'en-IN', 'pending', null),
  ('hi-IN', 'Hindi', 'हिन्दी', 'ltr', 'en-IN', 'pending', null),
  ('kn-IN', 'Kannada', 'ಕನ್ನಡ', 'ltr', 'en-IN', 'pending', null),
  ('ks-Arab-IN', 'Kashmiri', 'کٲشُر', 'rtl', 'en-IN', 'pending', null),
  ('kok-Deva-IN', 'Konkani', 'कोंकणी', 'ltr', 'en-IN', 'pending', null),
  ('mai-IN', 'Maithili', 'मैथिली', 'ltr', 'en-IN', 'pending', null),
  ('ml-IN', 'Malayalam', 'മലയാളം', 'ltr', 'en-IN', 'pending', null),
  ('mni-Mtei-IN', 'Manipuri', 'ꯃꯤꯇꯩ ꯂꯣꯟ', 'ltr', 'en-IN', 'pending', null),
  ('mr-IN', 'Marathi', 'मराठी', 'ltr', 'en-IN', 'pending', null),
  ('ne-IN', 'Nepali', 'नेपाली', 'ltr', 'en-IN', 'pending', null),
  ('or-IN', 'Odia', 'ଓଡ଼ିଆ', 'ltr', 'en-IN', 'pending', null),
  ('pa-Guru-IN', 'Punjabi', 'ਪੰਜਾਬੀ', 'ltr', 'en-IN', 'pending', null),
  ('sa-IN', 'Sanskrit', 'संस्कृतम्', 'ltr', 'en-IN', 'pending', null),
  ('sat-Olck-IN', 'Santali', 'ᱥᱟᱱᱛᱟᱲᱤ', 'ltr', 'en-IN', 'pending', null),
  ('sd-Arab-IN', 'Sindhi', 'سنڌي', 'rtl', 'en-IN', 'pending', null),
  ('ta-IN', 'Tamil', 'தமிழ்', 'ltr', 'en-IN', 'pending', null),
  ('te-IN', 'Telugu', 'తెలుగు', 'ltr', 'en-IN', 'pending', null),
  ('ur-IN', 'Urdu', 'اردو', 'rtl', 'en-IN', 'pending', null);

alter table public.profiles
  add column preferred_locale text not null default 'en-IN'
    references public.supported_locales(locale_tag) on delete restrict;

update public.profiles
set preferred_locale = case preferred_language
  when 'hi' then 'hi-IN'
  when 'mr' then 'mr-IN'
  else 'en-IN'
end
where preferred_language in ('en', 'hi', 'mr');

alter table public.profiles
  drop constraint if exists profiles_account_role_check;
alter table public.profiles
  add constraint profiles_account_role_check
    check (account_role in ('farmer', 'customer', 'wholesaler', 'agri_business'));

alter table public.profiles
  drop constraint if exists profiles_participant_type_check;
alter table public.profiles
  add constraint profiles_participant_type_check
    check (participant_type in (
      'farmer', 'agronomist', 'fpo', 'buyer', 'trainer', 'ngo', 'agri_business'
    ));

grant update (preferred_locale) on public.profiles to authenticated;
grant select (preferred_locale) on public.profiles to anon, authenticated;

drop policy if exists "visitors view active supplier profiles" on public.profiles;
create policy "visitors view active supplier profiles"
on public.profiles for select to anon
using (
  status = 'active'
  and onboarding_complete
  and public_profile_enabled
  and account_role in ('farmer', 'wholesaler', 'agri_business')
);

create table public.agriculture_categories (
  slug text primary key
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    check (char_length(slug) between 2 and 80),
  parent_slug text references public.agriculture_categories(slug) on delete restrict,
  domain text not null check (domain in (
    'farming_activity', 'commodity', 'business_sector', 'offer_category'
  )),
  translation_key text not null unique
    check (char_length(translation_key) between 3 and 160),
  selectable boolean not null default true,
  sort_order integer not null
    check (sort_order between 0 and 10000),
  status text not null default 'active'
    check (status in ('active', 'retired')),
  check (parent_slug is null or parent_slug <> slug)
);

insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order
) values
  ('crop-cultivation', null, 'farming_activity', 'agriculture.categories.crop-cultivation', false, 10),
  ('horticulture', null, 'farming_activity', 'agriculture.categories.horticulture', false, 20),
  ('livestock', null, 'farming_activity', 'agriculture.categories.livestock', false, 30),
  ('poultry', null, 'farming_activity', 'agriculture.categories.poultry', false, 40),
  ('fisheries-aquaculture', null, 'farming_activity', 'agriculture.categories.fisheries-aquaculture', false, 50),
  ('allied-activities', null, 'farming_activity', 'agriculture.categories.allied-activities', false, 60);

insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order
)
select seed.slug, seed.parent_slug,
  case when seed.category_kind = 'commodity' then 'commodity' else 'farming_activity' end,
  'agriculture.categories.' || seed.slug, seed.is_selectable, seed.sort_order
from (values
  ('cereals-grains', 'Cereals and grains', 'activity', 'crop-cultivation', true, 10),
  ('pulses-legumes', 'Pulses and legumes', 'activity', 'crop-cultivation', true, 20),
  ('oilseeds', 'Oilseeds', 'activity', 'crop-cultivation', true, 30),
  ('commercial-field-crops', 'Commercial and field crops', 'activity', 'crop-cultivation', true, 40),
  ('fodder-forage', 'Fodder and forage crops', 'activity', 'crop-cultivation', true, 50),
  ('fruit-orchards', 'Fruit and orchard farming', 'activity', 'horticulture', true, 10),
  ('vegetables', 'Vegetable farming', 'activity', 'horticulture', true, 20),
  ('spices-condiments', 'Spices and condiments', 'activity', 'horticulture', true, 30),
  ('flowers-floriculture', 'Flowers and floriculture', 'activity', 'horticulture', true, 40),
  ('medicinal-aromatic-plants', 'Medicinal and aromatic plants', 'activity', 'horticulture', true, 50),
  ('plantation-crops', 'Plantation crops', 'activity', 'horticulture', true, 60),
  ('nursery-seed-production', 'Nursery and seed production', 'activity', 'horticulture', true, 70),
  ('protected-cultivation', 'Protected cultivation', 'activity', 'horticulture', true, 80),
  ('hydroponics', 'Hydroponics', 'activity', 'horticulture', true, 90),
  ('aquaponics', 'Aquaponics', 'activity', 'horticulture', true, 100),
  ('vertical-urban-farming', 'Vertical and urban farming', 'activity', 'horticulture', true, 110),
  ('mushroom-cultivation', 'Mushroom cultivation', 'activity', 'horticulture', true, 120),
  ('dairy-cattle', 'Dairy cattle', 'activity', 'livestock', true, 10),
  ('buffalo-farming', 'Buffalo farming', 'activity', 'livestock', true, 20),
  ('goat-farming', 'Goat farming', 'activity', 'livestock', true, 30),
  ('sheep-farming', 'Sheep farming', 'activity', 'livestock', true, 40),
  ('pig-farming', 'Pig farming', 'activity', 'livestock', true, 50),
  ('rabbit-farming', 'Rabbit farming', 'activity', 'livestock', true, 60),
  ('other-livestock', 'Other livestock', 'activity', 'livestock', true, 70),
  ('broiler-chicken', 'Broiler chicken', 'activity', 'poultry', true, 10),
  ('layer-egg-production', 'Layer and egg production', 'activity', 'poultry', true, 20),
  ('backyard-native-poultry', 'Backyard and native poultry', 'activity', 'poultry', true, 30),
  ('duck-farming', 'Duck farming', 'activity', 'poultry', true, 40),
  ('turkey-farming', 'Turkey farming', 'activity', 'poultry', true, 50),
  ('quail-farming', 'Quail farming', 'activity', 'poultry', true, 60),
  ('poultry-hatchery', 'Poultry hatchery and chicks', 'activity', 'poultry', true, 70),
  ('freshwater-aquaculture', 'Freshwater aquaculture', 'activity', 'fisheries-aquaculture', true, 10),
  ('brackish-water-aquaculture', 'Brackish-water aquaculture', 'activity', 'fisheries-aquaculture', true, 20),
  ('marine-aquaculture', 'Marine aquaculture', 'activity', 'fisheries-aquaculture', true, 30),
  ('inland-capture-fisheries', 'Inland capture fisheries', 'activity', 'fisheries-aquaculture', true, 40),
  ('marine-capture-fisheries', 'Marine capture fisheries', 'activity', 'fisheries-aquaculture', true, 50),
  ('shrimp-prawn', 'Shrimp and prawn', 'commodity', 'fisheries-aquaculture', true, 60),
  ('crab-lobster', 'Crab and lobster', 'commodity', 'fisheries-aquaculture', true, 70),
  ('molluscs-shellfish', 'Molluscs and shellfish', 'commodity', 'fisheries-aquaculture', true, 80),
  ('pearl-culture', 'Pearl culture', 'activity', 'fisheries-aquaculture', true, 90),
  ('seaweed-farming', 'Seaweed farming', 'activity', 'fisheries-aquaculture', true, 100),
  ('ornamental-fish', 'Ornamental fish', 'activity', 'fisheries-aquaculture', true, 110),
  ('fish-hatchery-seed', 'Fish hatchery and seed', 'activity', 'fisheries-aquaculture', true, 120),
  ('beekeeping-apiculture', 'Beekeeping and apiculture', 'activity', 'allied-activities', true, 10),
  ('sericulture', 'Sericulture', 'activity', 'allied-activities', true, 20),
  ('lac-cultivation', 'Lac cultivation', 'activity', 'allied-activities', true, 30),
  ('agroforestry', 'Agroforestry', 'activity', 'allied-activities', true, 40),
  ('vermicompost-compost', 'Vermicompost and compost', 'activity', 'allied-activities', true, 50),
  ('on-farm-processing', 'On-farm processing and value addition', 'activity', 'allied-activities', true, 60),
  ('integrated-farming', 'Integrated farming systems', 'activity', 'allied-activities', true, 70)
) as seed(slug, name_en, category_kind, parent_slug, is_selectable, sort_order)
where exists (
  select 1 from public.agriculture_categories parent
  where parent.slug = seed.parent_slug
);

insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order
)
select seed.slug, seed.parent_slug, 'commodity',
  'agriculture.categories.' || seed.slug, true, seed.sort_order
from (values
  ('rice', 'Rice', 'cereals-grains', 10),
  ('wheat', 'Wheat', 'cereals-grains', 20),
  ('maize', 'Maize', 'cereals-grains', 30),
  ('sorghum-jowar', 'Sorghum (jowar)', 'cereals-grains', 40),
  ('pearl-millet-bajra', 'Pearl millet (bajra)', 'cereals-grains', 50),
  ('finger-millet-ragi', 'Finger millet (ragi)', 'cereals-grains', 60),
  ('other-millets', 'Other millets', 'cereals-grains', 70),
  ('chickpea-gram', 'Chickpea (gram)', 'pulses-legumes', 10),
  ('pigeon-pea-tur', 'Pigeon pea (tur)', 'pulses-legumes', 20),
  ('lentil', 'Lentil', 'pulses-legumes', 30),
  ('mung-bean', 'Mung bean', 'pulses-legumes', 40),
  ('urad-bean', 'Urad bean', 'pulses-legumes', 50),
  ('groundnut', 'Groundnut', 'oilseeds', 10),
  ('mustard-rapeseed', 'Mustard and rapeseed', 'oilseeds', 20),
  ('soybean', 'Soybean', 'oilseeds', 30),
  ('sesame', 'Sesame', 'oilseeds', 40),
  ('sunflower', 'Sunflower', 'oilseeds', 50),
  ('cotton', 'Cotton', 'commercial-field-crops', 10),
  ('jute', 'Jute', 'commercial-field-crops', 20),
  ('sugarcane', 'Sugarcane', 'commercial-field-crops', 30),
  ('mango', 'Mango', 'fruit-orchards', 10),
  ('banana', 'Banana', 'fruit-orchards', 20),
  ('grapes', 'Grapes', 'fruit-orchards', 30),
  ('pomegranate', 'Pomegranate', 'fruit-orchards', 40),
  ('citrus', 'Citrus', 'fruit-orchards', 50),
  ('apple-temperate-fruit', 'Apple and temperate fruit', 'fruit-orchards', 60),
  ('tomato', 'Tomato', 'vegetables', 10),
  ('onion', 'Onion', 'vegetables', 20),
  ('potato-root-tubers', 'Potato, roots and tubers', 'vegetables', 30),
  ('okra', 'Okra', 'vegetables', 40),
  ('leafy-vegetables', 'Leafy vegetables', 'vegetables', 50),
  ('tea', 'Tea', 'plantation-crops', 10),
  ('coffee', 'Coffee', 'plantation-crops', 20),
  ('coconut', 'Coconut', 'plantation-crops', 30),
  ('rubber', 'Rubber', 'plantation-crops', 40)
) as seed(slug, name_en, parent_slug, sort_order)
where exists (
  select 1 from public.agriculture_categories parent
  where parent.slug = seed.parent_slug
);

-- Company sectors share the canonical taxonomy so organizations and offers can
-- use the same stable slugs as the application catalog.
insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order
)
select seed.slug, null, 'business_sector',
  'agriculture.companySectors.' || seed.slug, true, seed.sort_order
from (values
  ('tractors-power-equipment', 10),
  ('harvesters-field-machinery', 20),
  ('farm-tools-implements', 30),
  ('equipment-rental-custom-hiring', 40),
  ('irrigation-pumps', 50),
  ('solar-renewable-energy', 60),
  ('drones-precision-agriculture', 70),
  ('seeds-planting-material', 80),
  ('fertilizers-soil-inputs', 90),
  ('crop-protection-biologicals', 100),
  ('animal-feed-fodder', 110),
  ('veterinary-animal-health', 120),
  ('poultry-equipment-hatcheries', 130),
  ('aquaculture-inputs-equipment', 140),
  ('packaging-grading-packhouse', 150),
  ('storage-warehousing-cold-chain', 160),
  ('transport-logistics', 170),
  ('food-processing-value-addition', 180),
  ('soil-water-laboratory', 190),
  ('certification-traceability', 200),
  ('agronomy-advisory', 210),
  ('training-extension', 220),
  ('weather-data-software', 230),
  ('finance-credit-payments', 240),
  ('insurance-risk-services', 250),
  ('wholesale-trading', 260),
  ('processors-exporters', 270),
  ('retail-hospitality-institutional-buyers', 280),
  ('fpo-cooperative-services', 290)
) as seed(slug, sort_order);

create table public.profile_category_affinities (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_slug text not null references public.agriculture_categories(slug)
    on delete restrict,
  relationship text not null check (
    relationship in (
      'grows', 'raises', 'farms', 'catches', 'processes', 'buys', 'sells',
      'supplies', 'services', 'interested_in'
    )
  ),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, category_slug, relationship)
);

create table public.custom_category_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'onboarding_submission' check (
    source in ('onboarding_submission', 'legacy_import')
  ),
  domain text not null check (
    domain in ('farming_activity', 'commodity', 'business_sector', 'offer_category')
  ),
  relationship text not null check (
    relationship in (
      'grows', 'raises', 'farms', 'catches', 'processes', 'buys', 'sells',
      'supplies', 'services', 'interested_in'
    )
  ),
  original_label text not null
    check (char_length(btrim(original_label)) between 2 and 80)
    check (original_label !~ '[[:cntrl:]]')
    check (
      translate(
        original_label,
        chr(8203) || chr(8234) || chr(8235) || chr(8236) || chr(8237) ||
        chr(8238) || chr(8288) || chr(8294) || chr(8295) || chr(8296) ||
        chr(8297) || chr(65279),
        ''
      ) = original_label
    )
    check (original_label !~* '(https?://|www[.]|[[:alnum:]-]+[.](com|in|org|net|co|io)([^[:alnum:]]|$))')
    check (original_label !~ '@')
    check (original_label !~ '[+]?[0-9][0-9 ().-]{6,}[0-9]')
    check (original_label !~* '(buy[[:space:]]+now|call[[:space:]]+now|contact[[:space:]]+us|best[[:space:]]+price|limited[[:space:]]+time|discount|sale|offer|whats?app|[0-9]+[[:space:]]*%[[:space:]]*off)'),
  normalized_label text generated always as (
    lower(regexp_replace(btrim(normalize(original_label, NFKC)), '[[:space:]]+', ' ', 'g'))
  ) stored,
  locale_tag text not null default 'en-IN'
    references public.supported_locales(locale_tag) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'merged')),
  promoted_slug text references public.agriculture_categories(slug)
    on delete restrict,
  moderation_note text not null default ''
    check (char_length(moderation_note) <= 500),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, requested_by, relationship),
  check (char_length(normalized_label) between 2 and 80),
  check (
    (status = 'merged' and promoted_slug is not null)
    or (status in ('pending', 'approved', 'rejected') and promoted_slug is null)
  ),
  check (
    (status in ('approved', 'rejected', 'merged') and reviewed_at is not null)
    or (status = 'pending' and reviewed_at is null and reviewed_by is null)
  )
);

create trigger custom_category_requests_set_updated_at
before update on public.custom_category_requests
for each row execute function public.set_updated_at();

create or replace function public.enforce_custom_category_pending_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending'
     and new.source = 'onboarding_submission'
     and tg_op = 'INSERT'
  then
    perform pg_advisory_xact_lock(
      hashtextextended(new.requested_by::text, 0)
    );
    if (
      select count(*)
      from public.custom_category_requests
      where requested_by = new.requested_by
        and status = 'pending'
        and source = 'onboarding_submission'
    ) >= 3 then
      raise exception 'A participant may have at most three pending custom categories';
    end if;
  elsif new.status = 'pending'
        and new.source = 'onboarding_submission'
        and tg_op = 'UPDATE'
        and (
          old.status <> 'pending'
          or old.source <> 'onboarding_submission'
          or old.requested_by <> new.requested_by
        )
  then
    perform pg_advisory_xact_lock(
      hashtextextended(new.requested_by::text, 0)
    );
    if (
      select count(*)
      from public.custom_category_requests
      where requested_by = new.requested_by
        and status = 'pending'
        and source = 'onboarding_submission'
        and id <> new.id
    ) >= 3 then
      raise exception 'A participant may have at most three pending custom categories';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_custom_category_pending_limit()
  from public, anon, authenticated;

create trigger custom_category_pending_limit_before_insert
before insert or update of status, source, requested_by on public.custom_category_requests
for each row execute function public.enforce_custom_category_pending_limit();

create table public.profile_custom_category_affinities (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  custom_category_request_id uuid not null,
  relationship text not null check (
    relationship in (
      'grows', 'raises', 'farms', 'catches', 'processes', 'buys', 'sells',
      'supplies', 'services', 'interested_in'
    )
  ),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, custom_category_request_id, relationship),
  foreign key (custom_category_request_id, profile_id, relationship)
    references public.custom_category_requests(id, requested_by, relationship)
    on delete cascade
);

create table public.onboarding_progress (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  flow_version integer not null default 1
    check (flow_version between 1 and 100),
  account_role text check (
    account_role is null
    or account_role in ('farmer', 'customer', 'wholesaler', 'agri_business')
  ),
  current_step text not null default 'language' check (
    current_step in (
      'language', 'role', 'identity_location', 'agriculture', 'role_details',
      'review_visibility'
    )
  ),
  completed_steps text[] not null default '{}'
    check (cardinality(completed_steps) <= 6)
    check (char_length(array_to_string(completed_steps, ',')) <= 480)
    check (
      completed_steps <@ array[
        'language', 'role', 'identity_location', 'agriculture', 'role_details',
        'review_visibility'
      ]::text[]
    ),
  draft_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(draft_data) = 'object')
    check (pg_column_size(draft_data) <= 32768),
  revision integer not null default 0
    check (revision between 0 and 2147483647),
  last_idempotency_key uuid,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger onboarding_progress_set_updated_at
before update on public.onboarding_progress
for each row execute function public.set_updated_at();

create or replace function public.enforce_onboarding_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.revision <> old.revision + 1 then
    raise exception 'Onboarding draft revision conflict'
      using errcode = '40001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_onboarding_revision()
  from public, anon, authenticated;

create trigger onboarding_progress_revision_before_update
before update on public.onboarding_progress
for each row execute function public.enforce_onboarding_revision();

create index agriculture_categories_parent_idx
  on public.agriculture_categories (parent_slug, domain, sort_order)
  where status = 'active';
create index agriculture_categories_domain_idx
  on public.agriculture_categories (domain, selectable, sort_order)
  where status = 'active';
create index profile_category_affinities_category_idx
  on public.profile_category_affinities (category_slug, relationship, profile_id);
create index profile_category_affinities_profile_idx
  on public.profile_category_affinities (profile_id, is_primary desc);
create unique index custom_category_pending_name_idx
  on public.custom_category_requests (requested_by, domain, normalized_label)
  where status in ('pending', 'approved', 'merged');
create index custom_category_queue_idx
  on public.custom_category_requests (status, created_at)
  where status = 'pending';
create index profile_custom_category_affinities_request_idx
  on public.profile_custom_category_affinities (custom_category_request_id);
create index onboarding_progress_status_idx
  on public.onboarding_progress (status, updated_at);

create or replace function public.has_agriculture_capability(
  profile_id_input uuid,
  capability_input text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = profile_id_input
      and profiles.id = (select auth.uid())
      and profiles.status = 'active'
      and case capability_input
        when 'manage_affinities' then
          profiles.account_role in ('farmer', 'customer', 'wholesaler', 'agri_business')
        when 'buy' then
          profiles.account_role in ('farmer', 'customer', 'wholesaler', 'agri_business')
        when 'sell_produce' then
          profiles.account_role in ('farmer', 'wholesaler')
        when 'publish_business_offers' then
          profiles.account_role = 'agri_business'
        when 'manage_business_profile' then
          profiles.account_role = 'agri_business'
        when 'submit_custom_category' then
          profiles.account_role in ('farmer', 'customer', 'wholesaler', 'agri_business')
        else false
      end
  );
$$;

create or replace function public.can_submit_custom_category(
  profile_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_agriculture_capability(profile_id_input, 'submit_custom_category')
    and (
      select count(*)
      from public.custom_category_requests
      where requested_by = profile_id_input
        and status = 'pending'
        and source = 'onboarding_submission'
    ) < 3;
$$;

create or replace function public.is_public_agriculture_profile(
  profile_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = profile_id_input
      and profiles.status = 'active'
      and profiles.onboarding_complete
      and profiles.public_profile_enabled
      and profiles.account_role in ('farmer', 'wholesaler', 'agri_business')
  );
$$;

revoke all on function public.has_agriculture_capability(uuid, text)
  from public, anon, authenticated;
grant execute on function public.has_agriculture_capability(uuid, text)
  to authenticated;
revoke all on function public.can_submit_custom_category(uuid)
  from public, anon, authenticated;
grant execute on function public.can_submit_custom_category(uuid)
  to authenticated;
revoke all on function public.is_public_agriculture_profile(uuid)
  from public, anon, authenticated;
grant execute on function public.is_public_agriculture_profile(uuid)
  to anon, authenticated;

alter table public.supported_locales enable row level security;
alter table public.agriculture_categories enable row level security;
alter table public.profile_category_affinities enable row level security;
alter table public.custom_category_requests enable row level security;
alter table public.profile_custom_category_affinities enable row level security;
alter table public.onboarding_progress enable row level security;

create policy "participants read enabled locales"
on public.supported_locales for select to anon, authenticated
using (enabled);

create policy "participants read active agriculture categories"
on public.agriculture_categories for select to anon, authenticated
using (status = 'active');

create policy "visitors read public supplier agriculture affinities"
on public.profile_category_affinities for select to anon
using (
  public.is_public_agriculture_profile(profile_id)
);

create policy "participants read visible agriculture affinities"
on public.profile_category_affinities for select to authenticated
using (
  profile_id = (select auth.uid())
  or public.is_admin()
  or exists (
    select 1
    from public.profiles
    where profiles.id = profile_category_affinities.profile_id
      and profiles.status = 'active'
      and not public.is_blocked((select auth.uid()), profiles.id)
  )
);

create policy "participants create own agriculture affinities"
on public.profile_category_affinities for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and public.has_agriculture_capability((select auth.uid()), 'manage_affinities')
  and exists (
    select 1
    from public.agriculture_categories
    where agriculture_categories.slug = profile_category_affinities.category_slug
      and agriculture_categories.status = 'active'
      and agriculture_categories.selectable
  )
);

create policy "participants update own agriculture affinities"
on public.profile_category_affinities for update to authenticated
using (profile_id = (select auth.uid()))
with check (
  profile_id = (select auth.uid())
  and public.has_agriculture_capability((select auth.uid()), 'manage_affinities')
);

create policy "participants delete own agriculture affinities"
on public.profile_category_affinities for delete to authenticated
using (profile_id = (select auth.uid()));

create policy "participants read own custom category requests"
on public.custom_category_requests for select to authenticated
using (requested_by = (select auth.uid()) or public.is_admin());

create policy "participants submit bounded custom category requests"
on public.custom_category_requests for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and source = 'onboarding_submission'
  and status = 'pending'
  and promoted_slug is null
  and reviewed_by is null
  and reviewed_at is null
  and public.can_submit_custom_category((select auth.uid()))
);

create policy "participants delete own pending custom category requests"
on public.custom_category_requests for delete to authenticated
using (requested_by = (select auth.uid()) and status = 'pending');

create policy "administrators review custom category requests"
on public.custom_category_requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "participants read own custom category affinities"
on public.profile_custom_category_affinities for select to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

create policy "participants create own custom category affinities"
on public.profile_custom_category_affinities for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and public.has_agriculture_capability((select auth.uid()), 'manage_affinities')
);

create policy "participants update own custom category affinities"
on public.profile_custom_category_affinities for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create policy "participants delete own custom category affinities"
on public.profile_custom_category_affinities for delete to authenticated
using (profile_id = (select auth.uid()));

create policy "participants read own onboarding progress"
on public.onboarding_progress for select to authenticated
using (profile_id = (select auth.uid()));

create policy "participants create own onboarding progress"
on public.onboarding_progress for insert to authenticated
with check (profile_id = (select auth.uid()));

create policy "participants update own onboarding progress"
on public.onboarding_progress for update to authenticated
using (profile_id = (select auth.uid()))
with check (
  profile_id = (select auth.uid())
);

create policy "participants delete own onboarding progress"
on public.onboarding_progress for delete to authenticated
using (profile_id = (select auth.uid()));

revoke all on public.supported_locales from anon, authenticated;
revoke all on public.agriculture_categories from anon, authenticated;
revoke all on public.profile_category_affinities from anon, authenticated;
revoke all on public.custom_category_requests from anon, authenticated;
revoke all on public.profile_custom_category_affinities from anon, authenticated;
revoke all on public.onboarding_progress from anon, authenticated;

grant select (
  locale_tag, english_name, native_name, text_direction, fallback_locale,
  enabled, human_review_status, human_reviewed_at, created_at
) on public.supported_locales to anon, authenticated;
grant select on public.agriculture_categories to anon, authenticated;
grant select on public.profile_category_affinities to anon, authenticated;
grant insert (profile_id, category_slug, relationship, is_primary)
  on public.profile_category_affinities to authenticated;
grant update (is_primary)
  on public.profile_category_affinities to authenticated;
grant delete on public.profile_category_affinities to authenticated;

grant select on public.custom_category_requests to authenticated;
grant insert (requested_by, domain, relationship, original_label, locale_tag)
  on public.custom_category_requests to authenticated;
grant update (
  status, promoted_slug, moderation_note, reviewed_by, reviewed_at, updated_at
) on public.custom_category_requests to authenticated;
grant delete on public.custom_category_requests to authenticated;

grant select on public.profile_custom_category_affinities to authenticated;
grant insert (
  profile_id, custom_category_request_id, relationship, is_primary
) on public.profile_custom_category_affinities to authenticated;
grant update (is_primary)
  on public.profile_custom_category_affinities to authenticated;
grant delete on public.profile_custom_category_affinities to authenticated;

grant select on public.onboarding_progress to authenticated;
grant insert (
  profile_id, flow_version, account_role, current_step, completed_steps,
  draft_data, last_idempotency_key, status
) on public.onboarding_progress to authenticated;
grant update (
  flow_version, account_role, current_step, completed_steps, draft_data, status,
  revision, last_idempotency_key, updated_at
) on public.onboarding_progress to authenticated;
grant delete on public.onboarding_progress to authenticated;

-- Forward-replace the legacy customer-only sourcing guard. Every supported
-- active, completed participant role may contact an active seller, but nobody
-- can connect to their own listing.
create or replace function public.is_valid_market_connection(
  listing_id_input uuid,
  buyer_id_input uuid,
  conversation_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.produce_listings
    join public.profiles buyer
      on buyer.id = buyer_id_input
    join public.profiles seller
      on seller.id = public.produce_listings.farmer_id
    where public.produce_listings.id = listing_id_input
      and public.produce_listings.status = 'active'
      and buyer.id = (select auth.uid())
      and buyer.status = 'active'
      and buyer.onboarding_complete
      and buyer.account_role in (
        'farmer', 'customer', 'wholesaler', 'agri_business'
      )
      and seller.status = 'active'
      and seller.onboarding_complete
      and seller.account_role in ('farmer', 'wholesaler')
      and buyer.id <> seller.id
      and exists (
        select 1
        from public.conversation_members buyer_member
        where buyer_member.conversation_id = conversation_id_input
          and buyer_member.user_id = buyer.id
      )
      and exists (
        select 1
        from public.conversation_members seller_member
        where seller_member.conversation_id = conversation_id_input
          and seller_member.user_id = seller.id
      )
  );
$$;

create or replace function public.connect_to_listing(
  listing_id_input uuid,
  business_name_input text,
  email_input text,
  phone_input text,
  location_input text,
  quantity_needed_input text,
  need_by_input text,
  message_input text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  buyer_id_value uuid := (select auth.uid());
  buyer_name_value text;
  seller_id_value uuid;
  conversation_id_value uuid;
  enquiry_id_value uuid;
begin
  select full_name into buyer_name_value
  from public.profiles
  where id = buyer_id_value
    and status = 'active'
    and onboarding_complete
    and account_role in ('farmer', 'customer', 'wholesaler', 'agri_business');

  if buyer_name_value is null then
    raise exception 'An active completed participant account is required';
  end if;

  select listing.farmer_id into seller_id_value
  from public.produce_listings listing
  join public.profiles seller on seller.id = listing.farmer_id
  where listing.id = listing_id_input
    and listing.status = 'active'
    and seller.status = 'active'
    and seller.onboarding_complete
    and seller.account_role in ('farmer', 'wholesaler');

  if seller_id_value is null or seller_id_value = buyer_id_value then
    raise exception 'This listing is unavailable';
  end if;

  conversation_id_value :=
    public.get_or_create_direct_conversation(seller_id_value);

  insert into public.market_enquiries (
    listing_id,
    buyer_id,
    conversation_id,
    buyer_name,
    business_name,
    email,
    phone,
    location,
    quantity_needed,
    need_by,
    message
  ) values (
    listing_id_input,
    buyer_id_value,
    conversation_id_value,
    buyer_name_value,
    coalesce(business_name_input, ''),
    email_input,
    phone_input,
    location_input,
    quantity_needed_input,
    need_by_input,
    message_input
  )
  returning id into enquiry_id_value;

  return jsonb_build_object(
    'enquiry_id', enquiry_id_value,
    'conversation_id', conversation_id_value
  );
end;
$$;

revoke all on function public.connect_to_listing(
  uuid, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.connect_to_listing(
  uuid, text, text, text, text, text, text, text
) to authenticated;

-- Replace the legacy table-level INSERT privilege with an explicit list. The
-- ownership key remains writable because legacy clients must send farmer_id;
-- the existing INSERT policy requires it to equal auth.uid(). Generated IDs,
-- engagement counters, and server timestamps cannot be forged at insertion.
revoke insert on public.produce_listings from authenticated;
grant insert (
  farmer_id, title, crop, variety, description, quantity, unit, min_order,
  price, price_unit, harvest_start, harvest_end, available_until, grade,
  delivery_options, delivery_radius_km, certifications, status
) on public.produce_listings to authenticated;
