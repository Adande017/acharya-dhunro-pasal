create table if not exists public.inventory_audit_log (
  id bigint generated always as identity primary key,
  entity_type text not null check (
    entity_type in ('inventory_items', 'inventory_products', 'inventory_staff_emails')
  ),
  entity_id text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  details jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_audit_log_created_at_idx
  on public.inventory_audit_log (created_at desc, id desc);

alter table public.inventory_audit_log enable row level security;
revoke all on public.inventory_audit_log from public, anon, authenticated;
grant select on public.inventory_audit_log to authenticated;

drop policy if exists "Owner can read inventory audit log" on public.inventory_audit_log;
create policy "Owner can read inventory audit log"
  on public.inventory_audit_log for select to authenticated
  using ((select public.is_inventory_owner()));

create or replace function public.record_inventory_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_record jsonb;
  new_record jsonb;
  key_name text;
begin
  key_name := case
    when tg_table_name = 'inventory_staff_emails' then 'email'
    else 'product_id'
  end;

  if tg_op <> 'INSERT' then
    old_record := to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    new_record := to_jsonb(new);
  end if;

  insert into public.inventory_audit_log (
    entity_type,
    entity_id,
    operation,
    actor_id,
    actor_email,
    details
  )
  values (
    tg_table_name,
    coalesce(new_record ->> key_name, old_record ->> key_name),
    tg_op,
    auth.uid(),
    nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''),
    jsonb_build_object('before', old_record, 'after', new_record)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.record_inventory_audit_event() from public, anon, authenticated;

drop trigger if exists inventory_items_audit on public.inventory_items;
create trigger inventory_items_audit
  after insert or update or delete on public.inventory_items
  for each row execute function public.record_inventory_audit_event();

drop trigger if exists inventory_products_audit on public.inventory_products;
create trigger inventory_products_audit
  after insert or update or delete on public.inventory_products
  for each row execute function public.record_inventory_audit_event();

drop trigger if exists inventory_staff_emails_audit on public.inventory_staff_emails;
create trigger inventory_staff_emails_audit
  after insert or update or delete on public.inventory_staff_emails
  for each row execute function public.record_inventory_audit_event();
