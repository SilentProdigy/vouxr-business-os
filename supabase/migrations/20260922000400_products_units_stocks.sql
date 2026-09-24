-- Vouxr Business OS — Products + Units + Stocks (v0.3.0)
-- Adds stock categories, safe unit conversion, derived inventory/stock balances,
-- product tracking validation, and an atomic stock-item opening balance workflow.

begin;

create table public.stock_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, name)
);

alter table public.stock_items
  add column if not exists stock_category_id uuid;

alter table public.stock_items
  add constraint stock_items_category_org_fk
  foreign key (organization_id, stock_category_id)
  references public.stock_categories(organization_id, id)
  on delete set null;

create index if not exists stock_categories_org_idx
  on public.stock_categories(organization_id);
create index if not exists stock_items_org_category_idx
  on public.stock_items(organization_id, stock_category_id);

-- Count containers are valid base units, but their conversion to another count unit
-- is contextual (for example, one "box" may contain a different number of pieces
-- depending on the item). A null factor intentionally prevents unsafe universal conversion.
alter table public.units
  alter column factor_to_base drop not null;

insert into public.units(code, name, dimension, factor_to_base, base_code) values
  ('pack', 'Pack', 'COUNT', null, 'piece'),
  ('box', 'Box', 'COUNT', null, 'piece'),
  ('bottle', 'Bottle', 'COUNT', null, 'piece'),
  ('can', 'Can', 'COUNT', null, 'piece'),
  ('bag', 'Bag', 'COUNT', null, 'piece'),
  ('tray', 'Tray', 'COUNT', null, 'piece')
on conflict (code) do nothing;

create or replace function public.convert_unit_quantity(
  p_quantity numeric,
  p_from_unit text,
  p_to_unit text
)
returns numeric
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_from public.units%rowtype;
  v_to public.units%rowtype;
begin
  if p_quantity is null then
    return null;
  end if;

  if p_from_unit = p_to_unit then
    return p_quantity;
  end if;

  select * into v_from from public.units where code = p_from_unit;
  select * into v_to from public.units where code = p_to_unit;

  if v_from.code is null or v_to.code is null then
    raise exception 'unknown unit conversion: % to %', p_from_unit, p_to_unit
      using errcode = '22023';
  end if;

  if v_from.dimension <> v_to.dimension then
    raise exception 'cannot convert between % and % dimensions', v_from.dimension, v_to.dimension
      using errcode = '22023';
  end if;

  if v_from.factor_to_base is null or v_to.factor_to_base is null then
    raise exception 'conversion between contextual count units requires an item-specific conversion'
      using errcode = '22023';
  end if;

  return p_quantity * v_from.factor_to_base / v_to.factor_to_base;
end;
$$;

revoke all on function public.convert_unit_quantity(numeric, text, text) from public, anon;
grant execute on function public.convert_unit_quantity(numeric, text, text) to authenticated;

create or replace function private.validate_product_tracking()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_inventory_model public.inventory_model;
begin
  select inventory_model
    into v_inventory_model
    from public.organizations
    where id = new.organization_id;

  if v_inventory_model is null then
    raise exception 'organization not found' using errcode = '23503';
  end if;

  if v_inventory_model = 'DIRECT_INVENTORY' and new.tracking_method = 'RECIPE' then
    raise exception 'recipe-tracked products are not available for direct-inventory organizations'
      using errcode = '22023';
  end if;

  if new.tracking_method = 'DIRECT' then
    if new.direct_unit_code is null or new.reorder_level is null then
      raise exception 'direct products require a unit and reorder level'
        using errcode = '22023';
    end if;
  else
    new.direct_unit_code := null;
    new.reorder_level := null;
  end if;

  return new;
end;
$$;

drop trigger if exists products_tracking_guard on public.products;
create trigger products_tracking_guard
before insert or update on public.products
for each row execute function private.validate_product_tracking();

create or replace view public.product_inventory_balances
with (security_invoker = true)
as
select
  p.id,
  p.organization_id,
  p.category_id,
  p.name,
  p.sku,
  p.barcode,
  p.description,
  p.image_url,
  p.selling_price,
  p.tax_rate,
  p.status,
  p.tracking_method,
  p.direct_unit_code,
  p.reorder_level,
  p.created_at,
  p.updated_at,
  coalesce(sum(m.quantity_delta), 0)::numeric(18,6) as current_quantity,
  coalesce(sum(m.quantity_delta * coalesce(m.unit_cost, 0)), 0)::numeric(18,4) as inventory_value,
  case
    when coalesce(sum(m.quantity_delta), 0) > 0
      then (sum(m.quantity_delta * coalesce(m.unit_cost, 0)) / sum(m.quantity_delta))::numeric(18,6)
    else 0::numeric
  end as average_cost
from public.products p
left join public.inventory_movements m
  on m.organization_id = p.organization_id
 and m.product_id = p.id
group by p.id;

grant select on public.product_inventory_balances to authenticated;

