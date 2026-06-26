// app/premium/[id]/page.tsx
'use client';

import Link from 'next/link';

type PremiumPageProps = {
  params: { id: string };
};

export default function PremiumPage({ params }: PremiumPageProps) {
  const shieldId = params.id;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-amber-500/40 shadow-2xl px-6 py-7 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/40">
            <span className="text-2xl">✦</span>
          </div>

          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-amber-500/10 text-amber-400 border border-amber-500/40">
            Silent Shield Premium
          </p>

          <h1 className="text-3xl font-bold text-white tracking-tight">
            Know when your shield is scanned
          </h1>

          <p className="text-sm text-slate-400">
            Real-time alerts, scan history, and peace of mind.
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-amber-400 font-bold">✦</span>
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Real-time scan alerts
                </p>
                <p className="text-xs text-slate-400">
                  Get an email the moment someone scans your shield
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-amber-400 font-bold">✦</span>
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Scan history dashboard
                </p>
                <p className="text-xs text-slate-400">
                  See every scan with timestamps and device info
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-amber-400 font-bold">✦</span>
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Multiple caregiver alerts
                </p>
                <p className="text-xs text-slate-400">
                  Notify both emergency contacts when scanned
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-slate-500 font-bold">✦</span>
              <div>
                <p className="text-sm font-semibold text-slate-400">
                  SMS alerts
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                    Coming soon
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  Text message notifications for faster response
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-slate-500 font-bold">✦</span>
              <div>
                <p className="text-sm font-semibold text-slate-400">
                  Location insights
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                    Coming soon
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  Approximate location data from scan events
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-end justify-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">$3.99</p>
              <p className="text-xs text-slate-400">/month</p>
            </div>

            <div className="text-center pb-0.5">
              <p className="text-xs text-slate-500">or</p>
            </div>

            <div className="text-center">
              <p className="text-3xl font-bold text-white">$39.99</p>
              <p className="text-xs text-slate-400">/year</p>
              <p className="text-[10px] text-amber-400 font-semibold">Save 16%</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-xs text-slate-300 leading-relaxed text-center">
            Your emergency profile is <strong className="text-white">always free</strong>.
            Premium adds monitoring and alerts on top — the profile itself is never limited.
          </p>
        </div>

        <button
          disabled
          className="w-full rounded-xl bg-amber-500 text-white text-center py-3 font-bold shadow-lg shadow-amber-500/20 opacity-60 cursor-not-allowed"
        >
          Payment Coming Soon
        </button>

        <p className="text-[11px] text-center text-slate-500">
          Stripe checkout integration is being finalized.
          Contact us to activate Premium early.
        </p>

        <Link
          href={`/edit/${shieldId}`}
          className="block text-xs text-center text-slate-400 hover:text-slate-200 underline underline-offset-2"
        >
          Back to edit profile
        </Link>
      </div>
    </main>
  );
}
