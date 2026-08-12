-- Inc direct-from-farmer sourcing. `Inc` is a friendly product category;
-- organizations retain their exact legal type and claim-specific verification.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check
  check (control_key in (
    'resumable_onboarding', 'agri_businesses', 'business_offers',
    'extended_locales', 'outreach_agent', 'inc_sourcing'
  ));
insert into public.ecosystem_release_controls (control_key, enabled)
values ('inc_sourcing', false)
on conflict (control_key) do nothing;

alter table public.organization_verification_requests
  add column requested_claim_types text[] not null default array[
    'organization_registration', 'authorized_representative'
  ]::text[]
    check (
      cardinality(requested_claim_types) between 1 and 7
      and requested_claim_types <@ array[
        'organization_registration', 'authorized_representative',
        'gst_registration', 'official_domain', 'facility_registration',
        'industry_licence', 'bank_account_name'
      ]::text[]
    ),
  add column official_domain text check (
    official_domain is null
    or official_domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:[.][a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  );
grant insert (requested_claim_types, official_domain)
  on public.organization_verification_requests to authenticated;

insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order
)
select seed.slug, null, 'business_sector',
  'agriculture.companySectors.' || seed.slug, true, seed.sort_order
from (values
  ('grain-milling-flour', 300),
  ('edible-oils-oilseeds', 310),
  ('dairy-processing', 320),
  ('poultry-egg-processing', 330),
  ('meat-processing', 340),
  ('seafood-processing', 350),
  ('fruit-vegetable-processing', 360),
  ('beverages-brewing', 370),
  ('spices-condiments', 380),
  ('animal-feed-manufacturing', 390),
  ('textiles-natural-fibres', 400),
  ('rubber-latex-products', 410),
  ('bioenergy-ethanol-biomass', 420),
  ('natural-ingredients-cosmetics', 430),
  ('pharma-herbal-inputs', 440),
  ('paper-agri-residue-packaging', 450)
) as seed(slug, sort_order)
on conflict (slug) do nothing;

create table public.organization_verification_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  claim_type text not null check (claim_type in (
    'organization_registration', 'authorized_representative', 'gst_registration',
    'official_domain', 'facility_registration', 'industry_licence',
    'bank_account_name'
  )),
  scope text not null default '' check (char_length(scope) <= 120),
  state text not null default 'pending' check (state in (
    'pending', 'verified', 'rejected', 'expired', 'revoked'
  )),
  verifier_class text not null check (verifier_class in (
    'registry', 'licensed_provider', 'official_domain', 'moderator'
  )),
  provider_name text not null check (char_length(btrim(provider_name)) between 2 and 120),
  provider_receipt_hash text check (
    provider_receipt_hash is null or provider_receipt_hash ~ '^[0-9a-f]{64}$'
  ),
  evidence_path text check (
    evidence_path is null
    or (
      char_length(evidence_path) between 38 and 500
      and evidence_path like organization_id::text || '/%'
    )
  ),
  decision_reason_code text not null default '' check (
    decision_reason_code ~ '^[A-Z0-9_]{0,80}$'
  ),
  public_disclosure boolean not null default false,
  verified_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or verified_at is null or expires_at > verified_at),
  check (
    state <> 'verified'
    or (verified_at is not null and provider_receipt_hash is not null)
  ),
  check ((state = 'revoked' and revoked_at is not null) or state <> 'revoked')
);

create unique index organization_verification_claims_current_idx
  on public.organization_verification_claims (organization_id, claim_type, lower(scope))
  where state in ('pending', 'verified');
create index organization_verification_claims_org_idx
  on public.organization_verification_claims (organization_id, state, claim_type);

