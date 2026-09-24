-- Vouxr Business OS — Foundation hardening
-- Resolves initial Supabase advisor findings after applying the foundation schema.

begin;

-- The project-level event trigger can remain SECURITY DEFINER, but it must not
-- be callable through the Data API by anon/authenticated clients.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute
      'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;

-- Replace FOR ALL policies with action-specific write policies so SELECT uses
-- only the tenant-scoped read policy.
drop policy if exists categories_inventory_write on public.categories;
create policy categories_inventory_insert on public.categories
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy categories_inventory_update on public.categories
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));

drop policy if exists products_inventory_write on public.products;
create policy products_inventory_insert on public.products
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy products_inventory_update on public.products
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));

drop policy if exists stock_items_inventory_write on public.stock_items;
create policy stock_items_inventory_insert on public.stock_items
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy stock_items_inventory_update on public.stock_items
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));

drop policy if exists recipes_inventory_write on public.recipes;
create policy recipes_inventory_insert on public.recipes
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy recipes_inventory_update on public.recipes
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));

drop policy if exists recipe_versions_inventory_write on public.recipe_versions;
create policy recipe_versions_inventory_insert on public.recipe_versions
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy recipe_versions_inventory_update on public.recipe_versions
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));

drop policy if exists recipe_items_inventory_write on public.recipe_items;
create policy recipe_items_inventory_insert on public.recipe_items
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));
create policy recipe_items_inventory_update on public.recipe_items
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','INVENTORY_STAFF']::public.organization_role[]));

drop policy if exists accounts_accounting_write on public.accounts;
create policy accounts_accounting_insert on public.accounts
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));
create policy accounts_accounting_update on public.accounts
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));

drop policy if exists fiscal_periods_accounting_write on public.fiscal_periods;
create policy fiscal_periods_accounting_insert on public.fiscal_periods
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));
create policy fiscal_periods_accounting_update on public.fiscal_periods
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));

drop policy if exists journal_entries_accounting_write on public.journal_entries;
create policy journal_entries_accounting_insert on public.journal_entries
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));
create policy journal_entries_accounting_update on public.journal_entries
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));

drop policy if exists journal_lines_accounting_write on public.journal_lines;
create policy journal_lines_accounting_insert on public.journal_lines
for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));
create policy journal_lines_accounting_update on public.journal_lines
for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]))
with check (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));
create policy journal_lines_accounting_delete on public.journal_lines
for delete to authenticated
using (private.has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']::public.organization_role[]));

-- Cover foreign keys used by tenant-scoped joins and FK enforcement.
create index if not exists audit_logs_organization_idx
  on public.audit_logs(organization_id);
create index if not exists audit_logs_actor_user_idx
  on public.audit_logs(actor_user_id);
create index if not exists inventory_movements_created_by_idx
  on public.inventory_movements(created_by);
create index if not exists journal_entries_posted_by_idx
  on public.journal_entries(posted_by);
create index if not exists journal_entries_reversal_org_idx
  on public.journal_entries(organization_id, reversal_of_entry_id);
create index if not exists journal_lines_org_entry_idx
  on public.journal_lines(organization_id, journal_entry_id);
create index if not exists journal_lines_org_account_idx
  on public.journal_lines(organization_id, account_id);
create index if not exists organizations_owner_user_idx
  on public.organizations(owner_user_id);
create index if not exists products_org_category_idx
  on public.products(organization_id, category_id);
create index if not exists products_direct_unit_idx
  on public.products(direct_unit_code);
create index if not exists recipe_items_org_version_idx
  on public.recipe_items(organization_id, recipe_version_id);
create index if not exists recipe_items_org_stock_idx
  on public.recipe_items(organization_id, stock_item_id);
create index if not exists recipe_items_unit_idx
  on public.recipe_items(unit_code);
create index if not exists recipe_versions_org_recipe_idx
  on public.recipe_versions(organization_id, recipe_id);
create index if not exists stock_items_base_unit_idx
  on public.stock_items(base_unit_code);
create index if not exists stock_movements_created_by_idx
  on public.stock_movements(created_by);

commit;
