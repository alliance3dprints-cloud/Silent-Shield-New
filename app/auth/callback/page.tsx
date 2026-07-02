'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function getRedirectTarget(urlNext: string | null): string {
  // localStorage is shared across tabs — magic links open in a new tab so sessionStorage won't work
  try {
    const stored = localStorage.getItem('auth_redirect');
    if (stored) {
      localStorage.removeItem('auth_redirect');
      return stored;
    }
  } catch {}
  return urlNext || '/account';
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const urlNext = searchParams.get('next');

  useEffect(() => {
    let done = false;
    const go = (target: string) => {
      if (done) return;
      done = true;
      window.location.href = target;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') go(getRedirectTarget(urlNext));
    });

    // Poll for the session a few times before giving up, so a slow device or
    // cold network doesn't bounce a valid sign-in back to the login screen.
    let attempts = 0;
    const maxAttempts = 8; // ~8s total
    const poll = setInterval(async () => {
      attempts += 1;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        clearInterval(poll);
        go(getRedirectTarget(urlNext));
      } else if (attempts >= maxAttempts) {
        clearInterval(poll);
        go('/account/login');
      }
    }, 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(poll);
    };
  }, [urlNext]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-sm text-slate-400">Signing you in…</p>
    </main>
  );
}
