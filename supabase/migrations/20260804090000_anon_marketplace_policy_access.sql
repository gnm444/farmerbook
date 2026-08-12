-- The anonymous produce-listing policy checks the supplier's profile status in
-- a subquery. Grant that non-sensitive column so Postgres can evaluate the RLS
-- predicate without exposing private profile fields.
grant select (status) on public.profiles to anon;
