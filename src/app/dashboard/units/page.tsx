import Link from "next/link";
import { ArrowLeft, Ruler } from "lucide-react";
import { requireOrganization } from "@/lib/auth/require-organization";

export default async function UnitsPage() {
  const { supabase } = await requireOrganization();
  const { data: units, error } = await supabase
    .from("units")
    .select("code,name,dimension,factor_to_base,base_code")
    .order("dimension")
    .order("name");

  if (error) throw new Error(error.message);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="mt-5 flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-100"><Ruler className="h-6 w-6 text-sky-700" /></div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">Conversion engine</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950">Units</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Volume converts through ml; weight converts through g. Container count units are contextual and are not silently treated as equivalent to pieces.</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Dimension</th><th className="px-5 py-4">Base</th><th className="px-5 py-4">Factor to base</th></tr></thead>
          <tbody>
            {(units ?? []).map((unit) => (
              <tr key={unit.code} className="border-t border-slate-100">
                <td className="px-5 py-4"><p className="font-black text-slate-950">{unit.name}</p><p className="text-xs font-semibold text-slate-500">{unit.code}</p></td>
                <td className="px-5 py-4 font-bold text-slate-700">{unit.dimension}</td>
                <td className="px-5 py-4 font-bold text-slate-700">{unit.base_code}</td>
                <td className="px-5 py-4 font-bold text-slate-700">{unit.factor_to_base === null ? "Contextual" : Number(unit.factor_to_base).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
