'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/account';

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        window.location.href = next;
      }
    });

    const timeout = setTimeout(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          window.location.href = next;
        } else {
          window.location.href = '/account/login';
        }
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [next]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-sm text-slate-400">Signing you in…</p>
    </main>
  );
}
