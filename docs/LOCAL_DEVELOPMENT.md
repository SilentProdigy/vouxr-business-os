# Local Development

This project is designed to be tested against a local Supabase stack before changes are pushed remotely.

## 1. Work from the foundation branch

If the foundation PR has not been merged into `main` yet:

```bash
git fetch origin
git switch foundation
```

Keep the authentication/onboarding changes uncommitted while testing if you want a fully local-first workflow.

## 2. Install dependencies

```bash
npm install
```

The repository pins package versions. `npm install` creates `package-lock.json`; keep it once the local build is confirmed.

## 3. Start local Supabase

Docker Desktop (or another Docker-compatible runtime) must be running.

```bash
npx supabase start
```

Then inspect the local credentials:

```bash
npx supabase status
```

## 4. Reset the local database

Apply every migration from a clean database:

```bash
npx supabase db reset
```

This is destructive to the **local** Supabase database only.

## 5. Configure the local app environment

Create `.env.local`:

```env
NEXT_PUBLIC_APP_NAME=Vouxr Business OS
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local public/publishable or anon key from supabase status>
```

The local public/anon client key is intentionally stored in the browser-facing variable. Never put a secret/service-role key in a `NEXT_PUBLIC_` variable.

## 6. Run static checks and the app

```bash
npm run typecheck
npm run build
npm run dev
```

Open `http://localhost:3000`.

## 7. Test the vertical slice

1. Open `/signup` and create a local user.
2. You should land on `/onboarding` because local email confirmation is disabled in `supabase/config.toml`.
3. Create a recipe-based business.
4. Confirm `/dashboard` shows Stocks and Recipes and reports 17 chart-of-accounts entries.
5. Sign out and sign back in.
6. Confirm you return to `/dashboard` rather than onboarding.
7. Reset the local DB, repeat with `DIRECT_INVENTORY`, and confirm Stocks and Recipes are hidden.

## 8. Verify the database locally

Use local Supabase Studio (the URL is shown by `npx supabase status`) and verify:

- `organizations`: one row for the business
- `organization_members`: the signed-in user has role `OWNER`
- `accounts`: 17 rows for the organization
- `audit_logs`: one `ORGANIZATION_CREATED` entry
- all business rows carry the same `organization_id`

Also test that creating a second business with the same slug fails.

## 9. Before committing

Do not push until all of these pass:

```bash
npm run typecheck
npm run build
```

Then review:

```bash
git status
git diff
```

Commit `package-lock.json` together with the source once dependency installation and the build are confirmed.
