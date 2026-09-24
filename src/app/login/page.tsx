import Link from "next/link";
import { loginAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = first(params.error);
  const message = first(params.message);

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-600">Vouxr Business OS</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Access your organization, accounting, inventory, and reports.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        ) : null}

        <form action={loginAction} className="mt-7 space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-sky-500 transition focus:ring-2"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-sky-500 transition focus:ring-2"
            />
          </label>
          <button className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to Vouxr?{" "}
          <Link className="font-black text-sky-700 hover:text-sky-600" href="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
