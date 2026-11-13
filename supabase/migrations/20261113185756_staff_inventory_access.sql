create table if not exists public.inventory_staff_emails (
  email text primary key check (
    email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  added_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.inventory_staff_emails enable row level security;
revoke all on public.inventory_staff_emails from public, anon, authenticated;
grant select, insert, delete on public.inventory_staff_emails to authenticated;

create or replace function public.is_inventory_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'roms7291@gmail.com';
$$;

revoke all on function public.is_inventory_owner() from public, anon;
grant execute on function public.is_inventory_owner() to authenticated;

drop policy if exists "Owner can read inventory staff" on public.inventory_staff_emails;
create policy "Owner can read inventory staff"
  on public.inventory_staff_emails for select to authenticated
  using ((select public.is_inventory_owner()));

drop policy if exists "Owner can add inventory staff" on public.inventory_staff_emails;
create policy "Owner can add inventory staff"
  on public.inventory_staff_emails for insert to authenticated
  with check ((select public.is_inventory_owner()));

drop policy if exists "Owner can remove inventory staff" on public.inventory_staff_emails;
create policy "Owner can remove inventory staff"
  on public.inventory_staff_emails for delete to authenticated
  using ((select public.is_inventory_owner()));

create or replace function public.is_inventory_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_inventory_owner()
    or exists (
      select 1
      from public.inventory_staff_emails staff
      where staff.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.is_inventory_staff() from public, anon;
grant execute on function public.is_inventory_staff() to authenticated;
