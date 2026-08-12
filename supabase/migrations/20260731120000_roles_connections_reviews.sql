-- FarmerBook three-role marketplace, connected purchases, social identity,
-- and verified-purchase reviews.
-- This migration is additive so the previous application build remains usable.

alter table public.profiles
  add column account_role text,
  add column farming_method text,
  add column website_url text,
  add column linkedin_url text,
  add column instagram_url text,
  add column facebook_url text,
  add column youtube_url text;

update public.profiles
set account_role = case participant_type
  when 'farmer' then 'farmer'
  when 'fpo' then 'wholesaler'
  else 'customer'
end;

update public.profiles
set farming_method = 'mixed'
where account_role = 'farmer' and farming_method is null;

alter table public.profiles
  alter column account_role set default 'farmer',
  alter column account_role set not null,
  add constraint profiles_account_role_check
    check (account_role in ('farmer', 'customer', 'wholesaler')),
  add constraint profiles_farming_method_check
    check (
      (
        account_role = 'farmer'
        and (
          not onboarding_complete
          or farming_method in ('organic', 'natural', 'conventional', 'mixed')
        )
      )
      or (
        account_role <> 'farmer'
        and farming_method is null
      )
    ),
  add constraint profiles_website_url_check
    check (
      website_url is null
      or (
        char_length(website_url) <= 300
        and website_url ~ '^https://'
      )
    ),
  add constraint profiles_linkedin_url_check
    check (
      linkedin_url is null
      or (
        char_length(linkedin_url) <= 300
        and linkedin_url ~ '^https://'
      )
    ),
  add constraint profiles_instagram_url_check
    check (
      instagram_url is null
      or (
        char_length(instagram_url) <= 300
        and instagram_url ~ '^https://'
      )
    ),
  add constraint profiles_facebook_url_check
    check (
      facebook_url is null
      or (
        char_length(facebook_url) <= 300
        and facebook_url ~ '^https://'
      )
    ),
  add constraint profiles_youtube_url_check
    check (
      youtube_url is null
      or (
        char_length(youtube_url) <= 300
        and youtube_url ~ '^https://'
      )
    );

create index profiles_account_role_idx
  on public.profiles (account_role, status, created_at desc);
create index profiles_farming_method_idx
  on public.profiles (farming_method, status)
  where account_role = 'farmer';

create or replace function public.can_update_own_profile(
  profile_id_input uuid,
  account_role_input text,
  onboarding_complete_input boolean
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
      and (
        not profiles.onboarding_complete
        or (
          onboarding_complete_input
          and profiles.account_role = account_role_input
        )
      )
  );
$$;

drop policy if exists "participants update own profile" on public.profiles;
create policy "participants update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and public.can_update_own_profile(id, account_role, onboarding_complete)
);

grant update (
  account_role, farming_method, website_url, linkedin_url, instagram_url,
  facebook_url, youtube_url
) on public.profiles to authenticated;

drop policy if exists "visitors view active supplier profiles" on public.profiles;
create policy "visitors view active supplier profiles"
on public.profiles for select to anon
using (
  status = 'active'
  and account_role in ('farmer', 'wholesaler')
);

revoke select on public.profiles from anon;
grant select (
  id, handle, full_name, participant_type, account_role, district, state,
  crops, bio, verification_status, experience_years, farming_method,
  website_url, linkedin_url, instagram_url, facebook_url, youtube_url,
  avatar_path, created_at
) on public.profiles to anon;

create or replace function public.is_market_seller(user_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = user_id_input
      and profiles.status = 'active'
      and profiles.onboarding_complete
      and profiles.account_role in ('farmer', 'wholesaler')
  );
$$;

drop policy if exists "active farmers create own listings"
  on public.produce_listings;
drop policy if exists "farmers update own listings"
  on public.produce_listings;

create policy "active sellers create own listings"
on public.produce_listings for insert to authenticated
with check (
  farmer_id = (select auth.uid())
  and public.is_market_seller((select auth.uid()))
);

