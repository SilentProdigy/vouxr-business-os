import Link from "next/link";
import { ArrowLeft, PackageOpen, Plus, Tags } from "lucide-react";
import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/require-organization";
import { createStockCategoryAction, createStockItemAction, updateStockItemAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value ?? 0));
}

function quantity(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-PH", { maximumFractionDigits: 6 });
}

export default async function StocksPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = first(params.error);
  const message = first(params.message);
  const { supabase, organization, role } = await requireOrganization();

  if (organization.inventory_model !== "RECIPE_AND_STOCK") {
    redirect("/dashboard");
  }

  const [stocksResult, categoriesResult, unitsResult] = await Promise.all([
    supabase.from("stock_item_balances").select("*").eq("organization_id", organization.id).order("name"),
    supabase.from("stock_categories").select("id,name").eq("organization_id", organization.id).order("name"),
    supabase.from("units").select("code,name,dimension,factor_to_base,base_code").order("dimension").order("name"),
  ]);

  if (stocksResult.error) throw new Error(stocksResult.error.message);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  if (unitsResult.error) throw new Error(unitsResult.error.message);

  const stocks = stocksResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const units = unitsResult.data ?? [];
  const canManage = ["OWNER", "ADMIN", "INVENTORY_STAFF"].includes(role);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-sky-600">Ingredients / raw materials</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Stocks Management</h1>
          <p className="mt-2 text-sm text-slate-600">Current quantity is calculated from immutable stock movements, never overwritten.</p>
        </div>
        <Link href="/dashboard/units" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Unit reference</Link>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
      {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div> : null}

      {canManage ? (
        <section className="mt-7 grid gap-4 lg:grid-cols-[0.65fr_1.35fr]">
          <form action={createStockCategoryAction} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Tags className="h-5 w-5 text-sky-600" /><h2 className="font-black text-slate-950">New stock category</h2></div>
            <input name="name" required placeholder="Dairy" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <button className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Add category</button>
          </form>

          <form action={createStockItemAction} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Plus className="h-5 w-5 text-sky-600" /><h2 className="font-black text-slate-950">New stock item</h2></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input name="name" required placeholder="Full Cream Milk" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="sku" placeholder="SKU" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <select name="stock_category_id" className="rounded-2xl border border-slate-200 px-4 py-3"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <select name="base_unit_code" required defaultValue="ml" className="rounded-2xl border border-slate-200 px-4 py-3">{units.map((unit) => <option key={unit.code} value={unit.code}>{unit.name} ({unit.code})</option>)}</select>
              <input name="reorder_level" min="0" step="0.000001" type="number" defaultValue="0" placeholder="Reorder level" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="preferred_supplier_name" placeholder="Preferred supplier (optional)" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="opening_quantity" min="0" step="0.000001" type="number" defaultValue="0" placeholder="Opening quantity" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="opening_unit_cost" min="0" step="0.000001" type="number" placeholder="Opening unit cost" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <select name="status" defaultValue="ACTIVE" className="rounded-2xl border border-slate-200 px-4 py-3"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">Opening quantity creates an immutable OPENING movement. Later edits never overwrite quantity.</p>
            <button className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Create stock item</button>
          </form>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="flex items-center gap-2"><PackageOpen className="h-5 w-5 text-sky-600" /><h2 className="text-xl font-black text-slate-950">Stock items ({stocks.length})</h2></div>
        <div className="mt-4 space-y-3">
          {stocks.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">No ingredient stocks yet.</div> : stocks.map((stock) => {
            const isLow = Number(stock.current_quantity ?? 0) <= Number(stock.reorder_level ?? 0);
            return (
              <details key={stock.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none">
                  <div className="grid gap-3 sm:grid-cols-[1.2fr_0.65fr_0.65fr_0.65fr_0.55fr] sm:items-center">
                    <div><p className="font-black text-slate-950">{stock.name}</p><p className="text-xs font-semibold text-slate-500">{stock.sku || "No SKU"} · base {stock.base_unit_code}</p></div>
                    <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">On hand</p><p className="mt-1 font-black">{quantity(stock.current_quantity)} {stock.base_unit_code}</p></div>
                    <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Avg cost</p><p className="mt-1 font-black">{money(stock.average_cost)}</p></div>
                    <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Value</p><p className="mt-1 font-black">{money(stock.stock_value)}</p></div>
                    <div><span className={`rounded-full px-3 py-1 text-xs font-black ${isLow ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{isLow ? "LOW" : stock.status}</span></div>
                  </div>
                </summary>

                {canManage ? (
                  <form action={updateStockItemAction} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                    <input type="hidden" name="id" value={stock.id} />
                    <input name="name" required defaultValue={stock.name} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="sku" defaultValue={stock.sku ?? ""} placeholder="SKU" className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <select name="stock_category_id" defaultValue={stock.stock_category_id ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                    <select name="base_unit_code" defaultValue={stock.base_unit_code} className="rounded-2xl border border-slate-200 px-4 py-3">{units.map((unit) => <option key={unit.code} value={unit.code}>{unit.name} ({unit.code})</option>)}</select>
                    <input name="reorder_level" min="0" step="0.000001" type="number" defaultValue={Number(stock.reorder_level ?? 0)} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="preferred_supplier_name" defaultValue={stock.preferred_supplier_name ?? ""} placeholder="Preferred supplier" className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <select name="status" defaultValue={stock.status} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select>
                    <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Save stock item</button>
                  </form>
                ) : null}
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