create table public.inc_sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  content_locale text not null references public.supported_locales(locale_tag),
  product_name text not null check (char_length(btrim(product_name)) between 2 and 120),
  variety_or_grade text not null default '' check (char_length(variety_or_grade) <= 160),
  quality_requirements text not null default '' check (char_length(quality_requirements) <= 1200),
  quantity_min numeric(14, 3) not null check (quantity_min > 0 and quantity_min <= 1000000000),
  quantity_max numeric(14, 3) check (
    quantity_max is null or (quantity_max >= quantity_min and quantity_max <= 1000000000)
  ),
  quantity_unit text not null check (quantity_unit in (
    'kg', 'quintal', 'tonne', 'litre', 'piece', 'tray', 'dozen'
  )),
  cadence text not null check (cadence in (
    'one_time', 'weekly', 'monthly', 'seasonal', 'ongoing'
  )),
  delivery_mode text not null check (delivery_mode in ('collect', 'deliver', 'either')),
  destination_state text not null check (char_length(btrim(destination_state)) between 2 and 80),
  destination_district text check (
    destination_district is null
    or char_length(btrim(destination_district)) between 2 and 80
  ),
  opens_on date not null,
  closes_on date not null,
  need_by date not null,
  price_model text not null check (price_model in ('quote', 'target', 'range')),
  currency text check (currency is null or currency = 'INR'),
  price_min numeric(14, 2) check (price_min is null or price_min > 0),
  price_max numeric(14, 2) check (price_max is null or price_max >= price_min),
  price_unit text check (price_unit is null or price_unit in (
    'kg', 'quintal', 'tonne', 'litre', 'piece', 'tray', 'dozen'
  )),
  payment_terms text not null default '' check (char_length(payment_terms) <= 1000),
  required_licence_scope text not null default '' check (
    char_length(required_licence_scope) <= 120
  ),
  publication_state text not null default 'draft' check (publication_state in (
    'draft', 'published', 'paused', 'closed', 'archived'
  )),
  moderation_state text not null default 'not_required' check (moderation_state in (
    'not_required', 'pending', 'approved', 'rejected'
  )),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_on >= opens_on and need_by >= opens_on),
  check (closes_on <= opens_on + interval '2 years'),
  check (
    (price_model = 'quote' and currency is null and price_min is null and price_max is null and price_unit is null)
    or (price_model = 'target' and currency = 'INR' and price_min is not null and price_max is null and price_unit is not null)
    or (price_model = 'range' and currency = 'INR' and price_min is not null and price_max is not null and price_unit is not null)
  ),
  check (publication_state <> 'published' or published_at is not null)
);

create table public.inc_sourcing_request_categories (
  sourcing_request_id uuid not null references public.inc_sourcing_requests(id) on delete cascade,
  category_slug text not null references public.agriculture_categories(slug) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (sourcing_request_id, category_slug)
);

create table public.inc_sourcing_request_events (
  id uuid primary key default gen_random_uuid(),
  sourcing_request_id uuid not null references public.inc_sourcing_requests(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'created', 'published', 'paused', 'closed', 'archived', 'moderation_changed'
  )),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 8192),
  created_at timestamptz not null default now()
);

