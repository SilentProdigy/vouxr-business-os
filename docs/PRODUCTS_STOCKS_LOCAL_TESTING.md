# Products + Units + Stocks — Local Test Plan

This slice corresponds to Vouxr Business OS v0.3.0: Products + Stocks.

## Apply locally

With local Supabase running:

```bash
npx supabase db reset --local
npm run typecheck
npm run build
npm run dev
```

The reset should apply migrations through:

```text
20260922000400_products_units_stocks.sql
```

## Recipe + Stock business test

1. Sign in and open `/dashboard/products`.
2. Add a product category.
3. Create one `RECIPE` product, one `DIRECT` product, and one `NONE` product.
4. Confirm the direct product requires a unit and reorder level.
5. Open `/dashboard/stocks`.
6. Add a stock category such as `Dairy`.
7. Add `Full Cream Milk` with base unit `ml`, opening quantity `8000`, and an opening unit cost.
8. Confirm the displayed current quantity is `8000 ml`.
9. In local Supabase Studio, verify the quantity came from one immutable `OPENING` row in `stock_movements`.
10. Edit the stock item's name or reorder level and confirm quantity remains unchanged.
11. Open `/dashboard/units` and confirm universal volume/weight conversions have numeric factors while package units such as `box` and `pack` show as contextual.

## Direct Inventory business test

1. Reset local Supabase and create a `DIRECT_INVENTORY` organization.
2. Open `/dashboard/products`.
3. Confirm the `RECIPE` option is not offered.
4. Create `DIRECT` and `NONE` products.
5. Confirm `/dashboard/stocks` redirects back to the dashboard.

## Database invariants to verify

- Product rows contain the current organization's `organization_id`.
- A direct-inventory organization cannot persist a `RECIPE` product even if a request is forged.
- Stock item current quantity is derived from `stock_movements`; `stock_items` has no writable current-quantity field.
- Opening stock is represented by an immutable `OPENING` movement.
- Volume and weight use deterministic base-unit factors.
- Contextual count containers are not silently converted to pieces.
- RLS prevents reads and writes outside the signed-in user's organization.

## Scope intentionally deferred

The following remain for later roadmap slices:

- Recipe versions and recipe deduction engine
- Direct inventory opening/adjustment UI and valuation engine
- Purchasing-generated `PURCHASE` movements
- Waste/adjustment workflows
- Supplier master records
- Product variants
- Item-specific package conversions such as `1 box = 24 pieces`
