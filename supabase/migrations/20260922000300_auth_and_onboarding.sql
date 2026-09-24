-- Vouxr Business OS — authentication/onboarding vertical slice
-- Creates a user's first organization atomically and seeds the V1 chart of accounts.

begin;

create or replace function public.create_organization_with_defaults(
  p_name text,
  p_slug text,
  p_inventory_model public.inventory_model
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_organization_id uuid;
  v_name text := trim(p_name);
  v_slug text := lower(trim(p_slug));
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if length(v_name) < 2 then
    raise exception 'business name must contain at least 2 characters' using errcode = '22023';
  end if;

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid business slug' using errcode = '22023';
  end if;

  insert into public.profiles (id, full_name)
  values (
    v_user_id,
    nullif((select auth.jwt()) -> 'user_metadata' ->> 'full_name', '')
  )
  on conflict (id) do update
  set full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();

  insert into public.organizations (
    owner_user_id,
    name,
    slug,
    inventory_model,
    currency_code,
    timezone
  )
  values (
    v_user_id,
    v_name,
    v_slug,
    p_inventory_model,
    'PHP',
    'Asia/Manila'
  )
  returning id into v_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'OWNER');

  insert into public.accounts (organization_id, code, name, category)
  values
    (v_organization_id, '1000', 'Cash', 'ASSET'),
    (v_organization_id, '1010', 'Bank', 'ASSET'),
    (v_organization_id, '1100', 'Accounts Receivable', 'ASSET'),
    (v_organization_id, '1200', 'Inventory', 'ASSET'),
    (v_organization_id, '1210', 'Ingredient Inventory', 'ASSET'),
    (v_organization_id, '1500', 'Equipment', 'ASSET'),
    (v_organization_id, '2000', 'Accounts Payable', 'LIABILITY'),
    (v_organization_id, '2100', 'Taxes Payable', 'LIABILITY'),
    (v_organization_id, '3000', 'Owner''s Equity', 'EQUITY'),
    (v_organization_id, '4000', 'Sales Revenue', 'REVENUE'),
    (v_organization_id, '4100', 'Other Income', 'REVENUE'),
    (v_organization_id, '5000', 'Cost of Goods Sold', 'COGS'),
    (v_organization_id, '6000', 'Rent', 'EXPENSE'),
    (v_organization_id, '6010', 'Utilities', 'EXPENSE'),
    (v_organization_id, '6020', 'Salaries', 'EXPENSE'),
    (v_organization_id, '6030', 'Marketing', 'EXPENSE'),
    (v_organization_id, '6040', 'Transportation', 'EXPENSE');

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_value
  )
  values (
    v_organization_id,
    v_user_id,
    'ORGANIZATION_CREATED',
    'organization',
    v_organization_id,
    jsonb_build_object(
      'name', v_name,
      'slug', v_slug,
      'inventory_model', p_inventory_model
    )
  );

  return v_organization_id;
end;
$$;

revoke all on function public.create_organization_with_defaults(text, text, public.inventory_model) from public, anon;
grant execute on function public.create_organization_with_defaults(text, text, public.inventory_model) to authenticated;

commit;
