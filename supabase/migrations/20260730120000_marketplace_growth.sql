-- FarmerBook marketplace and customer-growth layer.
-- Active produce listings and curated supplier identity fields are public so a
-- farmer can share a storefront with buyers who do not yet have an account.
-- Buyer contact details remain visible only to the listing owner.

create table public.produce_listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 5 and 100),
  crop text not null check (char_length(trim(crop)) between 2 and 50),
  variety text not null check (char_length(trim(variety)) between 2 and 80),
  description text not null check (char_length(trim(description)) between 20 and 1000),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit text not null check (unit in ('kg', 'quintal', 'tonne', 'box')),
  min_order numeric(12, 2) not null check (min_order > 0),
  price numeric(12, 2) not null check (price > 0),
  price_unit text not null check (price_unit in ('kg', 'quintal', 'tonne', 'box')),
  harvest_start text not null check (char_length(trim(harvest_start)) between 2 and 50),
  harvest_end text not null check (char_length(trim(harvest_end)) between 2 and 50),
  available_until text not null check (char_length(trim(available_until)) between 2 and 80),
  grade text not null check (char_length(trim(grade)) between 2 and 80),
  delivery_options text[] not null default '{}'
    check (cardinality(delivery_options) between 1 and 5),
  delivery_radius_km integer check (delivery_radius_km between 1 and 2000),
  certifications text[] not null default '{}' check (cardinality(certifications) <= 8),
  status text not null default 'active'
    check (status in ('active', 'draft', 'paused', 'sold')),
  view_count integer not null default 0 check (view_count >= 0),
  save_count integer not null default 0 check (save_count >= 0),
  enquiry_count integer not null default 0 check (enquiry_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.produce_listings(id) on delete cascade,
  buyer_name text not null check (char_length(trim(buyer_name)) between 2 and 80),
  business_name text not null default '' check (char_length(business_name) <= 100),
  email text not null check (char_length(trim(email)) between 3 and 160),
  phone text not null check (char_length(trim(phone)) between 7 and 24),
  location text not null check (char_length(trim(location)) between 2 and 120),
  quantity_needed text not null check (char_length(trim(quantity_needed)) between 2 and 100),
  need_by text not null check (char_length(trim(need_by)) between 2 and 80),
  message text not null check (char_length(trim(message)) between 10 and 1000),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'won', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index produce_listings_market_idx
  on public.produce_listings (status, created_at desc);
create index produce_listings_farmer_idx
  on public.produce_listings (farmer_id, status, created_at desc);
create index produce_listings_crop_idx
  on public.produce_listings (lower(crop), status);
create index market_enquiries_listing_idx
  on public.market_enquiries (listing_id, status, created_at desc);

create trigger produce_listings_set_updated_at
before update on public.produce_listings
for each row execute function public.set_updated_at();

create trigger market_enquiries_set_updated_at
before update on public.market_enquiries
for each row execute function public.set_updated_at();

create or replace function public.increment_listing_enquiry_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.produce_listings
  set enquiry_count = enquiry_count + 1
  where id = new.listing_id;
  return new;
end;
$$;

create trigger market_enquiry_count_after_insert
after insert on public.market_enquiries
for each row execute function public.increment_listing_enquiry_count();

alter table public.produce_listings enable row level security;
alter table public.market_enquiries enable row level security;

create policy "visitors view active supplier profiles"
on public.profiles for select to anon
using (
  status = 'active'
  and participant_type in ('farmer', 'fpo')
);

create policy "visitors browse active produce listings"
on public.produce_listings for select to anon
using (
  status = 'active'
  and exists (
    select 1 from public.profiles
    where profiles.id = produce_listings.farmer_id
      and profiles.status = 'active'
  )
);

create policy "participants browse listings and manage their own"
on public.produce_listings for select to authenticated
using (
  farmer_id = (select auth.uid())
  or public.is_admin()
  or (
    status = 'active'
    and public.is_active_user(farmer_id)
    and not public.is_blocked((select auth.uid()), farmer_id)
  )
);

create policy "active farmers create own listings"
on public.produce_listings for insert to authenticated
with check (
  farmer_id = (select auth.uid())
  and public.is_active_user((select auth.uid()))
);

create policy "farmers update own listings"
on public.produce_listings for update to authenticated
using (farmer_id = (select auth.uid()))
with check (farmer_id = (select auth.uid()));

create policy "visitors send enquiries for active listings"
on public.market_enquiries for insert to anon, authenticated
with check (
  exists (
    select 1 from public.produce_listings
    where produce_listings.id = market_enquiries.listing_id
      and produce_listings.status = 'active'
  )
);

create policy "farmers view enquiries for own listings"
on public.market_enquiries for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.produce_listings
    where produce_listings.id = market_enquiries.listing_id
      and produce_listings.farmer_id = (select auth.uid())
  )
);

create policy "farmers update enquiries for own listings"
on public.market_enquiries for update to authenticated
using (
  exists (
    select 1 from public.produce_listings
    where produce_listings.id = market_enquiries.listing_id
      and produce_listings.farmer_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.produce_listings
    where produce_listings.id = market_enquiries.listing_id
      and produce_listings.farmer_id = (select auth.uid())
  )
);

revoke all on public.produce_listings from anon, authenticated;
revoke all on public.market_enquiries from anon, authenticated;

grant select (
  id, handle, full_name, participant_type, district, state, crops, bio,
  verification_status, experience_years, avatar_path, created_at
) on public.profiles to anon;

grant select on public.produce_listings to anon, authenticated;
grant insert on public.produce_listings to authenticated;
grant update (
  title, crop, variety, description, quantity, unit, min_order, price,
  price_unit, harvest_start, harvest_end, available_until, grade,
  delivery_options, delivery_radius_km, certifications, status, updated_at
) on public.produce_listings to authenticated;

grant insert on public.market_enquiries to anon, authenticated;
grant select on public.market_enquiries to authenticated;
grant update (status, updated_at) on public.market_enquiries to authenticated;
