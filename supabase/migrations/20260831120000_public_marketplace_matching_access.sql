-- Keep anonymous marketplace matching compatible with column-scoped profile
-- grants. The policy must not directly query public.profiles as anon because
-- PostgreSQL requires table-level privileges for that policy subquery.
drop policy if exists "visitors browse active produce listings"
  on public.produce_listings;

create policy "visitors browse active produce listings"
on public.produce_listings for select to anon
using (
  status = 'active'
  and public.is_active_user(farmer_id)
);
