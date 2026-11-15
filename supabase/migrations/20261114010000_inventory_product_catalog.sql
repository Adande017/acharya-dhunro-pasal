create table if not exists public.inventory_products (
  product_id text primary key check (product_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (pg_catalog.length(pg_catalog.btrim(name)) between 1 and 80),
  kicker text not null default '' check (pg_catalog.length(kicker) <= 40),
  description text not null default '' check (pg_catalog.length(description) <= 300),
  image text not null default 'product/closeup-bright.jpg' check (pg_catalog.length(image) <= 500),
  image_alt text not null default '' check (pg_catalog.length(image_alt) <= 200),
  suited text not null default '' check (pg_catalog.length(suited) <= 120),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.inventory_products (product_id, name, kicker, description, image, image_alt, suited, sort_order)
values
  ('snack', 'Snack bag', 'Everyday', 'A light bag for home and teatime. Crisp maize pipes, ready to share.', 'product/closeup-bright.jpg', 'Close-up of golden Corn Puff Pipes spilling from a bowl', 'Home, office, after-school', 1),
  ('party', 'Party pack', 'Gatherings', 'A larger share for birthdays, puja, and gifting. Same handmade batch.', 'product/basket-bright.jpg', 'Woven basket filled with Corn Puff Pipes on a wooden table', 'Celebrations and gifting', 2),
  ('bulk', 'Bulk order', 'Wholesale', 'Sacks for shops and events. Call to arrange pickup or delivery.', 'product/bulk-bright.jpg', 'Large sack of Corn Puff Pipes, bulk wholesale pack', 'Kirana, events, resale', 3)
on conflict (product_id) do nothing;

alter table public.inventory_items
  drop constraint if exists inventory_items_product_id_check,
  drop constraint if exists inventory_items_barcode_check;

alter table public.inventory_items
  add constraint inventory_items_product_id_fkey
    foreign key (product_id) references public.inventory_products (product_id) on delete restrict,
  add constraint inventory_items_barcode_check
    check (barcode ~ '^[A-Z0-9][A-Z0-9-]{2,63}$');

alter table public.inventory_products enable row level security;
revoke all on public.inventory_products from public, anon, authenticated;
grant select on public.inventory_products to anon, authenticated;

drop policy if exists "Public can read active inventory products" on public.inventory_products;
drop policy if exists "Inventory staff can read all inventory products" on public.inventory_products;
create policy "Public can read active inventory products"
  on public.inventory_products for select to anon, authenticated
  using (active);
create policy "Inventory staff can read all inventory products"
  on public.inventory_products for select to authenticated
  using ((select public.is_inventory_staff()));

create or replace view public.inventory_availability
with (security_invoker = false, security_barrier = true)
as
select
  inventory_items.product_id,
  case
    when inventory_items.quantity_on_hand = 0 then 'unavailable'
    when inventory_items.quantity_on_hand <= inventory_items.low_stock_threshold then 'low_stock'
    else 'in_stock'
  end as status
from public.inventory_items
join public.inventory_products using (product_id)
where inventory_products.active;

revoke all on public.inventory_availability from public, anon, authenticated;
grant select on public.inventory_availability to anon, authenticated;

create or replace function public.save_inventory_product(
  p_product_id text,
  p_name text,
  p_kicker text,
  p_description text,
  p_image text,
  p_image_alt text,
  p_suited text,
  p_barcode text,
  p_low_stock_threshold integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_inventory_staff() then
    raise exception 'Only inventory staff can manage products';
  end if;
  if p_product_id is null or p_product_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or pg_catalog.length(p_product_id) > 60 then
    raise exception 'Product ID must be a lowercase URL-safe slug';
  end if;
  if p_name is null or pg_catalog.length(pg_catalog.btrim(p_name)) not between 1 and 80
    or p_name ~ '[[:cntrl:]]' then
    raise exception 'Product name must be between 1 and 80 characters';
  end if;
  if p_kicker is null or pg_catalog.length(p_kicker) > 40
    or p_description is null or pg_catalog.length(p_description) > 300
    or p_image is null or pg_catalog.length(pg_catalog.btrim(p_image)) not between 1 and 500
    or (p_image !~ '^https://[^[:space:]]+$' and p_image !~ '^product/[A-Za-z0-9._-]+$')
    or p_image_alt is null or pg_catalog.length(p_image_alt) > 200
    or p_suited is null or pg_catalog.length(p_suited) > 120 then
    raise exception 'Check product details and try again';
  end if;
  if p_barcode is null or p_barcode !~ '^[A-Z0-9][A-Z0-9-]{2,63}$' then
    raise exception 'Barcode must use 3–64 uppercase letters, digits, or hyphens';
  end if;
  if p_low_stock_threshold is null or p_low_stock_threshold not between 0 and 1000000 then
    raise exception 'Low stock threshold must be between 0 and 1000000';
  end if;

  insert into public.inventory_products (
    product_id, name, kicker, description, image, image_alt, suited, sort_order
  )
  values (
    p_product_id, pg_catalog.btrim(p_name), pg_catalog.btrim(p_kicker),
    pg_catalog.btrim(p_description), pg_catalog.btrim(p_image),
    pg_catalog.btrim(p_image_alt), pg_catalog.btrim(p_suited),
    coalesce((select pg_catalog.max(sort_order) + 1 from public.inventory_products), 1)
  )
  on conflict (product_id) do update
  set name = excluded.name,
      kicker = excluded.kicker,
      description = excluded.description,
      image = excluded.image,
      image_alt = excluded.image_alt,
      suited = excluded.suited,
      updated_at = now();

  insert into public.inventory_items (product_id, barcode, quantity_on_hand, low_stock_threshold)
  values (p_product_id, p_barcode, 0, p_low_stock_threshold)
  on conflict (product_id) do update
  set barcode = excluded.barcode,
      low_stock_threshold = excluded.low_stock_threshold,
      updated_at = now(),
      updated_by = auth.uid();
end;
$$;

create or replace function public.set_inventory_product_active(p_product_id text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_inventory_staff() then
    raise exception 'Only inventory staff can manage products';
  end if;
  if p_active is null then
    raise exception 'Choose whether to archive or restore the product';
  end if;
  update public.inventory_products
  set active = p_active, updated_at = now()
  where product_id = p_product_id;
  if not found then
    raise exception 'Product was not found';
  end if;
end;
$$;

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
    left join public.inventory_products products
      on products.product_id = input.product_id and products.active
    where input.product_id is null or products.product_id is null
      or input.quantity is null or input.quantity < 1 or input.quantity > 10000
  ) then
    raise exception 'Each received quantity must be between 1 and 10000 for an active product';
  end if;

  for line in
    select input.product_id, sum(input.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    group by input.product_id
    order by input.product_id
  loop
    update public.inventory_items
    set quantity_on_hand = quantity_on_hand + line.quantity,
        updated_at = now(), updated_by = auth.uid()
    where product_id = line.product_id
    returning * into updated_item;
    if not found then raise exception 'Inventory item % was not found', line.product_id; end if;

    insert into public.inventory_transactions (product_id, transaction_type, quantity, stock_after, created_by)
    values (updated_item.product_id, 'received', line.quantity, updated_item.quantity_on_hand, auth.uid());

    results := results || jsonb_build_array(jsonb_build_object(
      'product_id', updated_item.product_id, 'barcode', updated_item.barcode,
      'quantity_on_hand', updated_item.quantity_on_hand,
      'low_stock_threshold', updated_item.low_stock_threshold, 'updated_at', updated_item.updated_at
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
  if not public.is_inventory_staff() then raise exception 'Only the shop account can complete an inventory sale'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Sale items must be an array'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Add between 1 and 100 sale items';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    left join public.inventory_products products
      on products.product_id = input.product_id and products.active
    where input.product_id is null or products.product_id is null
      or input.quantity is null or input.quantity < 1 or input.quantity > 10000
  ) then raise exception 'Each sale quantity must be between 1 and 10000 for an active product'; end if;

  for line in
    select input.product_id, sum(input.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    group by input.product_id
    order by input.product_id
  loop
    update public.inventory_items
    set quantity_on_hand = quantity_on_hand - line.quantity,
        updated_at = now(), updated_by = auth.uid()
    where product_id = line.product_id and quantity_on_hand >= line.quantity
    returning * into updated_item;
    if not found then raise exception 'Not enough stock to complete the sale for %', line.product_id; end if;

    insert into public.inventory_transactions (product_id, transaction_type, quantity, stock_after, sale_id, created_by)
    values (updated_item.product_id, 'sale', line.quantity, updated_item.quantity_on_hand, sale_id, auth.uid());

    results := results || jsonb_build_array(jsonb_build_object(
      'product_id', updated_item.product_id, 'barcode', updated_item.barcode,
      'quantity_on_hand', updated_item.quantity_on_hand,
      'low_stock_threshold', updated_item.low_stock_threshold, 'updated_at', updated_item.updated_at
    ));
  end loop;
  return jsonb_build_object('sale_id', sale_id, 'items', results);
end;
$$;

revoke all on function public.save_inventory_product(text, text, text, text, text, text, text, text, integer) from public, anon;
grant execute on function public.save_inventory_product(text, text, text, text, text, text, text, text, integer) to authenticated;
revoke all on function public.set_inventory_product_active(text, boolean) from public, anon;
grant execute on function public.set_inventory_product_active(text, boolean) to authenticated;
revoke all on function public.receive_inventory(jsonb) from public, anon;
grant execute on function public.receive_inventory(jsonb) to authenticated;
revoke all on function public.complete_inventory_sale(jsonb) from public, anon;
grant execute on function public.complete_inventory_sale(jsonb) to authenticated;