create or replace view public.stock_item_balances
with (security_invoker = true)
as
select
  s.id,
  s.organization_id,
  s.stock_category_id,
  s.name,
  s.sku,
  s.category,
  s.base_unit_code,
  s.reorder_level,
  s.preferred_supplier_name,
  s.status,
  s.created_at,
  s.updated_at,
  coalesce(sum(m.quantity_delta), 0)::numeric(18,6) as current_quantity,
  coalesce(sum(m.quantity_delta * coalesce(m.unit_cost, 0)), 0)::numeric(18,4) as stock_value,
  case
    when coalesce(sum(m.quantity_delta), 0) > 0
      then (sum(m.quantity_delta * coalesce(m.unit_cost, 0)) / sum(m.quantity_delta))::numeric(18,6)
    else 0::numeric
  end as average_cost,
  (
    select sm.unit_cost
    from public.stock_movements sm
    where sm.organization_id = s.organization_id
      and sm.stock_item_id = s.id
      and sm.movement_type = 'PURCHASE'
      and sm.unit_cost is not null
    order by sm.created_at desc, sm.id desc
    limit 1
  ) as last_purchase_cost
from public.stock_items s
left join public.stock_movements m
  on m.organization_id = s.organization_id
 and m.stock_item_id = s.id
group by s.id;

grant select on public.stock_item_balances to authenticated;

create or replace function public.create_stock_item_with_opening_balance(
  p_organization_id uuid,
  p_name text,
  p_sku text,
  p_stock_category_id uuid,
  p_base_unit_code text,
  p_reorder_level numeric,
  p_preferred_supplier_name text,
  p_status public.record_status,
  p_opening_quantity numeric default 0,
  p_opening_unit_cost numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_stock_item_id uuid;
  v_inventory_model public.inventory_model;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not private.has_org_role(
    p_organization_id,
    array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]
  ) then
    raise exception 'insufficient organization permission' using errcode = '42501';
  end if;

  select inventory_model into v_inventory_model
  from public.organizations
  where id = p_organization_id;

  if v_inventory_model <> 'RECIPE_AND_STOCK' then
    raise exception 'ingredient stock management is only available for recipe-and-stock organizations'
      using errcode = '22023';
  end if;

  if length(trim(p_name)) < 1 then
    raise exception 'stock item name is required' using errcode = '22023';
  end if;

  if p_reorder_level is null or p_reorder_level < 0 then
    raise exception 'reorder level must be zero or greater' using errcode = '22023';
  end if;

  if coalesce(p_opening_quantity, 0) < 0 then
    raise exception 'opening quantity cannot be negative' using errcode = '22023';
  end if;

  if p_opening_unit_cost is not null and p_opening_unit_cost < 0 then
    raise exception 'opening unit cost cannot be negative' using errcode = '22023';
  end if;

  insert into public.stock_items (
    organization_id,
    stock_category_id,
    name,
    sku,
    base_unit_code,
    reorder_level,
    preferred_supplier_name,
    status
  )
  values (
    p_organization_id,
    p_stock_category_id,
    trim(p_name),
    nullif(trim(p_sku), ''),
    p_base_unit_code,
    p_reorder_level,
    nullif(trim(p_preferred_supplier_name), ''),
    coalesce(p_status, 'ACTIVE')
  )
  returning id into v_stock_item_id;

  if coalesce(p_opening_quantity, 0) > 0 then
    insert into public.stock_movements (
      organization_id,
      stock_item_id,
      movement_type,
      quantity_delta,
      unit_cost,
      source_type,
      source_id,
      note,
      created_by
    )
    values (
      p_organization_id,
      v_stock_item_id,
      'OPENING',
      p_opening_quantity,
      p_opening_unit_cost,
      'STOCK_ITEM_SETUP',
      v_stock_item_id,
      'Opening balance',
      v_user_id
    );
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_value
  )
  values (
    p_organization_id,
    v_user_id,
    'STOCK_ITEM_CREATED',
    'stock_item',
    v_stock_item_id,
    jsonb_build_object(
      'name', trim(p_name),
      'sku', nullif(trim(p_sku), ''),
      'base_unit_code', p_base_unit_code,
      'opening_quantity', coalesce(p_opening_quantity, 0),
      'opening_unit_cost', p_opening_unit_cost
    )
  );

  return v_stock_item_id;
end;
$$;

revoke all on function public.create_stock_item_with_opening_balance(
  uuid, text, text, uuid, text, numeric, text, public.record_status, numeric, numeric
) from public, anon;
grant execute on function public.create_stock_item_with_opening_balance(
  uuid, text, text, uuid, text, numeric, text, public.record_status, numeric, numeric
) to authenticated;

alter table public.stock_categories enable row level security;
grant select, insert, update on public.stock_categories to authenticated;

create policy stock_categories_org_select on public.stock_categories
for select to authenticated
using (private.is_org_member(organization_id));

create policy stock_categories_inventory_insert on public.stock_categories
for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]
  )
);

create policy stock_categories_inventory_update on public.stock_categories
for update to authenticated
using (
  private.has_org_role(
    organization_id,
    array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]
  )
);

commit;
