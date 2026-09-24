import Link from "next/link";
import {
  Boxes,
  Calculator,
  ChefHat,
  CircleDollarSign,
  LogOut,
  PackageCheck,
  ReceiptText,
  Ruler,
  Store,
} from "lucide-react";
import { requireOrganization } from "@/lib/auth/require-organization";
import { signOutAction } from "./actions";

export default async function DashboardPage() {
  const { supabase, organization } = await requireOrganization();

  const [productsResult, stocksResult, accountsResult] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
    supabase.from("stock_items").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
    supabase.from("accounts").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
  ]);

  const isRecipeBusiness = organization.inventory_model === "RECIPE_AND_STOCK";
  const modules = [
    { name: "Sales", detail: "POS, invoices, credit sales and payments", icon: ReceiptText, href: null },
    { name: "Products", detail: `${productsResult.count ?? 0} products configured`, icon: Store, href: "/dashboard/products" },
    { name: "Inventory", detail: "Direct-stock movements and valuation", icon: Boxes, href: null },
    ...(isRecipeBusiness
      ? [
          { name: "Stocks", detail: `${stocksResult.count ?? 0} ingredient items configured`, icon: PackageCheck, href: "/dashboard/stocks" },
          { name: "Recipes", detail: "Recipe versions, costing and availability", icon: ChefHat, href: null },
        ]
      : []),
    { name: "Units", detail: "Canonical volume, weight and count units", icon: Ruler, href: "/dashboard/units" },
    { name: "Accounting", detail: `${accountsResult.count ?? 0} chart-of-accounts entries`, icon: Calculator, href: null },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">Vouxr Business OS</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{organization.name}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {organization.inventory_model === "RECIPE_AND_STOCK" ? "Recipe + stock business" : "Direct inventory business"}
            {" · "}{organization.currency_code}{" · "}{organization.timezone}
          </p>
        </div>
        <form action={signOutAction}>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl bg-slate-950 p-6 text-white">
          <CircleDollarSign className="h-6 w-6 text-sky-300" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Foundation</p>
          <p className="mt-2 text-2xl font-black">Ready for catalog setup</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">Organization, roles, products, units, stocks, chart of accounts, and RLS are available locally.</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Business slug</p>
          <p className="mt-3 text-xl font-black text-slate-950">{organization.slug}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Accounting setup</p>
          <p className="mt-3 text-xl font-black text-slate-950">{accountsResult.count ?? 0} accounts</p>
          <p className="mt-2 text-sm text-slate-500">Default V1 chart of accounts seeded during onboarding.</p>
        </article>
      </section>

      <section className="mt-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Workspace</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Modules</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ name, detail, icon: Icon, href }) => {
            const content = (
              <>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100"><Icon className="h-5 w-5 text-slate-700" /></div>
                <h3 className="mt-5 text-lg font-black text-slate-950">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
                <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">{href ? "Open module" : "Coming next"}</p>
              </>
            );

            return href ? (
              <Link key={name} href={href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">{content}</Link>
            ) : (
              <article key={name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm opacity-75">{content}</article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