create policy "sellers update own listings"
on public.produce_listings for update to authenticated
using (
  farmer_id = (select auth.uid())
  and public.is_market_seller((select auth.uid()))
)
with check (
  farmer_id = (select auth.uid())
  and public.is_market_seller((select auth.uid()))
);

alter table public.market_enquiries
  add column buyer_id uuid references public.profiles(id) on delete set null,
  add column conversation_id uuid
    references public.conversations(id) on delete set null;

create index market_enquiries_buyer_idx
  on public.market_enquiries (buyer_id, status, created_at desc)
  where buyer_id is not null;
create index market_enquiries_conversation_idx
  on public.market_enquiries (conversation_id)
  where conversation_id is not null;

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
      and buyer.account_role = 'customer'
      and seller.status = 'active'
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

drop policy if exists "visitors send enquiries for active listings"
  on public.market_enquiries;
drop policy if exists "farmers view enquiries for own listings"
  on public.market_enquiries;
drop policy if exists "farmers update enquiries for own listings"
  on public.market_enquiries;

create policy "visitors send unlinked enquiries for active listings"
on public.market_enquiries for insert to anon
with check (
  buyer_id is null
  and conversation_id is null
  and exists (
    select 1 from public.produce_listings
    where produce_listings.id = market_enquiries.listing_id
      and produce_listings.status = 'active'
  )
);

create policy "participants send valid marketplace enquiries"
on public.market_enquiries for insert to authenticated
with check (
  (
    buyer_id is null
    and conversation_id is null
    and exists (
      select 1 from public.produce_listings
      where produce_listings.id = market_enquiries.listing_id
        and produce_listings.status = 'active'
    )
  )
  or public.is_valid_market_connection(
    listing_id,
    buyer_id,
    conversation_id
  )
);

create policy "buyers and sellers view their marketplace enquiries"
on public.market_enquiries for select to authenticated
using (
  public.is_admin()
  or buyer_id = (select auth.uid())
  or exists (
    select 1 from public.produce_listings
    where produce_listings.id = market_enquiries.listing_id
      and produce_listings.farmer_id = (select auth.uid())
  )
);

