'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-slate-700 shadow-2xl px-6 py-8 space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-7 w-7 text-red-300" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-red-400">
            Something Went Wrong
          </p>
          <h1 className="text-2xl font-bold text-white">We hit an unexpected error</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            This isn&apos;t your fault. Try again — if it keeps happening, contact{' '}
            <a href="mailto:support@alliance3dprints.com" className="text-red-400 underline underline-offset-2">
              support@alliance3dprints.com
            </a>
            .
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={reset}
            className="block w-full rounded-xl bg-red-500 hover:bg-red-600 px-4 py-3 text-sm font-semibold text-white transition"
          >
            Try again
          </button>
          <Link
            href="/"
            className="block w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
          >
            Go to home
          </Link>
        </div>
      </div>
    </main>
  );
}
