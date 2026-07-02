import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-slate-700 shadow-2xl px-6 py-8 space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10">
          <div className="flex items-center justify-center gap-1">
            <span className="block h-4 w-1.5 rounded-full bg-red-300/90" />
            <span className="block h-6 w-1.5 rounded-full bg-red-300/70" />
            <span className="block h-8 w-1.5 rounded-full bg-red-300/50" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-red-400">
            Page Not Found
          </p>
          <h1 className="text-2xl font-bold text-white">This page doesn&apos;t exist</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The link may be mistyped or the page may have moved. If you scanned a
            Silent Shield and landed here, try scanning it again.
          </p>
        </div>

        <Link
          href="/"
          className="block w-full rounded-xl bg-red-500 hover:bg-red-600 px-4 py-3 text-sm font-semibold text-white transition"
        >
          Go to Silent Shield home
        </Link>
      </div>
    </main>
  );
}
