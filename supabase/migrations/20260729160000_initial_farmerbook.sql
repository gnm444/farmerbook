-- FarmerBook MVP schema.
-- Every browser-exposed table enables Row Level Security (RLS). The browser
-- receives only the publishable key; service-role access remains server-only.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  full_name text not null check (char_length(full_name) between 2 and 80),
  participant_type text not null default 'farmer'
    check (participant_type in ('farmer', 'agronomist', 'fpo', 'buyer', 'trainer', 'ngo')),
  district text not null default '' check (char_length(district) <= 80),
  state text not null default '' check (char_length(state) <= 80),
  crops text[] not null default '{}' check (cardinality(crops) <= 8),
  bio text not null default '' check (char_length(bio) <= 500),
  experience_years integer check (experience_years between 0 and 80),
  farm_size_text text check (char_length(farm_size_text) <= 80),
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'hi', 'mr')),
  avatar_path text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'deleted')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  category text not null
    check (category in ('discussion', 'question', 'opportunity')),
  image_path text,
  status text not null default 'active'
    check (status in ('active', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  status text not null default 'active'
    check (status in ('active', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'helpful' check (reaction = 'helpful'),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind = 'direct'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.direct_conversation_pairs (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  unique (user_low, user_high),
  check (user_low < user_high)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  status text not null default 'active'
    check (status in ('active', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null
    check (target_type in ('profile', 'post', 'comment', 'message')),
  target_id uuid not null,
  reason text not null
    check (reason in ('misinformation', 'harassment', 'spam', 'unsafe', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  moderator_id uuid not null references auth.users(id) on delete restrict,
  action text not null
    check (action in (
      'dismiss', 'hide', 'restore', 'suspend', 'unsuspend', 'verify', 'reject'
    )),
  target_type text not null
    check (target_type in ('profile', 'post', 'comment', 'message')),
  target_id uuid not null,
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create table public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null check (
    event_name in (
      'signup_completed',
      'profile_completed',
      'post_created',
      'comment_created',
      'reaction_added',
      'profile_followed',
      'conversation_started',
      'message_sent',
      'content_reported',
      'account_deleted'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (pg_column_size(metadata) <= 4096)
);

create index profiles_active_location_idx
  on public.profiles (state, district, created_at desc)
  where status = 'active';
create index profiles_crops_idx on public.profiles using gin (crops);
create index profiles_name_search_idx on public.profiles (lower(full_name));
create index posts_feed_idx on public.posts (created_at desc, id desc)
  where status = 'active';
create index posts_author_idx on public.posts (author_id, created_at desc);
create index comments_post_idx on public.comments (post_id, created_at);
create index follows_followed_idx on public.follows (followed_id, created_at desc);
create index conversation_members_user_idx
  on public.conversation_members (user_id, conversation_id);
create index messages_conversation_idx
  on public.messages (conversation_id, created_at desc);
create index reports_pending_idx on public.reports (created_at)
  where status = 'pending';
create index product_events_name_created_idx
  on public.product_events (event_name, created_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();
create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create or replace function public.is_active_user(user_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id_input and status = 'active'
  );
$$;

create or replace function public.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

create or replace function public.can_access_conversation(conversation_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members self_member
    where self_member.conversation_id = conversation_id_input
      and self_member.user_id = (select auth.uid())
      and not exists (
        select 1
        from public.conversation_members other_member
        where other_member.conversation_id = conversation_id_input
          and other_member.user_id <> (select auth.uid())
          and public.is_blocked((select auth.uid()), other_member.user_id)
      )
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, full_name)
  values (
    new.id,
    'user_' || replace(substr(new.id::text, 1, 12), '-', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New participant')
  )
  on conflict (id) do nothing;
  insert into public.product_events (user_id, event_name)
  values (new.id, 'signup_completed');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := (select auth.uid());
  low_id uuid;
  high_id uuid;
  result_id uuid;
begin
  if viewer_id is null then
    raise exception 'Authentication required';
  end if;
  if viewer_id = other_user_id then
    raise exception 'A direct conversation requires another participant';
  end if;
  if not public.is_active_user(viewer_id)
     or not public.is_active_user(other_user_id)
     or public.is_blocked(viewer_id, other_user_id) then
    raise exception 'Conversation is unavailable';
  end if;

  low_id := least(viewer_id, other_user_id);
  high_id := greatest(viewer_id, other_user_id);
  perform pg_advisory_xact_lock(
    hashtextextended(low_id::text || ':' || high_id::text, 0)
  );

  select conversation_id into result_id
  from public.direct_conversation_pairs
  where user_low = low_id and user_high = high_id;

  if result_id is null then
    insert into public.conversations default values returning id into result_id;
    insert into public.direct_conversation_pairs (
      conversation_id, user_low, user_high
    ) values (result_id, low_id, high_id);
    insert into public.conversation_members (conversation_id, user_id)
    values (result_id, viewer_id), (result_id, other_user_id);
  end if;

  return result_id;
end;
$$;

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

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.direct_conversation_pairs enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.product_events enable row level security;

create policy "active participants view unblocked profiles"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.is_admin()
  or (
    status = 'active'
    and not public.is_blocked((select auth.uid()), id)
  )
);
create policy "participants insert own profile"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy "participants update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "participants view active unblocked posts"
on public.posts for select to authenticated
using (
  author_id = (select auth.uid())
  or public.is_admin()
  or (
    status = 'active'
    and public.is_active_user(author_id)
    and not public.is_blocked((select auth.uid()), author_id)
  )
);
create policy "active participants create own posts"
on public.posts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and public.is_active_user((select auth.uid()))
);
create policy "authors update own posts"
on public.posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "participants view active unblocked comments"
on public.comments for select to authenticated
using (
  author_id = (select auth.uid())
  or public.is_admin()
  or (
    status = 'active'
    and public.is_active_user(author_id)
    and not public.is_blocked((select auth.uid()), author_id)
    and exists (
      select 1 from public.posts
      where posts.id = comments.post_id and posts.status = 'active'
    )
  )
);
create policy "active participants create own comments"
on public.comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and public.is_active_user((select auth.uid()))
  and exists (
    select 1 from public.posts
    where posts.id = comments.post_id
      and posts.status = 'active'
      and not public.is_blocked((select auth.uid()), posts.author_id)
  )
);
create policy "authors update own comments"
on public.comments for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "participants view reactions on visible posts"
on public.post_reactions for select to authenticated
using (
  exists (
    select 1 from public.posts
    where posts.id = post_reactions.post_id
      and posts.status = 'active'
      and not public.is_blocked((select auth.uid()), posts.author_id)
  )
);
create policy "participants add own helpful reaction"
on public.post_reactions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_active_user((select auth.uid()))
);
create policy "participants remove own helpful reaction"
on public.post_reactions for delete to authenticated
using (user_id = (select auth.uid()));

create policy "participants view relevant follows"
on public.follows for select to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user(follower_id)
    and public.is_active_user(followed_id)
    and not public.is_blocked((select auth.uid()), follower_id)
    and not public.is_blocked((select auth.uid()), followed_id)
  )
);
create policy "participants create own follows"
on public.follows for insert to authenticated
with check (
  follower_id = (select auth.uid())
  and public.is_active_user((select auth.uid()))
  and not public.is_blocked(follower_id, followed_id)
);
create policy "participants delete own follows"
on public.follows for delete to authenticated
using (follower_id = (select auth.uid()));

create policy "participants view own blocks"
on public.blocks for select to authenticated
using (blocker_id = (select auth.uid()));
create policy "participants create own blocks"
on public.blocks for insert to authenticated
with check (
  blocker_id = (select auth.uid())
  and public.is_active_user((select auth.uid()))
);
create policy "participants delete own blocks"
on public.blocks for delete to authenticated
using (blocker_id = (select auth.uid()));

create policy "members view available conversations"
on public.conversations for select to authenticated
using (public.can_access_conversation(id));
create policy "members view own direct pairs"
on public.direct_conversation_pairs for select to authenticated
using (user_low = (select auth.uid()) or user_high = (select auth.uid()));
create policy "members view conversation membership"
on public.conversation_members for select to authenticated
using (public.can_access_conversation(conversation_id));

create policy "members view available messages"
on public.messages for select to authenticated
using (public.can_access_conversation(conversation_id));
create policy "members send own messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_active_user((select auth.uid()))
  and public.can_access_conversation(conversation_id)
);

create policy "reporters view own reports"
on public.reports for select to authenticated
using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "active participants create reports"
on public.reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and public.is_active_user((select auth.uid()))
);

create policy "administrators view moderation actions"
on public.moderation_actions for select to authenticated
using (public.is_admin());

create policy "participants create own product events"
on public.product_events for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "administrators view aggregate event rows"
on public.product_events for select to authenticated
using (public.is_admin());

revoke all on public.profiles from anon, authenticated;
revoke all on public.posts from anon, authenticated;
revoke all on public.comments from anon, authenticated;
revoke all on public.post_reactions from anon, authenticated;
revoke all on public.follows from anon, authenticated;
revoke all on public.blocks from anon, authenticated;
revoke all on public.conversations from anon, authenticated;
revoke all on public.direct_conversation_pairs from anon, authenticated;
revoke all on public.conversation_members from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.moderation_actions from anon, authenticated;
revoke all on public.product_events from anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant update (
  handle, full_name, participant_type, district, state, crops, bio,
  experience_years, farm_size_text, preferred_language, avatar_path,
  onboarding_complete, updated_at
) on public.profiles to authenticated;
grant select, insert on public.posts to authenticated;
grant update (body, category, image_path, status, updated_at)
  on public.posts to authenticated;
grant select, insert on public.comments to authenticated;
grant update (body, status, updated_at) on public.comments to authenticated;
grant select, insert, delete on public.post_reactions to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select on public.conversations to authenticated;
grant select on public.direct_conversation_pairs to authenticated;
grant select on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert on public.reports to authenticated;
grant select on public.moderation_actions to authenticated;
grant select, insert on public.product_events to authenticated;
grant usage, select on sequence public.product_events_id_seq to authenticated;

revoke all on function public.apply_moderation_action(
  uuid, text, uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.apply_moderation_action(
  uuid, text, uuid, text, text, uuid
) to service_role;
grant execute on function public.get_or_create_direct_conversation(uuid)
  to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
), (
  'post-images',
  'post-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "authenticated participants view pilot images"
on storage.objects for select to authenticated
using (bucket_id in ('avatars', 'post-images'));
create policy "participants upload avatar in own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "participants update avatar in own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "participants delete avatar in own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "participants upload post image in own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "participants delete post image in own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace view public.pilot_aggregate_metrics
with (security_invoker = true)
as
select
  (select count(*) from public.profiles where status = 'active') as active_profiles,
  (select count(*) from public.profiles where onboarding_complete) as completed_profiles,
  (select count(*) from public.posts where status = 'active') as active_posts,
  (select count(*) from public.messages where status = 'active') as active_messages,
  (select count(*) from public.reports where status = 'pending') as pending_reports;

revoke all on public.pilot_aggregate_metrics from anon, authenticated;
grant select on public.pilot_aggregate_metrics to service_role;
