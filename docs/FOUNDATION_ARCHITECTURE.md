# Foundation Architecture

This phase implements the source-of-truth invariants before any POS or AI workflow is allowed to post business data.

## Boundaries

- **Tenant boundary:** every business-owned record carries `organization_id`; RLS resolves access through `organization_members`.
- **Inventory boundary:** direct products and ingredient stocks use separate immutable movement ledgers.
- **Recipe boundary:** recipes are versioned. A later sale service will persist the active `recipe_version_id` used for each recipe sale.
- **Accounting boundary:** operational transactions will call centralized posting services. A journal cannot transition to `POSTED` unless total debit equals total credit.
- **AI boundary:** AI tools will query deterministic server-side functions and may explain results; they will not calculate authoritative financial totals directly.

## First migration

`supabase/migrations/20260922000100_foundation.sql` creates:

- profiles, organizations, organization membership and preset roles
- units and conversion factors
- categories, products, ingredient stock items
- recipes, recipe versions, recipe items
- direct inventory and ingredient stock movement ledgers
- accounts, fiscal periods, journal entries and journal lines
- audit logs
- tenant-aware RLS policies and role helpers
- immutability guards for movement ledgers and posted journals

## Next slice

The next implementation slice should add organization onboarding + default chart of accounts, followed by product/stock/recipe CRUD and deterministic service functions for quantity-on-hand and recipe availability.
