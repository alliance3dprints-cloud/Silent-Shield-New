// app/account/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const inputClassName =
  'w-full border border-slate-700 bg-slate-900/60 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/60';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const recover = searchParams.get('recover');
  const claimShield = searchParams.get('claim');
  const redirect = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const target = redirect || '/account';
        window.location.href = target;
      }
    });
  }, [redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setStatus('sending');

    let finalDest = '/account';
    if (recover) finalDest = `/edit/${recover}?recover=true`;
    if (claimShield) finalDest = `/claim/${claimShield}?verified=true`;
    if (redirect) finalDest = redirect;

    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(finalDest)}`;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });

    if (authError) {
      console.error(authError);
      setStatus('error');
      setError('Failed to send login link. Please try again.');
      return;
    }

    setStatus('sent');
  }

  const title = recover
    ? 'Recover Your PIN'
    : claimShield
    ? 'Verify Your Email'
    : 'Sign In to Silent Shield';

  const subtitle = recover
    ? 'We\'ll send a link to verify you own this shield so you can reset your PIN.'
    : claimShield
    ? 'We\'ll send a link to verify your email and claim this shield.'
    : 'Enter your email to receive a sign-in link.';

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-slate-700 shadow-xl px-6 py-7 space-y-5">
        <div className="flex justify-center mt-2">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-red-500/10 text-red-400 border border-red-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            Account
          </p>
        </div>

        <h1 className="mt-3 text-center text-3xl font-bold text-white tracking-tight">
          {title}
        </h1>

        {status === 'sent' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
              <p className="text-sm text-emerald-100">
                Check your email for a sign-in link.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Sent to <span className="font-semibold text-slate-200">{email}</span>
              </p>
            </div>

            <p className="text-xs text-slate-500 text-center">
              The link expires in 15 minutes. Check your spam folder if you don't see it.
            </p>

            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="block w-full text-center text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-400 text-center">
              {subtitle}
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              placeholder="you@example.com"
              autoFocus
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60 transition"
            >
              {status === 'sending' ? 'Sending…' : 'Send Sign-In Link'}
            </button>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              No password needed. We'll email you a secure link to sign in.
            </p>
          </form>
        )}

        <div className="pt-3 border-t border-slate-800 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
