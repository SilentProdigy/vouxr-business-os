-- Vouxr Business OS — Foundation Schema
-- Governing invariants:
-- 1) every business-scoped row carries organization_id;
-- 2) inventory/stock quantity changes are represented by immutable movements;
-- 3) posted journals balance and are corrected through new entries, not mutation;
-- 4) RLS isolates organizations.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$ begin
  create type public.inventory_model as enum ('RECIPE_AND_STOCK', 'DIRECT_INVENTORY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_role as enum ('OWNER', 'ADMIN', 'ACCOUNTANT', 'CASHIER', 'INVENTORY_STAFF', 'VIEWER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_tracking_method as enum ('RECIPE', 'DIRECT', 'NONE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.record_status as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_movement_type as enum ('OPENING', 'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGED', 'TRANSFER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_movement_type as enum ('OPENING', 'PURCHASE', 'CONSUMPTION', 'WASTE', 'ADJUSTMENT', 'RETURN', 'TRANSFER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_category as enum ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.journal_status as enum ('DRAFT', 'POSTED', 'REVERSED');
exception when duplicate_object then null; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug = lower(slug)),
  inventory_model public.inventory_model not null,
  currency_code char(3) not null default 'PHP',
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.units (
  code text primary key,
  name text not null,
  dimension text not null check (dimension in ('VOLUME', 'WEIGHT', 'COUNT')),
  factor_to_base numeric(24, 10) not null check (factor_to_base > 0),
  base_code text not null
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  description text,
  image_url text,
  selling_price numeric(18, 4) not null default 0 check (selling_price >= 0),
  tax_rate numeric(9, 6) not null default 0 check (tax_rate >= 0),
  status public.record_status not null default 'ACTIVE',
  tracking_method public.product_tracking_method not null,
  direct_unit_code text references public.units(code),
  reorder_level numeric(18, 6) check (reorder_level is null or reorder_level >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku),
  unique (organization_id, barcode),
  constraint products_direct_fields check (
    tracking_method <> 'DIRECT'
    or (direct_unit_code is not null and reorder_level is not null)
  )
);

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  base_unit_code text not null references public.units(code),
  reorder_level numeric(18, 6) not null default 0 check (reorder_level >= 0),
  preferred_supplier_name text,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, product_id)
);

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version integer not null check (version > 0),
  yield_quantity numeric(18, 6) not null default 1 check (yield_quantity > 0),
  effective_at timestamptz not null default now(),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (recipe_id, version)
);

create unique index recipe_versions_one_active_per_recipe
  on public.recipe_versions(recipe_id)
  where is_active;

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipe_version_id uuid not null references public.recipe_versions(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  quantity numeric(18, 6) not null check (quantity > 0),
  unit_code text not null references public.units(code),
  converted_base_quantity numeric(18, 6) not null check (converted_base_quantity > 0),
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta numeric(18, 6) not null check (quantity_delta <> 0),
  unit_cost numeric(18, 6) check (unit_cost is null or unit_cost >= 0),
  source_type text,
  source_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity_delta numeric(18, 6) not null check (quantity_delta <> 0),
  unit_cost numeric(18, 6) check (unit_cost is null or unit_cost >= 0),
  source_type text,
  source_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category public.account_category not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (organization_id, starts_on, ends_on)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  entry_date date not null,
  reference text,
  memo text,
  source_type text,
  source_id uuid,
  status public.journal_status not null default 'DRAFT',
  posted_at timestamptz,
  posted_by uuid references auth.users(id) on delete set null,
  reversal_of_entry_id uuid references public.journal_entries(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  debit numeric(18, 4) not null default 0 check (debit >= 0),
  credit numeric(18, 4) not null default 0 check (credit >= 0),
  memo text,
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  session_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id);
create index products_org_idx on public.products(organization_id);
create index stock_items_org_idx on public.stock_items(organization_id);
create index inventory_movements_org_product_idx on public.inventory_movements(organization_id, product_id, created_at);
create index stock_movements_org_item_idx on public.stock_movements(organization_id, stock_item_id, created_at);
create index journal_entries_org_date_idx on public.journal_entries(organization_id, entry_date);
create index journal_lines_entry_idx on public.journal_lines(journal_entry_id);

insert into public.units(code, name, dimension, factor_to_base, base_code) values
  ('ml', 'Milliliter', 'VOLUME', 1, 'ml'),
  ('L', 'Liter', 'VOLUME', 1000, 'ml'),
  ('fl_oz', 'Fluid Ounce', 'VOLUME', 29.5735295625, 'ml'),
  ('cup', 'Cup', 'VOLUME', 236.5882365, 'ml'),
  ('tsp', 'Teaspoon', 'VOLUME', 4.92892159375, 'ml'),
  ('tbsp', 'Tablespoon', 'VOLUME', 14.78676478125, 'ml'),
  ('mg', 'Milligram', 'WEIGHT', 0.001, 'g'),
  ('g', 'Gram', 'WEIGHT', 1, 'g'),
  ('kg', 'Kilogram', 'WEIGHT', 1000, 'g'),
  ('oz', 'Ounce', 'WEIGHT', 28.349523125, 'g'),
  ('lb', 'Pound', 'WEIGHT', 453.59237, 'g'),
  ('piece', 'Piece', 'COUNT', 1, 'piece')
on conflict (code) do nothing;

create or replace function private.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1
       from public.organization_members m
       where m.organization_id = target_org_id
         and m.user_id = (select auth.uid())
     );
