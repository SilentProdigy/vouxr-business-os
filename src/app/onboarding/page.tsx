import { redirect } from "next/navigation";
import { Boxes, ChefHat } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { createOrganizationAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = first(params.error);
  const { supabase } = await requireUser();
  const { data: existingOrganizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  if (organizationsError) {
    throw new Error(`Unable to load organizations: ${organizationsError.message}`);
  }

  if (existingOrganizations && existingOrganizations.length > 0) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-600">Business onboarding</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950">
          Configure how this business tracks stock.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          This choice controls which inventory workflows are enabled. Recipe businesses can still sell
          direct-stock products.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <form action={createOrganizationAction} className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">
              Business name
              <input
                name="name"
                required
                minLength={2}
                placeholder="North Street Coffee"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-sky-500 transition focus:ring-2"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Business slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="north-street-coffee"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-sky-500 transition focus:ring-2"
              />
              <span className="mt-1 block text-xs font-medium text-slate-400">
                Lowercase letters, numbers, and hyphens only.
              </span>
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-black text-slate-950">Inventory model</legend>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm has-[:checked]:border-sky-500 has-[:checked]:ring-2 has-[:checked]:ring-sky-100">
                <input
                  className="sr-only"
                  type="radio"
                  name="inventory_model"
                  value="RECIPE_AND_STOCK"
                  defaultChecked
                />
                <ChefHat className="h-6 w-6 text-sky-600" />
                <span className="mt-4 block text-lg font-black text-slate-950">Ingredients / Recipe-Based</span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  For cafés, restaurants, bakeries, catering, food stalls, and other businesses where
                  finished products consume ingredients.
                </span>
              </label>

              <label className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm has-[:checked]:border-sky-500 has-[:checked]:ring-2 has-[:checked]:ring-sky-100">
                <input
                  className="sr-only"
                  type="radio"
                  name="inventory_model"
                  value="DIRECT_INVENTORY"
                />
                <Boxes className="h-6 w-6 text-sky-600" />
                <span className="mt-4 block text-lg font-black text-slate-950">Direct Inventory</span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  For retail, convenience stores, clothing, electronics, hardware, resellers, and
                  general merchandise where products themselves are stocked.
                </span>
              </label>
            </div>
          </fieldset>

          <button className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 sm:w-auto">
            Create business workspace
          </button>
        </form>
      </div>
    </main>
  );
}
