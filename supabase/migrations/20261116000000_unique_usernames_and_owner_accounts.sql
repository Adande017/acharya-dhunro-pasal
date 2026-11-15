alter table public.profiles
  add column if not exists username text;

update public.profiles
set username =
  left(
    coalesce(
      nullif(
        btrim(regexp_replace(lower(display_name), '[^a-z0-9]+', '_', 'g'), '_'),
        ''
      ),
      'member'
    ),
    17
  )
  || '_'
  || substr(replace(id::text, '-', ''), 1, 32)
where username is null;

alter table public.profiles
  alter column username set not null;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (username ~ '^[a-z0-9_]{3,50}$');
  end if;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name_value text;
  username_base text;
  username_value text;
  attempt integer;
begin
  display_name_value := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Member'
  );
  username_base := left(
    coalesce(
      nullif(btrim(regexp_replace(lower(display_name_value), '[^a-z0-9]+', '_', 'g'), '_'), ''),
      'member'
    ),
    17
  );

  for attempt in 1..10 loop
    username_value := username_base || '_' || case
      when attempt = 1 then substr(replace(new.id::text, '-', ''), 1, 8)
      else replace(gen_random_uuid()::text, '-', '')
    end;

    insert into public.profiles (id, display_name, username)
    values (new.id, left(display_name_value, 60), username_value)
    on conflict do nothing;

    if exists (select 1 from public.profiles where id = new.id) then
      return new;
    end if;
  end loop;

  raise exception 'Could not create a unique member username';
end;
$$;

create or replace function public.owner_list_accounts()
returns table (
  user_id uuid,
  email text,
  username text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_inventory_owner() then
    raise exception 'Only the shop owner can view member accounts';
  end if;

  return query
  select
    users.id,
    users.email,
    profiles.username,
    profiles.display_name,
    users.created_at,
    users.last_sign_in_at
  from auth.users as users
  left join public.profiles as profiles on profiles.id = users.id
  order by users.created_at desc;
end;
$$;

revoke all on function public.owner_list_accounts() from public, anon, authenticated;
grant execute on function public.owner_list_accounts() to authenticated;