$$;

create or replace function private.has_org_role(target_org_id uuid, allowed_roles public.organization_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1
       from public.organization_members m
       where m.organization_id = target_org_id
         and m.user_id = (select auth.uid())
         and m.role = any(allowed_roles)
     );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, public.organization_role[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role[]) to authenticated;

create or replace function private.prevent_immutable_row_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'immutable ledger row: % operations are not allowed', tg_op;
end;
$$;

create or replace function private.enforce_posted_journal_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total_debit numeric(18,4);
  total_credit numeric(18,4);
begin
  if new.status = 'POSTED' and old.status is distinct from 'POSTED' then
    select coalesce(sum(debit),0), coalesce(sum(credit),0)
      into total_debit, total_credit
      from public.journal_lines
      where journal_entry_id = new.id;

    if total_debit <= 0 or total_debit <> total_credit then
      raise exception 'cannot post unbalanced journal entry: debits %, credits %', total_debit, total_credit;
    end if;

    new.posted_at := coalesce(new.posted_at, now());
    new.posted_by := coalesce(new.posted_by, (select auth.uid()));
  end if;

  if old.status = 'POSTED' and new is distinct from old then
    raise exception 'posted journal entries are immutable; create a reversal/correction entry';
  end if;

  return new;
end;
$$;

create trigger inventory_movements_immutable
before update or delete on public.inventory_movements
for each row execute function private.prevent_immutable_row_change();

create trigger stock_movements_immutable
before update or delete on public.stock_movements
for each row execute function private.prevent_immutable_row_change();

create trigger posted_journal_guard
before update on public.journal_entries
for each row execute function private.enforce_posted_journal_balance();

create or replace function private.prevent_posted_journal_line_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status public.journal_status;
begin
  select status into parent_status
  from public.journal_entries
  where id = coalesce(old.journal_entry_id, new.journal_entry_id);

  if parent_status = 'POSTED' then
    raise exception 'posted journal lines are immutable';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger journal_lines_posted_guard
before update or delete on public.journal_lines
for each row execute function private.prevent_posted_journal_line_change();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.categories enable row level security;
alter table public.units enable row level security;
alter table public.products enable row level security;
alter table public.stock_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.stock_movements enable row level security;
alter table public.accounts enable row level security;
alter table public.fiscal_periods enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.audit_logs enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select on public.units to authenticated;
grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.stock_items to authenticated;
grant select, insert, update on public.recipes to authenticated;
grant select, insert, update on public.recipe_versions to authenticated;
grant select, insert, update on public.recipe_items to authenticated;
grant select, insert on public.inventory_movements to authenticated;
grant select, insert on public.stock_movements to authenticated;
grant select, insert, update on public.accounts to authenticated;
grant select, insert, update on public.fiscal_periods to authenticated;
grant select, insert, update on public.journal_entries to authenticated;
grant select, insert, update, delete on public.journal_lines to authenticated;
grant select, insert on public.audit_logs to authenticated;

