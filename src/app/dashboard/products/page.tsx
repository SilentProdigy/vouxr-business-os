import Link from "next/link";
import { ArrowLeft, Boxes, Plus, Tags } from "lucide-react";
import { requireOrganization } from "@/lib/auth/require-organization";
import { createCategoryAction, createProductAction, updateProductAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value ?? 0));
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = first(params.error);
  const message = first(params.message);
  const { supabase, organization, role } = await requireOrganization();

  const [productsResult, categoriesResult, unitsResult] = await Promise.all([
    supabase
      .from("product_inventory_balances")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name"),
    supabase.from("categories").select("id,name").eq("organization_id", organization.id).order("name"),
    supabase.from("units").select("code,name,dimension,factor_to_base,base_code").order("dimension").order("name"),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  if (unitsResult.error) throw new Error(unitsResult.error.message);

  const products = productsResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const units = unitsResult.data ?? [];
  const canManage = ["OWNER", "ADMIN", "INVENTORY_STAFF"].includes(role);
  const recipeAllowed = organization.inventory_model === "RECIPE_AND_STOCK";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-sky-600">Catalog</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Products</h1>
          <p className="mt-2 text-sm text-slate-600">Recipe, direct-stock, and non-stock/service products.</p>
        </div>
        <Link href="/dashboard/units" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">
          Unit reference
        </Link>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
      {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div> : null}

      {canManage ? (
        <section className="mt-7 grid gap-4 lg:grid-cols-[0.65fr_1.35fr]">
          <form action={createCategoryAction} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-sky-600" />
              <h2 className="font-black text-slate-950">New category</h2>
            </div>
            <input name="name" required placeholder="Beverages" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <button className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Add category</button>
          </form>

          <form action={createProductAction} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-sky-600" />
              <h2 className="font-black text-slate-950">New product</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input name="name" required placeholder="Product name" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="sku" placeholder="SKU" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="barcode" placeholder="Barcode" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <select name="category_id" className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="">No category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <input name="selling_price" required min="0" step="0.01" type="number" placeholder="Selling price" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="tax_percent" min="0" step="0.01" type="number" defaultValue="0" placeholder="Tax %" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <select name="tracking_method" defaultValue={recipeAllowed ? "RECIPE" : "DIRECT"} className="rounded-2xl border border-slate-200 px-4 py-3">
                {recipeAllowed ? <option value="RECIPE">Recipe</option> : null}
                <option value="DIRECT">Direct inventory</option>
                <option value="NONE">No stock / service</option>
              </select>
              <select name="direct_unit_code" className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="">Direct unit (DIRECT only)</option>
                {units.map((unit) => <option key={unit.code} value={unit.code}>{unit.name} ({unit.code})</option>)}
              </select>
              <input name="reorder_level" min="0" step="0.000001" type="number" defaultValue="0" placeholder="Reorder level (DIRECT)" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <select name="status" defaultValue="ACTIVE" className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option>
              </select>
              <textarea name="description" placeholder="Description" className="min-h-12 rounded-2xl border border-slate-200 px-4 py-3 sm:col-span-2" />
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">Unit and reorder level are used only when tracking method is DIRECT.</p>
            <button className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Create product</button>
          </form>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-sky-600" />
          <h2 className="text-xl font-black text-slate-950">Catalog ({products.length})</h2>
        </div>
        <div className="mt-4 space-y-3">
          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">No products yet.</div>
          ) : products.map((product) => (
            <details key={product.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer list-none">
                <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr_0.7fr_0.6fr] sm:items-center">
                  <div><p className="font-black text-slate-950">{product.name}</p><p className="text-xs font-semibold text-slate-500">{product.sku || "No SKU"} · {product.tracking_method}</p></div>
                  <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Price</p><p className="mt-1 font-black">{money(product.selling_price)}</p></div>
                  <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">On hand</p><p className="mt-1 font-black">{Number(product.current_quantity ?? 0).toLocaleString()}</p></div>
                  <div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{product.status}</span></div>
                </div>
              </summary>

              {canManage ? (
                <form action={updateProductAction} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="hidden" name="id" value={product.id} />
                  <input name="name" required defaultValue={product.name} className="rounded-2xl border border-slate-200 px-4 py-3" />
                  <input name="sku" defaultValue={product.sku ?? ""} placeholder="SKU" className="rounded-2xl border border-slate-200 px-4 py-3" />
                  <input name="barcode" defaultValue={product.barcode ?? ""} placeholder="Barcode" className="rounded-2xl border border-slate-200 px-4 py-3" />
                  <select name="category_id" defaultValue={product.category_id ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                  <input name="selling_price" min="0" step="0.01" type="number" required defaultValue={Number(product.selling_price)} className="rounded-2xl border border-slate-200 px-4 py-3" />
                  <input name="tax_percent" min="0" step="0.01" type="number" defaultValue={Number(product.tax_rate ?? 0) * 100} className="rounded-2xl border border-slate-200 px-4 py-3" />
                  <select name="tracking_method" defaultValue={product.tracking_method} className="rounded-2xl border border-slate-200 px-4 py-3">{recipeAllowed ? <option value="RECIPE">Recipe</option> : null}<option value="DIRECT">Direct inventory</option><option value="NONE">No stock / service</option></select>
                  <select name="direct_unit_code" defaultValue={product.direct_unit_code ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="">Direct unit (DIRECT only)</option>{units.map((unit) => <option key={unit.code} value={unit.code}>{unit.name} ({unit.code})</option>)}</select>
                  <input name="reorder_level" min="0" step="0.000001" type="number" defaultValue={Number(product.reorder_level ?? 0)} className="rounded-2xl border border-slate-200 px-4 py-3" />
                  <select name="status" defaultValue={product.status} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select>
                  <textarea name="description" defaultValue={product.description ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3 sm:col-span-2" />
                  <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Save product</button>
                </form>
              ) : null}
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
