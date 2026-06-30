'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function getRedirectTarget(urlNext: string | null): string {
  // Prefer sessionStorage (set before sending magic link) so query params survive Supabase redirect
  try {
    const stored = sessionStorage.getItem('auth_redirect');
    if (stored) {
      sessionStorage.removeItem('auth_redirect');
      return stored;
    }
  } catch {}
  return urlNext || '/account';
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const urlNext = searchParams.get('next');

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        window.location.href = getRedirectTarget(urlNext);
      }
    });

    const timeout = setTimeout(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          window.location.href = getRedirectTarget(urlNext);
        } else {
          window.location.href = '/account/login';
        }
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [urlNext]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-sm text-slate-400">Signing you in…</p>
    </main>
  );
}