create policy profiles_self_select on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_insert on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_self_update on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy organizations_member_select on public.organizations
for select to authenticated using (private.is_org_member(id) or owner_user_id = (select auth.uid()));
create policy organizations_owner_insert on public.organizations
for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy organizations_admin_update on public.organizations
for update to authenticated using (
  owner_user_id = (select auth.uid())
  or private.has_org_role(id, array['OWNER','ADMIN']::public.organization_role[])
) with check (
  owner_user_id = (select auth.uid())
  or private.has_org_role(id, array['OWNER','ADMIN']::public.organization_role[])
);

create policy members_org_select on public.organization_members
for select to authenticated using (private.is_org_member(organization_id));
create policy members_owner_bootstrap_insert on public.organization_members
for insert to authenticated with check (
  (
    user_id = (select auth.uid())
    and role = 'OWNER'
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id
        and o.owner_user_id = (select auth.uid())
    )
  )
  or private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])
);
create policy members_admin_update on public.organization_members
for update to authenticated using (
  private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])
) with check (
  private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])
);
create policy members_admin_delete on public.organization_members
for delete to authenticated using (
  private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])
  and role <> 'OWNER'
);

create policy units_authenticated_select on public.units
for select to authenticated using (true);

-- Common tenant-scoped read policies.
create policy categories_org_select on public.categories for select to authenticated using (private.is_org_member(organization_id));
create policy products_org_select on public.products for select to authenticated using (private.is_org_member(organization_id));
create policy stock_items_org_select on public.stock_items for select to authenticated using (private.is_org_member(organization_id));
create policy recipes_org_select on public.recipes for select to authenticated using (private.is_org_member(organization_id));
create policy recipe_versions_org_select on public.recipe_versions for select to authenticated using (private.is_org_member(organization_id));
create policy recipe_items_org_select on public.recipe_items for select to authenticated using (private.is_org_member(organization_id));
create policy inventory_movements_org_select on public.inventory_movements for select to authenticated using (private.is_org_member(organization_id));
create policy stock_movements_org_select on public.stock_movements for select to authenticated using (private.is_org_member(organization_id));
create policy accounts_org_select on public.accounts for select to authenticated using (private.is_org_member(organization_id));
create policy fiscal_periods_org_select on public.fiscal_periods for select to authenticated using (private.is_org_member(organization_id));
create policy journal_entries_org_select on public.journal_entries for select to authenticated using (private.is_org_member(organization_id));
create policy journal_lines_org_select on public.journal_lines for select to authenticated using (private.is_org_member(organization_id));
create policy audit_logs_org_select on public.audit_logs for select to authenticated using (organization_id is not null and private.is_org_member(organization_id));

-- Catalog/setup writes.
create policy categories_inventory_write on public.categories for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy products_inventory_write on public.products for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy stock_items_inventory_write on public.stock_items for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy recipes_inventory_write on public.recipes for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy recipe_versions_inventory_write on public.recipe_versions for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy recipe_items_inventory_write on public.recipe_items for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));

create policy inventory_movements_insert on public.inventory_movements
for insert to authenticated with check (
  private.has_org_role(organization_id, array['OWNER','ADMIN','CASHIER','INVENTORY_STAFF']::public.organization_role[])
);
create policy stock_movements_insert on public.stock_movements
for insert to authenticated with check (
  private.has_org_role(organization_id, array['OWNER','ADMIN','CASHIER','INVENTORY_STAFF']::public.organization_role[])
);

create policy accounts_accounting_write on public.accounts for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));
create policy fiscal_periods_accounting_write on public.fiscal_periods for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));
create policy journal_entries_accounting_write on public.journal_entries for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));
create policy journal_lines_accounting_write on public.journal_lines for all to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));

create policy audit_logs_insert on public.audit_logs
for insert to authenticated with check (
  organization_id is not null
  and private.is_org_member(organization_id)
  and actor_user_id = (select auth.uid())
);

commit;
