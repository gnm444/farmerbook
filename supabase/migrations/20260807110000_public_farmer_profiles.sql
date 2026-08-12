-- Opt-in public Farmer identity homepages and their referenced profile media.
-- The existing authenticated community profile and supplier storefront remain
-- unchanged; this migration only adds the public profile-home capability.

alter table public.profiles
  add column cover_path text,
  add column public_profile_enabled boolean not null default false,
  add constraint profiles_cover_path_check
    check (cover_path is null or char_length(cover_path) <= 500),
  add constraint profiles_public_home_role_check
    check (account_role = 'farmer' or not public_profile_enabled);

create index profiles_public_farmer_home_idx
  on public.profiles (handle)
  where status = 'active'
    and account_role = 'farmer'
    and public_profile_enabled;

grant update (cover_path, public_profile_enabled)
  on public.profiles to authenticated;

grant select (cover_path, public_profile_enabled)
  on public.profiles to anon;

create policy "visitors view published farmer profile media"
on storage.objects for select to anon
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.profiles as profile
    where profile.status = 'active'
      and profile.account_role = 'farmer'
      and profile.public_profile_enabled
      and (
        profile.avatar_path = storage.objects.name
        or profile.cover_path = storage.objects.name
      )
  )
);
