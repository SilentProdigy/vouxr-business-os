import Link from "next/link";
import {
  Boxes,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

const modules = [
  { name: "Sales & POS", description: "Walk-in, invoice, credit, split and partial payments.", icon: ReceiptText },
  { name: "Direct Inventory", description: "Movement-driven finished-good quantities and valuation.", icon: Boxes },
  { name: "Stocks & Recipes", description: "Ingredient consumption, costing, yields and availability.", icon: UtensilsCrossed },
  { name: "Purchasing", description: "POs, receiving, supplier bills and stock replenishment.", icon: PackageCheck },
  { name: "Accounting", description: "Balanced double-entry journals, AR/AP and fiscal periods.", icon: Calculator },
  { name: "Reports", description: "P&L, balance sheet, valuation, aging and profitability.", icon: ChartNoAxesCombined },
];

const invariants = [
  "Every business-scoped record carries organization_id.",
  "Stock changes only through immutable movement records.",
  "Posted journals must always balance: debits = credits.",
  "AI reads validated server results; it never invents ledger figures.",
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">Vouxr</p>
          <h1 className="mt-1 text-lg font-black tracking-tight text-slate-950">Business OS</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="grid gap-6 py-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
        <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-300/40 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
            <Sparkles className="h-4 w-4 text-sky-300" />
            Deterministic core · AI-assisted workflows
          </div>
          <h2 className="mt-7 max-w-3xl text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            One operating system for the numbers, stock, and decisions behind a business.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Vouxr combines accounting, direct inventory, ingredient stocks, recipes, purchasing,
            receivables, payables, reporting, and assisted intelligence without allowing AI to bypass
            the underlying business rules.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm font-bold text-slate-200">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            Multi-organization isolation is part of the data model, not an afterthought.
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Core contract</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">System invariants</h3>
            </div>
            <CircleDollarSign className="h-8 w-8 text-sky-600" />
          </div>
          <div className="mt-6 space-y-3">
            {invariants.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">V1 architecture</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Business modules</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ name, description, icon: Icon }) => (
            <article key={name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <h4 className="mt-5 text-lg font-black text-slate-950">{name}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t border-slate-200 py-6 text-sm font-semibold text-slate-500">
        Foundation first: reliable business data → reliable inventory → reliable accounting → reliable reporting → AI.
      </footer>
    </main>
  );
}
