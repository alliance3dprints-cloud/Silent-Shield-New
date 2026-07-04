'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Stats = {
  activatedShields: number;
  claimedShields: number;
  uniqueOwners: number;
  activeSubscribers: number;
  monthly: number;
  annual: number;
  pastDue: number;
  mrr: number;
  totalScans: number;
  alertsSent: number;
  scans7d: number;
  marketingOptIns: number;
};

export default function AdminPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'signin'>('loading');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState('signin'); return; }

      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 403) { setState('denied'); return; }
      if (!res.ok) { setState('denied'); return; }

      setStats(await res.json());
      setState('ok');
    }
    load();
  }, []);

  if (state === 'loading') {
    return <Centered><p className="text-sm text-slate-400">Loading…</p></Centered>;
  }
  if (state === 'signin') {
    return (
      <Centered>
        <div className="text-center space-y-3">
          <p className="text-sm text-slate-300">Sign in to view the admin dashboard.</p>
          <Link href="/account/login?redirect=/admin" className="inline-block rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-semibold text-white">Sign In</Link>
        </div>
      </Centered>
    );
  }
  if (state === 'denied') {
    return (
      <Centered>
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-slate-200">Not authorized</p>
          <p className="text-xs text-slate-500 max-w-xs">This dashboard is admin-only. Add your email to the ADMIN_EMAILS environment variable.</p>
        </div>
      </Centered>
    );
  }

  const s = stats!;
  const claimRate = s.activatedShields ? Math.round((s.claimedShields / s.activatedShields) * 100) : 0;
  const paidRate = s.uniqueOwners ? Math.round((s.activeSubscribers / s.uniqueOwners) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-red-400">Silent Shield</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h1>
          </div>
          <Link href="/account" className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2">My Account</Link>
        </header>

        {/* Revenue */}
        <section className="rounded-2xl border border-red-500/30 bg-gradient-to-b from-slate-950 to-slate-900 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Monthly Recurring Revenue</p>
          <p className="mt-1 text-4xl font-bold text-white tabular-nums">${s.mrr.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {s.activeSubscribers} active {s.activeSubscribers === 1 ? 'subscriber' : 'subscribers'}
            {' · '}{s.monthly} monthly · {s.annual} annual
            {s.pastDue > 0 && <span className="text-yellow-400"> · {s.pastDue} past due</span>}
          </p>
        </section>

        {/* Core funnel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Activated Shields" value={s.activatedShields} />
          <Stat label="Claimed" value={s.claimedShields} sub={`${claimRate}% of activated`} />
          <Stat label="Owners" value={s.uniqueOwners} />
          <Stat label="Premium" value={s.activeSubscribers} sub={`${paidRate}% of owners`} accent />
          <Stat label="Scans (7 days)" value={s.scans7d} />
          <Stat label="Alerts Sent" value={s.alertsSent} />
        </div>

        {/* Secondary */}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Total Scans Logged" value={s.totalScans} />
          <Stat label="Marketing Opt-ins" value={s.marketingOptIns} />
        </div>

        <p className="text-center text-[11px] text-slate-600">
          Live from your database · refresh to update
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-red-500/40 bg-red-500/5' : 'border-slate-700 bg-slate-800/50'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white tabular-nums">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4">{children}</main>;
}
