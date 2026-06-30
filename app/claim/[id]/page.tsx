// app/claim/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type ClaimPageProps = {
  params: { id: string };
};

const inputClassName =
  'w-full border border-slate-700 bg-slate-900/60 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/60';

export default function ClaimShieldPage({ params }: ClaimPageProps) {
  const shieldId = params.id;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) {
        window.location.href = `/account/login?claim=${shieldId}`;
        return;
      }
      setUser(authUser);
      setLoading(false);
    });
  }, [shieldId]);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pinInput) {
      setError('Please enter your edit PIN to verify ownership.');
      return;
    }

    setStatus('claiming');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please sign in again.');
        setStatus('error');
        return;
      }

      const res = await fetch('/api/shield/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ shieldId, pin: pinInput }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error === 'Incorrect PIN' ? 'Incorrect PIN. Please try again.' : body.error || 'Failed to claim shield. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setError('Could not claim shield. Please check your connection and try again.');
      setStatus('error');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  if (status === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-6">
        <div className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-xl px-6 py-7 space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/40">
            <span className="text-3xl text-emerald-300">✓</span>
          </div>

          <h1 className="text-2xl font-bold text-white">Shield Claimed</h1>

          <p className="text-sm text-slate-300">
            This Silent Shield is now linked to <span className="font-semibold text-white">{user?.email}</span>.
          </p>

          <p className="text-xs text-slate-400">
            You can now manage this shield from your account dashboard,
            and recover your PIN if you ever forget it.
          </p>

          <div className="space-y-3 pt-2">
            <Link
              href="/account"
              className="block w-full rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition"
            >
              Go to My Account
            </Link>

            <Link
              href={`/edit/${shieldId}`}
              className="block w-full text-center rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              Edit This Shield
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-slate-700 shadow-xl px-6 py-7 space-y-5">
        <div className="flex justify-center mt-2">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-red-500/10 text-red-400 border border-red-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            Claim Shield
          </p>
        </div>

        <h1 className="mt-3 text-center text-3xl font-bold text-white tracking-tight">
          Claim This Shield
        </h1>

        <p className="text-center text-xs text-slate-400">
          Shield ID: <span className="font-mono text-slate-200">{shieldId}</span>
        </p>

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 text-center">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="text-sm font-semibold text-white mt-0.5">{user?.email}</p>
        </div>

        <form onSubmit={handleClaim} className="space-y-4">
          <p className="text-sm text-slate-400 text-center">
            Enter your PIN to link this shield to your account.
          </p>

          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className={inputClassName}
            placeholder="Edit PIN"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={status === 'claiming'}
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60 transition"
          >
            {status === 'claiming' ? 'Claiming…' : 'Claim Shield'}
          </button>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Claiming links this shield to your account. You'll be able to manage it
              from your dashboard and recover your PIN if you forget it.
            </p>
          </div>
        </form>

        <Link
          href={`/edit/${shieldId}`}
          className="block text-xs text-center text-slate-400 hover:text-slate-200 underline underline-offset-2"
        >
          Back to edit
        </Link>
      </div>
    </main>
  );
}
