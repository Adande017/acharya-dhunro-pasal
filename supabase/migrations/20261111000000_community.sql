create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists comments_post_created_at_idx on public.comments (post_id, created_at);
create index if not exists messages_conversation_created_at_idx
  on public.messages (conversation_id, created_at);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 60),
      left(nullif(split_part(new.email, '@', 1), ''), 60),
      'Member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at
  before update on public.comments
  for each row execute function public.touch_updated_at();

create or replace function public.is_conversation_member(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = _conversation_id
      and cm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

create or replace function public.start_conversation(target_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in is required';
  end if;
  if target_user is null or target_user = current_user_id then
    raise exception 'Choose another member to message';
  end if;
  if not exists (select 1 from public.profiles p where p.id = target_user) then
    raise exception 'Member not found';
  end if;

  select cm.conversation_id
  into conversation_id
  from public.conversation_members cm
  where cm.user_id in (current_user_id, target_user)
  group by cm.conversation_id
  having count(*) = 2
    and count(*) filter (where cm.user_id = current_user_id) = 1
    and count(*) filter (where cm.user_id = target_user) = 1
  limit 1;

  if conversation_id is null then
    insert into public.conversations default values
    returning id into conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (conversation_id, current_user_id), (conversation_id, target_user);
  end if;

  return conversation_id;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select on public.conversations, public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;

drop policy if exists "Members can read profiles" on public.profiles;
create policy "Members can read profiles"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Members can update own profile" on public.profiles;
create policy "Members can update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Members can read posts" on public.posts;
create policy "Members can read posts"
  on public.posts for select to authenticated using (true);

drop policy if exists "Members can create own posts" on public.posts;
create policy "Members can create own posts"
  on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors can update own posts" on public.posts;
create policy "Authors can update own posts"
  on public.posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors can delete own posts" on public.posts;
create policy "Authors can delete own posts"
  on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Members can read comments" on public.comments;
create policy "Members can read comments"
  on public.comments for select to authenticated using (true);

drop policy if exists "Members can create own comments" on public.comments;
create policy "Members can create own comments"
  on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors can update own comments" on public.comments;
create policy "Authors can update own comments"
  on public.comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors can delete own comments" on public.comments;
create policy "Authors can delete own comments"
  on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Members can read likes" on public.post_likes;
create policy "Members can read likes"
  on public.post_likes for select to authenticated using (true);

drop policy if exists "Members can like posts" on public.post_likes;
create policy "Members can like posts"
  on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Members can remove own likes" on public.post_likes;
create policy "Members can remove own likes"
  on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Members can read own conversations" on public.conversations;
create policy "Members can read own conversations"
  on public.conversations for select to authenticated
  using ((select public.is_conversation_member(id)));

drop policy if exists "Members can read conversation participants" on public.conversation_members;
create policy "Members can read conversation participants"
  on public.conversation_members for select to authenticated
  using ((select public.is_conversation_member(conversation_id)));

drop policy if exists "Members can read conversation messages" on public.messages;
create policy "Members can read conversation messages"
  on public.messages for select to authenticated
  using ((select public.is_conversation_member(conversation_id)));

drop policy if exists "Members can send messages in own conversations" on public.messages;
create policy "Members can send messages in own conversations"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.is_conversation_member(conversation_id))
  );

insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    left(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), 60),
    left(nullif(split_part(u.email, '@', 1), ''), 60),
    'Member'
  )
from auth.users u
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can read profile photos" on storage.objects;
create policy "Members can read profile photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Members can upload own profile photos" on storage.objects;
create policy "Members can upload own profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members can update own profile photos" on storage.objects;
create policy "Members can update own profile photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members can delete own profile photos" on storage.objects;
create policy "Members can delete own profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
