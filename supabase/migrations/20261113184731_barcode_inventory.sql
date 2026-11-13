create table if not exists public.inventory_items (
  product_id text primary key check (product_id in ('snack', 'party', 'bulk')),
  barcode text not null unique check (barcode ~ '^DHP-[A-Z]+-[0-9]{3}$'),
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.inventory_transactions (
  id bigint generated always as identity primary key,
  product_id text not null references public.inventory_items (product_id) on delete restrict,
  transaction_type text not null check (transaction_type in ('received', 'sale')),
  quantity integer not null check (quantity > 0),
  stock_after integer not null check (stock_after >= 0),
  sale_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (transaction_type = 'received' and sale_id is null)
    or (transaction_type = 'sale' and sale_id is not null)
  )
);

create index if not exists inventory_transactions_created_at_idx
  on public.inventory_transactions (created_at desc);

insert into public.inventory_items (product_id, barcode, quantity_on_hand, low_stock_threshold)
values
  ('snack', 'DHP-SNACK-001', 0, 10),
  ('party', 'DHP-PARTY-001', 0, 10),
  ('bulk', 'DHP-BULK-001', 0, 10)
on conflict (product_id) do nothing;

alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;

create or replace function public.is_inventory_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'roms7291@gmail.com';
$$;

revoke all on function public.is_inventory_staff() from public, anon;
grant execute on function public.is_inventory_staff() to authenticated;

revoke all on public.inventory_items from anon, authenticated;
grant select on public.inventory_items to authenticated;

drop policy if exists "Shop owner can read inventory" on public.inventory_items;
create policy "Shop owner can read inventory"
  on public.inventory_items for select to authenticated
  using ((select public.is_inventory_staff()));

revoke all on public.inventory_transactions from anon, authenticated;
grant select on public.inventory_transactions to authenticated;

drop policy if exists "Shop owner can read inventory history" on public.inventory_transactions;
create policy "Shop owner can read inventory history"
  on public.inventory_transactions for select to authenticated
  using ((select public.is_inventory_staff()));

create or replace view public.inventory_availability
with (security_invoker = false, security_barrier = true)
as
select
  product_id,
  case
    when quantity_on_hand = 0 then 'unavailable'
    when quantity_on_hand <= low_stock_threshold then 'low_stock'
    else 'in_stock'
  end as status
from public.inventory_items;

revoke all on public.inventory_availability from public, anon, authenticated;
grant select on public.inventory_availability to anon, authenticated;

create or replace function public.receive_inventory(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  line record;
  updated_item public.inventory_items%rowtype;
  results jsonb := '[]'::jsonb;
begin
  if not public.is_inventory_staff() then
    raise exception 'Only the shop account can receive inventory';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Inventory items must be an array';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Scan between 1 and 100 inventory items at a time';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    where input.product_id is null
      or input.product_id not in ('snack', 'party', 'bulk')
      or input.quantity is null
      or input.quantity < 1
      or input.quantity > 10000
  ) then
    raise exception 'Each received quantity must be between 1 and 10000';
  end if;

  for line in
    select input.product_id, sum(input.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    group by input.product_id
    order by input.product_id
  loop
    update public.inventory_items
    set quantity_on_hand = quantity_on_hand + line.quantity,
        updated_at = now(),
        updated_by = auth.uid()
    where product_id = line.product_id
    returning * into updated_item;

    if not found then
      raise exception 'Inventory item % was not found', line.product_id;
    end if;

    insert into public.inventory_transactions (
      product_id, transaction_type, quantity, stock_after, created_by
    )
    values (
      updated_item.product_id, 'received', line.quantity,
      updated_item.quantity_on_hand, auth.uid()
    );

    results := results || jsonb_build_array(jsonb_build_object(
      'product_id', updated_item.product_id,
      'barcode', updated_item.barcode,
      'quantity_on_hand', updated_item.quantity_on_hand,
      'low_stock_threshold', updated_item.low_stock_threshold,
      'updated_at', updated_item.updated_at
    ));
  end loop;

  return results;
end;
$$;

create or replace function public.complete_inventory_sale(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  line record;
  updated_item public.inventory_items%rowtype;
  sale_id uuid := pg_catalog.gen_random_uuid();
  results jsonb := '[]'::jsonb;
begin
  if not public.is_inventory_staff() then
    raise exception 'Only the shop account can complete an inventory sale';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Sale items must be an array';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Add between 1 and 100 sale items';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    where input.product_id is null
      or input.product_id not in ('snack', 'party', 'bulk')
      or input.quantity is null
      or input.quantity < 1
      or input.quantity > 10000
  ) then
    raise exception 'Each sale quantity must be between 1 and 10000';
  end if;

  for line in
    select input.product_id, sum(input.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    group by input.product_id
    order by input.product_id
  loop
    update public.inventory_items
    set quantity_on_hand = quantity_on_hand - line.quantity,
        updated_at = now(),
        updated_by = auth.uid()
    where product_id = line.product_id
      and quantity_on_hand >= line.quantity
    returning * into updated_item;

    if not found then
      raise exception 'Not enough stock to complete the sale for %', line.product_id;
    end if;

    insert into public.inventory_transactions (
      product_id, transaction_type, quantity, stock_after, sale_id, created_by
    )
    values (
      updated_item.product_id, 'sale', line.quantity,
      updated_item.quantity_on_hand, sale_id, auth.uid()
    );

    results := results || jsonb_build_array(jsonb_build_object(
      'product_id', updated_item.product_id,
      'barcode', updated_item.barcode,
      'quantity_on_hand', updated_item.quantity_on_hand,
      'low_stock_threshold', updated_item.low_stock_threshold,
      'updated_at', updated_item.updated_at
    ));
  end loop;

  return jsonb_build_object('sale_id', sale_id, 'items', results);
end;
$$;

revoke all on function public.receive_inventory(jsonb) from public, anon;
grant execute on function public.receive_inventory(jsonb) to authenticated;
revoke all on function public.complete_inventory_sale(jsonb) from public, anon;
grant execute on function public.complete_inventory_sale(jsonb) to authenticated;
