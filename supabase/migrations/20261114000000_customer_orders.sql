create table if not exists public.customer_orders (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  note text not null default '',
  product_id text not null references public.inventory_items (product_id) on delete restrict,
  quantity integer not null check (quantity between 1 and 99),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customer_orders_created_at_idx
  on public.customer_orders (created_at desc);

alter table public.customer_orders enable row level security;
revoke all on public.customer_orders from public, anon, authenticated;
grant select on public.customer_orders to authenticated;

drop policy if exists "Inventory staff can read customer orders" on public.customer_orders;
create policy "Inventory staff can read customer orders"
  on public.customer_orders for select to authenticated
  using ((select public.is_inventory_staff()));

create or replace function public.place_customer_order(
  p_customer_name text,
  p_customer_phone text,
  p_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_line jsonb;
  order_id uuid := pg_catalog.gen_random_uuid();
  v_product_id text;
  v_quantity integer;
  updated_item public.inventory_items%rowtype;
begin
  if p_customer_name is null
    or pg_catalog.length(pg_catalog.btrim(p_customer_name)) not between 1 and 80
    or p_customer_name ~ '[[:cntrl:]]' then
    raise exception 'Enter a name between 1 and 80 characters';
  end if;
  if p_customer_phone is null
    or pg_catalog.length(pg_catalog.btrim(p_customer_phone)) not between 5 and 24
    or p_customer_phone ~ '[[:cntrl:]]' then
    raise exception 'Enter a phone number between 5 and 24 characters';
  end if;
  if p_note is null
    or pg_catalog.length(p_note) > 200
    or p_note ~ '[[:cntrl:]]' then
    raise exception 'Order note must be 200 characters or fewer';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Add exactly one product to the order';
  end if;
  if pg_catalog.jsonb_array_length(p_items) <> 1 then
    raise exception 'Add exactly one product to the order';
  end if;

  select value into order_line
  from pg_catalog.jsonb_array_elements(p_items) as lines(value);

  if jsonb_typeof(order_line -> 'product_id') is distinct from 'string' then
    raise exception 'Choose a valid product';
  end if;
  v_product_id := order_line ->> 'product_id';
  if v_product_id not in ('snack', 'party', 'bulk') then
    raise exception 'Choose a valid product';
  end if;
  if jsonb_typeof(order_line -> 'quantity') is distinct from 'number'
    or (order_line ->> 'quantity') !~ '^[0-9]+$' then
    raise exception 'Quantity must be a whole number between 1 and 99';
  end if;
  v_quantity := (order_line ->> 'quantity')::integer;
  if v_quantity not between 1 and 99 then
    raise exception 'Quantity must be a whole number between 1 and 99';
  end if;

  update public.inventory_items
  set quantity_on_hand = quantity_on_hand - v_quantity,
      updated_at = now(),
      updated_by = auth.uid()
  where inventory_items.product_id = v_product_id
    and quantity_on_hand >= v_quantity
  returning * into updated_item;

  if not found then
    raise exception 'The selected product is no longer available in that quantity';
  end if;

  insert into public.customer_orders (
    id, customer_name, customer_phone, note, product_id, quantity, created_by
  )
  values (
    order_id, pg_catalog.btrim(p_customer_name), pg_catalog.btrim(p_customer_phone),
    pg_catalog.btrim(p_note), v_product_id, v_quantity, auth.uid()
  );

  insert into public.inventory_transactions (
    product_id, transaction_type, quantity, stock_after, sale_id, created_by
  )
  values (
    updated_item.product_id, 'sale', v_quantity, updated_item.quantity_on_hand,
    order_id, auth.uid()
  );

  return pg_catalog.jsonb_build_object(
    'order_id', order_id,
    'product_id', updated_item.product_id,
    'quantity', v_quantity,
    'created_at', now()
  );
end;
$$;

revoke all on function public.place_customer_order(text, text, text, jsonb) from public;
grant execute on function public.place_customer_order(text, text, text, jsonb) to anon, authenticated;
