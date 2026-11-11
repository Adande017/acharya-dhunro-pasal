create table if not exists public.friendships (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requester_id in (user_low, user_high))
);

create index if not exists friendships_pending_recipient_idx
  on public.friendships (user_low, user_high, status, requester_id);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

drop policy if exists "Members can read their own friendships" on public.friendships;
create policy "Members can read their own friendships"
  on public.friendships for select to authenticated
  using (user_low = (select auth.uid()) or user_high = (select auth.uid()));

create or replace function public.request_friend(target_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  low_id uuid;
  high_id uuid;
  relationship public.friendships%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in is required';
  end if;
  if target_user is null or target_user = current_user_id then
    raise exception 'Choose another member';
  end if;
  if not exists (select 1 from public.profiles p where p.id = target_user) then
    raise exception 'Member not found';
  end if;

  low_id := least(current_user_id, target_user);
  high_id := greatest(current_user_id, target_user);

  insert into public.friendships (user_low, user_high, requester_id, status)
  values (low_id, high_id, current_user_id, 'pending')
  on conflict (user_low, user_high) do nothing;

  select *
  into relationship
  from public.friendships f
  where f.user_low = low_id and f.user_high = high_id
  for update;

  if relationship.status = 'declined' then
    update public.friendships
    set requester_id = current_user_id, status = 'pending', updated_at = now()
    where user_low = low_id and user_high = high_id;
    return 'pending';
  end if;
  if relationship.status = 'accepted' then
    return 'accepted';
  end if;
  if relationship.requester_id = current_user_id then
    return 'pending';
  end if;
  return 'incoming';
end;
$$;

create or replace function public.respond_to_friend_request(
  requester uuid,
  accept_request boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  low_id uuid;
  high_id uuid;
  next_status text;
begin
  if current_user_id is null then
    raise exception 'Sign in is required';
  end if;
  if requester is null or requester = current_user_id then
    raise exception 'Invalid friend request';
  end if;

  low_id := least(current_user_id, requester);
  high_id := greatest(current_user_id, requester);
  next_status := case when accept_request then 'accepted' else 'declined' end;

  update public.friendships
  set status = next_status, updated_at = now()
  where user_low = low_id
    and user_high = high_id
    and requester_id = requester
    and status = 'pending';

  if not found then
    raise exception 'This friend request is no longer pending';
  end if;
  return next_status;
end;
$$;

revoke all on function public.request_friend(uuid) from public, anon;
grant execute on function public.request_friend(uuid) to authenticated;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