create table public.inc_sourcing_responses (
  id uuid primary key default gen_random_uuid(),
  sourcing_request_id uuid not null references public.inc_sourcing_requests(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farmer_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key uuid not null,
  message text not null check (char_length(btrim(message)) between 20 and 2000),
  quantity_available numeric(14, 3) check (quantity_available is null or quantity_available > 0),
  quantity_unit text check (quantity_unit is null or quantity_unit in (
    'kg', 'quintal', 'tonne', 'litre', 'piece', 'tray', 'dozen'
  )),
  available_from date,
  indicative_price numeric(14, 2) check (indicative_price is null or indicative_price > 0),
  price_unit text check (price_unit is null or price_unit in (
    'kg', 'quintal', 'tonne', 'litre', 'piece', 'tray', 'dozen'
  )),
  conversation_id uuid references public.conversations(id) on delete set null,
  status text not null default 'submitted' check (status in (
    'submitted', 'reviewing', 'accepted', 'declined', 'withdrawn', 'spam'
  )),
  request_snapshot jsonb not null
    check (jsonb_typeof(request_snapshot) = 'object' and pg_column_size(request_snapshot) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farmer_id, sourcing_request_id, idempotency_key),
  check ((quantity_available is null and quantity_unit is null) or (quantity_available is not null and quantity_unit is not null)),
  check ((indicative_price is null and price_unit is null) or (indicative_price is not null and price_unit is not null))
);

create trigger organization_verification_claims_set_updated_at
before update on public.organization_verification_claims
for each row execute function public.set_updated_at();
create trigger inc_sourcing_requests_set_updated_at
before update on public.inc_sourcing_requests
for each row execute function public.set_updated_at();
create trigger inc_sourcing_responses_set_updated_at
before update on public.inc_sourcing_responses
for each row execute function public.set_updated_at();
create trigger inc_sourcing_request_events_immutable
before update or delete on public.inc_sourcing_request_events
for each row execute function public.prevent_immutable_row_change();

create or replace function public.has_current_organization_claim(
  organization_id_input uuid,
  claim_type_input text,
  scope_input text default ''
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_verification_claims claim
    where claim.organization_id = organization_id_input
      and claim.claim_type = claim_type_input
      and (scope_input = '' or lower(claim.scope) = lower(scope_input))
      and claim.state = 'verified'
      and (claim.expires_at is null or claim.expires_at > now())
      and claim.revoked_at is null
  );
$$;

create or replace function public.can_publish_inc_sourcing(
  organization_id_input uuid,
  required_licence_scope_input text default ''
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizations organization
    where organization.id = organization_id_input
      and organization.publication_state = 'published'
      and organization.verification_state = 'verified'
      and organization.moderation_state = 'active'
  )
  and public.has_current_organization_claim(
    organization_id_input, 'organization_registration', ''
  )
  and public.has_current_organization_claim(
    organization_id_input, 'authorized_representative', ''
  )
  and (
    required_licence_scope_input = ''
    or public.has_current_organization_claim(
      organization_id_input, 'industry_licence', required_licence_scope_input
    )
  )
  and (
    not exists (
      select 1
      from public.organization_category_affinities affinity
      where affinity.organization_id = organization_id_input
        and affinity.category_slug in (
          'food-processing-value-addition', 'processors-exporters',
          'grain-milling-flour', 'edible-oils-oilseeds', 'dairy-processing',
          'poultry-egg-processing', 'meat-processing', 'seafood-processing',
          'fruit-vegetable-processing', 'beverages-brewing',
          'spices-condiments', 'animal-feed-manufacturing',
          'textiles-natural-fibres', 'rubber-latex-products',
          'bioenergy-ethanol-biomass', 'natural-ingredients-cosmetics',
          'pharma-herbal-inputs', 'paper-agri-residue-packaging'
        )
    )
    or public.has_current_organization_claim(
      organization_id_input, 'facility_registration', ''
    )
    or public.has_current_organization_claim(
      organization_id_input, 'industry_licence', ''
    )
  );
$$;

create or replace function public.create_inc_sourcing_request(
  organization_id_input uuid,
  content_locale_input text,
  product_name_input text,
  variety_or_grade_input text,
  quality_requirements_input text,
  quantity_min_input numeric,
  quantity_max_input numeric,
  quantity_unit_input text,
  cadence_input text,
  delivery_mode_input text,
  destination_state_input text,
  destination_district_input text,
  opens_on_input date,
  closes_on_input date,
  need_by_input date,
  price_model_input text,
  currency_input text,
  price_min_input numeric,
  price_max_input numeric,
  price_unit_input text,
  payment_terms_input text,
  required_licence_scope_input text,
  category_slugs_input text[],
  publication_intent_input text
)
returns table (
  sourcing_request_id uuid,
  publication_state text,
  moderation_state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request_id uuid;
  next_publication_state text := 'draft';
  next_moderation_state text := 'not_required';
  category_slug text;
begin
  if actor_id is null
     or not public.is_ecosystem_release_enabled('inc_sourcing') then
    raise exception 'Inc sourcing is unavailable'
      using errcode = '42501', detail = 'INC_SOURCING_DISABLED';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = actor_id and profile.status = 'active'
      and profile.onboarding_complete and profile.account_role = 'agri_business'
  ) then
    raise exception 'Only active Inc accounts can create sourcing requests'
      using errcode = '42501', detail = 'INC_SOURCING_INC_ACCOUNT_REQUIRED';
  end if;
  if not public.is_ecosystem_release_enabled('extended_locales')
     and content_locale_input not in ('en-IN', 'hi-IN', 'mr-IN') then
    raise exception 'Extended locale is not released'
      using errcode = '22023', detail = 'EXTENDED_LOCALES_DISABLED';
  end if;
  if not public.can_manage_organization(organization_id_input, 'editor') then
    raise exception 'Organization permission required'
      using errcode = '42501', detail = 'INC_SOURCING_FORBIDDEN';
  end if;
  if coalesce(array_length(category_slugs_input, 1), 0) < 1
     or array_length(category_slugs_input, 1) > 12
     or exists (
       select 1 from unnest(category_slugs_input) slug
       where not exists (
         select 1 from public.agriculture_categories category
         where category.slug = slug and category.selectable
           and category.domain <> 'business_sector'
       )
     ) then
    raise exception 'Choose supported farm categories'
      using errcode = '22023', detail = 'INC_SOURCING_CATEGORY_INVALID';
  end if;
  if publication_intent_input not in ('draft', 'submit') then
    raise exception 'Invalid publication intent'
      using errcode = '22023', detail = 'INC_SOURCING_PUBLICATION_INVALID';
  end if;
  if publication_intent_input = 'submit' then
    if not public.can_publish_inc_sourcing(
      organization_id_input, coalesce(required_licence_scope_input, '')
    ) then
      raise exception 'Required verification claims are missing'
        using errcode = '42501', detail = 'INC_SOURCING_VERIFICATION_REQUIRED';
    end if;
    if coalesce(required_licence_scope_input, '') <> '' or exists (
      select 1
      from public.organization_category_affinities affinity
      where affinity.organization_id = organization_id_input
        and affinity.category_slug in (
          'food-processing-value-addition', 'processors-exporters',
          'grain-milling-flour', 'edible-oils-oilseeds', 'dairy-processing',
          'poultry-egg-processing', 'meat-processing', 'seafood-processing',
          'fruit-vegetable-processing', 'beverages-brewing',
          'spices-condiments', 'animal-feed-manufacturing',
          'textiles-natural-fibres', 'rubber-latex-products',
          'bioenergy-ethanol-biomass', 'natural-ingredients-cosmetics',
          'pharma-herbal-inputs', 'paper-agri-residue-packaging'
        )
    ) then
      next_moderation_state := 'pending';
    else
      next_publication_state := 'published';
    end if;
  end if;

  insert into public.inc_sourcing_requests (
    organization_id, created_by, content_locale, product_name,
    variety_or_grade, quality_requirements, quantity_min, quantity_max,
    quantity_unit, cadence, delivery_mode, destination_state,
    destination_district, opens_on, closes_on, need_by, price_model,
    currency, price_min, price_max, price_unit, payment_terms,
    required_licence_scope, publication_state, moderation_state, published_at
  ) values (
    organization_id_input, actor_id, content_locale_input, product_name_input,
    coalesce(variety_or_grade_input, ''), coalesce(quality_requirements_input, ''),
    quantity_min_input, quantity_max_input, quantity_unit_input, cadence_input,
    delivery_mode_input, destination_state_input, nullif(btrim(destination_district_input), ''),
    opens_on_input, closes_on_input, need_by_input, price_model_input,
    currency_input, price_min_input, price_max_input, price_unit_input,
    coalesce(payment_terms_input, ''), coalesce(required_licence_scope_input, ''),
    next_publication_state, next_moderation_state,
    case when next_publication_state = 'published' then now() else null end
  ) returning id into request_id;

  foreach category_slug in array category_slugs_input loop
    insert into public.inc_sourcing_request_categories (
      sourcing_request_id, category_slug, is_primary
    ) values (
      request_id, category_slug, category_slug = category_slugs_input[1]
    );
  end loop;
  insert into public.inc_sourcing_request_events (
    sourcing_request_id, actor_profile_id, event_type, metadata
  ) values (
    request_id, actor_id, 'created',
    jsonb_build_object('publication_intent', publication_intent_input)
  );
  if next_publication_state = 'published' then
    insert into public.inc_sourcing_request_events (
      sourcing_request_id, actor_profile_id, event_type
    ) values (request_id, actor_id, 'published');
  end if;
  return query select request_id, next_publication_state, next_moderation_state;
end;
$$;

create or replace function public.set_inc_sourcing_request_publication(
  sourcing_request_id_input uuid,
  publication_state_input text,
  expected_updated_at_input timestamptz
)
returns table (
  sourcing_request_id uuid,
  publication_state text,
  moderation_state text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request_value public.inc_sourcing_requests%rowtype;
  next_state text;
begin
  if actor_id is null or not public.is_ecosystem_release_enabled('inc_sourcing') then
    raise exception 'Inc sourcing is unavailable'
      using errcode = '42501', detail = 'INC_SOURCING_DISABLED';
  end if;
  select * into request_value from public.inc_sourcing_requests
  where id = sourcing_request_id_input for update;
  if not found then
    raise exception 'Sourcing request not found'
      using errcode = 'P0002', detail = 'INC_SOURCING_NOT_FOUND';
  end if;
  if request_value.updated_at <> expected_updated_at_input then
    raise exception 'Sourcing request changed'
      using errcode = '40001', detail = 'INC_SOURCING_CONFLICT';
  end if;
  if not public.can_manage_organization(request_value.organization_id, 'editor') then
    raise exception 'Organization permission required'
      using errcode = '42501', detail = 'INC_SOURCING_FORBIDDEN';
  end if;
  if publication_state_input not in ('published', 'paused', 'closed', 'archived') then
    raise exception 'Invalid publication state'
      using errcode = '22023', detail = 'INC_SOURCING_PUBLICATION_INVALID';
  end if;
  next_state := publication_state_input;
  if next_state = 'published' then
    if request_value.moderation_state not in ('not_required', 'approved')
       or not public.can_publish_inc_sourcing(
         request_value.organization_id, request_value.required_licence_scope
       ) then
      raise exception 'Required verification or moderation is missing'
        using errcode = '42501', detail = 'INC_SOURCING_VERIFICATION_REQUIRED';
    end if;
  end if;
  update public.inc_sourcing_requests set
    publication_state = next_state,
    published_at = case when next_state = 'published' then coalesce(published_at, now()) else published_at end,
    updated_at = now()
  where id = request_value.id
  returning inc_sourcing_requests.updated_at into request_value.updated_at;
  insert into public.inc_sourcing_request_events (
    sourcing_request_id, actor_profile_id, event_type
  ) values (
    request_value.id, actor_id,
    case next_state when 'published' then 'published' when 'paused' then 'paused'
      when 'closed' then 'closed' else 'archived' end
  );
  return query select request_value.id, next_state,
    request_value.moderation_state, request_value.updated_at;
end;
$$;

create or replace function public.respond_to_inc_sourcing_request(
  sourcing_request_id_input uuid,
  message_input text,
  quantity_available_input numeric,
  quantity_unit_input text,
  available_from_input date,
  indicative_price_input numeric,
  price_unit_input text,
  idempotency_key_input uuid
)
returns table (response_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request_value public.inc_sourcing_requests%rowtype;
  created_id uuid;
begin
  if actor_id is null or not public.is_ecosystem_release_enabled('inc_sourcing') then
    raise exception 'Inc sourcing is unavailable'
      using errcode = '42501', detail = 'INC_SOURCING_DISABLED';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = actor_id and profile.status = 'active'
      and profile.onboarding_complete and profile.account_role = 'farmer'
  ) then
    raise exception 'Only active Farmers can respond'
      using errcode = '42501', detail = 'INC_SOURCING_FARMER_REQUIRED';
  end if;
  select * into request_value from public.inc_sourcing_requests request
  where request.id = sourcing_request_id_input
    and request.publication_state = 'published'
    and request.moderation_state in ('not_required', 'approved')
    and current_date between request.opens_on and request.closes_on;
  if not found then
    raise exception 'Sourcing request is not active'
      using errcode = 'P0002', detail = 'INC_SOURCING_NOT_ACTIVE';
  end if;
  if exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = request_value.organization_id
      and membership.profile_id = actor_id and membership.status = 'active'
  ) then
    raise exception 'Organization members cannot respond as Farmers'
      using errcode = '42501', detail = 'INC_SOURCING_SELF_RESPONSE';
  end if;
  insert into public.inc_sourcing_responses (
    sourcing_request_id, organization_id, farmer_id, idempotency_key,
    message, quantity_available, quantity_unit, available_from,
    indicative_price, price_unit, request_snapshot
  ) values (
    request_value.id, request_value.organization_id, actor_id,
    idempotency_key_input, message_input, quantity_available_input,
    quantity_unit_input, available_from_input, indicative_price_input,
    price_unit_input,
    jsonb_build_object(
      'product_name', request_value.product_name,
      'quantity_min', request_value.quantity_min,
      'quantity_max', request_value.quantity_max,
      'quantity_unit', request_value.quantity_unit,
      'need_by', request_value.need_by,
      'destination_state', request_value.destination_state,
      'destination_district', request_value.destination_district
    )
  )
  on conflict (farmer_id, sourcing_request_id, idempotency_key)
  do update set idempotency_key = excluded.idempotency_key
  returning id into created_id;
  return query select created_id;
end;
$$;

create view public.public_organization_verification_claims
with (security_invoker = true) as
select id, organization_id, claim_type, scope, verifier_class, provider_name,
  verified_at, expires_at
from public.organization_verification_claims
where state = 'verified' and public_disclosure
  and (expires_at is null or expires_at > now()) and revoked_at is null;

alter table public.organization_verification_claims enable row level security;
alter table public.inc_sourcing_requests enable row level security;
alter table public.inc_sourcing_request_categories enable row level security;
alter table public.inc_sourcing_request_events enable row level security;
alter table public.inc_sourcing_responses enable row level security;

create policy "service manages organization verification claims"
on public.organization_verification_claims for all to service_role
using (true) with check (true);
create policy "public reads disclosed current verification claims"
on public.organization_verification_claims for select to anon, authenticated
using (
  state = 'verified' and public_disclosure
  and (expires_at is null or expires_at > now()) and revoked_at is null
);

create policy "public reads active Inc sourcing requests"
on public.inc_sourcing_requests for select to anon, authenticated
using (
  public.is_ecosystem_release_enabled('inc_sourcing')
  and publication_state = 'published'
  and moderation_state in ('not_required', 'approved')
  and current_date between opens_on and closes_on
  and public.can_publish_inc_sourcing(organization_id, required_licence_scope)
);
create policy "Inc members read own sourcing requests"
on public.inc_sourcing_requests for select to authenticated
using (public.can_manage_organization(organization_id, 'viewer'));

create policy "public reads active sourcing categories"
on public.inc_sourcing_request_categories for select to anon, authenticated
using (exists (
  select 1 from public.inc_sourcing_requests request
  where request.id = sourcing_request_id
));

create policy "Inc members read sourcing events"
on public.inc_sourcing_request_events for select to authenticated
using (exists (
  select 1 from public.inc_sourcing_requests request
  where request.id = sourcing_request_id
    and public.can_manage_organization(request.organization_id, 'viewer')
));

create policy "Farmers read own sourcing responses"
on public.inc_sourcing_responses for select to authenticated
using (farmer_id = (select auth.uid()));
create policy "Inc members read sourcing responses"
on public.inc_sourcing_responses for select to authenticated
using (public.can_manage_organization(organization_id, 'enquiry_agent'));

revoke all on public.organization_verification_claims,
  public.inc_sourcing_requests, public.inc_sourcing_request_categories,
  public.inc_sourcing_request_events, public.inc_sourcing_responses
from public, anon, authenticated;
grant all on public.organization_verification_claims,
  public.inc_sourcing_requests, public.inc_sourcing_request_categories,
  public.inc_sourcing_request_events, public.inc_sourcing_responses
to service_role;
grant select on public.inc_sourcing_requests,
  public.inc_sourcing_request_categories to anon, authenticated;
grant select on public.inc_sourcing_request_events,
  public.inc_sourcing_responses to authenticated;
grant select (id, organization_id, claim_type, scope, verifier_class,
  provider_name, verified_at, expires_at)
on public.organization_verification_claims to anon, authenticated;
grant select on public.public_organization_verification_claims to anon, authenticated;

revoke all on function public.has_current_organization_claim(uuid, text, text),
  public.can_publish_inc_sourcing(uuid, text),
  public.create_inc_sourcing_request(uuid, text, text, text, text, numeric,
    numeric, text, text, text, text, text, date, date, date, text, text,
    numeric, numeric, text, text, text, text[], text),
  public.set_inc_sourcing_request_publication(uuid, text, timestamptz),
  public.respond_to_inc_sourcing_request(uuid, text, numeric, text, date,
    numeric, text, uuid)
from public, anon, authenticated;
grant execute on function public.can_publish_inc_sourcing(uuid, text)
  to anon, authenticated;
grant execute on function public.create_inc_sourcing_request(uuid, text, text,
    text, text, numeric, numeric, text, text, text, text, text, date, date,
    date, text, text, numeric, numeric, text, text, text, text[], text),
  public.set_inc_sourcing_request_publication(uuid, text, timestamptz),
  public.respond_to_inc_sourcing_request(uuid, text, numeric, text, date,
    numeric, text, uuid)
to authenticated;

create index inc_sourcing_requests_public_idx
  on public.inc_sourcing_requests (published_at desc, id desc)
  where publication_state = 'published';
create index inc_sourcing_requests_org_idx
  on public.inc_sourcing_requests (organization_id, updated_at desc);
create index inc_sourcing_responses_request_idx
  on public.inc_sourcing_responses (sourcing_request_id, created_at desc);