create policy "sellers update enquiries for own listings"
on public.market_enquiries for update to authenticated
using (
  exists (
    select 1 from public.produce_listings
    where produce_listings.id = market_enquiries.listing_id
      and produce_listings.farmer_id = (select auth.uid())
      and public.is_market_seller((select auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.produce_listings
    where produce_listings.id = market_enquiries.listing_id
      and produce_listings.farmer_id = (select auth.uid())
      and public.is_market_seller((select auth.uid()))
  )
);

revoke insert on public.market_enquiries from anon, authenticated;
grant insert (
  listing_id, buyer_id, conversation_id, buyer_name, business_name, email,
  phone, location, quantity_needed, need_by, message
) on public.market_enquiries to anon, authenticated;

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
    and account_role = 'customer';

  if buyer_name_value is null then
    raise exception 'A Customer account is required';
  end if;

  select farmer_id into seller_id_value
  from public.produce_listings
  where id = listing_id_input
    and status = 'active';

  if seller_id_value is null
     or not public.is_market_seller(seller_id_value)
     or seller_id_value = buyer_id_value then
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

create table public.market_reviews (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null unique
    references public.market_enquiries(id) on delete cascade,
  listing_id uuid not null
    references public.produce_listings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 10 and 1000),
  status text not null default 'active'
    check (status in ('active', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reviewer_id <> seller_id)
);

create index market_reviews_seller_idx
  on public.market_reviews (seller_id, status, created_at desc);
create index market_reviews_listing_idx
  on public.market_reviews (listing_id, status, created_at desc);

create trigger market_reviews_set_updated_at
before update on public.market_reviews
for each row execute function public.set_updated_at();

create or replace function public.can_review_enquiry(
  enquiry_id_input uuid,
  reviewer_id_input uuid,
  seller_id_input uuid,
  listing_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.market_enquiries
    join public.produce_listings
      on public.produce_listings.id = public.market_enquiries.listing_id
    join public.profiles reviewer
      on reviewer.id = public.market_enquiries.buyer_id
    join public.profiles seller
      on seller.id = public.produce_listings.farmer_id
    where public.market_enquiries.id = enquiry_id_input
      and public.market_enquiries.status = 'won'
      and public.market_enquiries.buyer_id = reviewer_id_input
      and public.market_enquiries.listing_id = listing_id_input
      and public.produce_listings.farmer_id = seller_id_input
      and reviewer.id = (select auth.uid())
      and reviewer.status = 'active'
      and reviewer.account_role = 'customer'
      and seller.status = 'active'
      and seller.account_role in ('farmer', 'wholesaler')
  );
$$;

alter table public.market_reviews enable row level security;

create policy "visitors view active verified reviews"
on public.market_reviews for select to anon
using (
  status = 'active'
  and public.is_market_seller(seller_id)
);

create policy "participants view active or own reviews"
on public.market_reviews for select to authenticated
using (
  status = 'active'
  or reviewer_id = (select auth.uid())
  or public.is_admin()
);

create policy "customers review completed purchases"
on public.market_reviews for insert to authenticated
with check (
  reviewer_id = (select auth.uid())
  and status = 'active'
  and public.can_review_enquiry(
    enquiry_id,
    reviewer_id,
    seller_id,
    listing_id
  )
);

create policy "customers update own active reviews"
on public.market_reviews for update to authenticated
using (reviewer_id = (select auth.uid()))
with check (
  reviewer_id = (select auth.uid())
  and status = 'active'
  and public.can_review_enquiry(
    enquiry_id,
    reviewer_id,
    seller_id,
    listing_id
  )
);

create policy "customers delete own reviews"
on public.market_reviews for delete to authenticated
using (reviewer_id = (select auth.uid()));

revoke all on public.market_reviews from anon, authenticated;
grant select on public.market_reviews to anon, authenticated;
grant insert (
  enquiry_id, listing_id, reviewer_id, seller_id, rating, body
) on public.market_reviews to authenticated;
grant update (rating, body, updated_at)
  on public.market_reviews to authenticated;
grant delete on public.market_reviews to authenticated;

alter table public.reports
  drop constraint if exists reports_target_type_check;
alter table public.reports
  add constraint reports_target_type_check
  check (target_type in ('profile', 'post', 'comment', 'message', 'review'));

alter table public.moderation_actions
  drop constraint if exists moderation_actions_target_type_check;
alter table public.moderation_actions
  add constraint moderation_actions_target_type_check
  check (target_type in ('profile', 'post', 'comment', 'message', 'review'));

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
  if action_input not in ('dismiss', 'hide', 'restore', 'suspend', 'unsuspend') then
    raise exception 'Unsupported moderation action';
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
      end
      where id = target_id_input;
    update public.reports
      set status = 'actioned', decided_at = now()
      where id = report_id_input;
  elsif target_type_input = 'post' then
    update public.posts
      set status = case when action_input = 'restore' then 'active' else 'hidden' end
      where id = target_id_input;
    update public.reports
      set status = 'actioned', decided_at = now()
      where id = report_id_input;
  elsif target_type_input = 'comment' then
    update public.comments
      set status = case when action_input = 'restore' then 'active' else 'hidden' end
      where id = target_id_input;
    update public.reports
      set status = 'actioned', decided_at = now()
      where id = report_id_input;
  elsif target_type_input = 'message' then
    update public.messages
      set status = case when action_input = 'restore' then 'active' else 'hidden' end
      where id = target_id_input;
    update public.reports
      set status = 'actioned', decided_at = now()
      where id = report_id_input;
  elsif target_type_input = 'review' then
    update public.market_reviews
      set status = case when action_input = 'restore' then 'active' else 'hidden' end
      where id = target_id_input;
    update public.reports
      set status = 'actioned', decided_at = now()
      where id = report_id_input;
  end if;

  insert into public.moderation_actions (
    report_id, moderator_id, action, target_type, target_id, note
  ) values (
    report_id_input,
    moderator_id_input,
    action_input,
    target_type_input,
    target_id_input,
    coalesce(note_input, '')
  );
end;
$$;
