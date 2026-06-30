// app/account/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type ClaimedShield = {
  shield_id: string;
  claimed_at: string;
  shield: {
    Name: string | null;
    profile_type: string | null;
    Activated: boolean | null;
    photo_url: string | null;
  } | null;
};

type NotifPrefs = Record<string, boolean>; // shield_id -> email_enabled

function formatCategory(category?: string | null) {
  const map: Record<string, string> = {
    general: 'General Emergency ID',
    child: 'Child Safety',
    adult: 'Adult Emergency ID',
    senior: 'Senior Safety',
    medical: 'Medical Alert',
    autism: 'Autism / Nonverbal',
    disability: 'Disability Support',
    veteran: 'Veteran',
    law_enforcement: 'Law Enforcement',
    first_responder: 'First Responder',
  };
  if (!category) return 'Emergency ID';
  return map[category] || category;
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [shields, setShields] = useState<ClaimedShield[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({});
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const [savedPref, setSavedPref] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/account/login';
        return;
      }

      setUserEmail(user.email || null);
      setUserId(user.id);

      const { data, error } = await supabase
        .from('shield_owners')
        .select('shield_id, claimed_at, shield:silent_shields(Name, profile_type, Activated, photo_url)')
        .eq('owner_id', user.id)
        .order('claimed_at', { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setShields((data as unknown as ClaimedShield[]) || []);
      }

      // Load notification preferences for all shields
      const shieldIds = (data || []).map((d: { shield_id: string }) => d.shield_id);
      if (shieldIds.length > 0) {
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('shield_id, email_enabled')
          .eq('owner_id', user.id)
          .in('shield_id', shieldIds);

        const prefsMap: NotifPrefs = {};
        for (const p of prefs || []) {
          prefsMap[p.shield_id] = p.email_enabled;
        }
        // Default to true for shields with no prefs row yet
        for (const id of shieldIds) {
          if (!(id in prefsMap)) prefsMap[id] = true;
        }
        setNotifPrefs(prefsMap);
      }

      setLoading(false);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/account/login';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function toggleEmailNotif(shieldId: string, current: boolean) {
    setSavingPref(shieldId);
    const next = !current;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingPref(null); return; }

    const res = await fetch('/api/preferences/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ shieldId, email_enabled: next }),
    });

    if (res.ok) {
      setNotifPrefs((prev) => ({ ...prev, [shieldId]: next }));
      setSavedPref(shieldId);
      setTimeout(() => setSavedPref((p) => (p === shieldId ? null : p)), 2000);
    }
    setSavingPref(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="rounded-2xl bg-slate-950/90 border border-slate-700 shadow-xl px-6 py-7 space-y-5">
          <div className="flex justify-center">
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-red-500/10 text-red-400 border border-red-500/40">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              My Account
            </p>
          </div>

          <h1 className="text-center text-3xl font-bold text-white tracking-tight">
            My Silent Shields
          </h1>

          <p className="text-center text-xs text-slate-400">
            Signed in as <span className="font-semibold text-slate-200">{userEmail}</span>
          </p>

          {shields.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-200">No shields claimed yet</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tap any Silent Shield with your phone, then tap <span className="font-semibold text-slate-200">Edit Profile</span> and claim it to link it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shields.map((item) => {
                const shield = item.shield;
                const name = shield?.Name || 'Unnamed Shield';
                const category = formatCategory(shield?.profile_type);
                const emailOn = notifPrefs[item.shield_id] ?? true;
                const saving = savingPref === item.shield_id;

                return (
                  <div
                    key={item.shield_id}
                    className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-full border border-slate-600 bg-slate-900 flex items-center justify-center overflow-hidden">
                        {shield?.photo_url ? (
                          <img
                            src={shield.photo_url}
                            alt={name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-slate-400">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{name}</p>
                        <p className="text-xs text-slate-400">{category}</p>
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                          {item.shield_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/p/${item.shield_id}`}
                        className="flex-1 text-center rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/edit/${item.shield_id}`}
                        className="flex-1 text-center rounded-lg bg-red-500 hover:bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Edit
                      </Link>
                    </div>

                    <div className="border-t border-slate-700 pt-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={emailOn}
                        aria-label={`${emailOn ? 'Disable' : 'Enable'} email notifications for ${shield?.Name || 'this shield'}`}
                        disabled={saving}
                        onClick={() => toggleEmailNotif(item.shield_id, emailOn)}
                        className="flex w-full items-center justify-between gap-3 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 rounded"
                      >
                        <span className="text-xs text-slate-400 text-left">
                          Email me when this shield is scanned
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            When someone taps the NFC tag with a phone
                          </span>
                        </span>
                        <div
                          aria-hidden="true"
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            emailOn ? 'bg-red-500' : 'bg-slate-600'
                          } ${saving ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              emailOn ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </button>
                      {saving && (
                        <p className="mt-1 text-[11px] text-slate-400">Saving…</p>
                      )}
                      {!saving && savedPref === item.shield_id && (
                        <p className="mt-1 text-[11px] text-emerald-400">Saved ✓</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full text-center text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
