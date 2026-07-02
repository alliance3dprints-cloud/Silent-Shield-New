'use client';

import { useState, useEffect, useCallback } from 'react';
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

type Subscription = {
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  plan: 'monthly' | 'annual';
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
} | null;

type ScanEntry = {
  id: string;
  shield_id: string;
  channel: string;
  status: string;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
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

function formatCategory(category?: string | null) {
  if (!category) return 'Emergency ID';
  return CATEGORY_LABELS[category] || category;
}

function shieldDisplayName(shield: ClaimedShield['shield']): string {
  if (shield?.Name?.trim()) return shield.Name.trim();
  return formatCategory(shield?.profile_type);
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [shields, setShields] = useState<ClaimedShield[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({});
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const [savedPref, setSavedPref] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([]);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const loadSubscription = useCallback(async (token: string) => {
    const res = await fetch('/api/stripe/subscription-status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const body = await res.json();
      setSubscription(body.subscription);
    }
    setSubLoading(false);
  }, []);

  const loadScanHistory = useCallback(async (token: string) => {
    const res = await fetch('/api/scan-history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const body = await res.json();
      setScanHistory(body.entries ?? []);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/account/login';
        return;
      }

      setUserEmail(user.email || null);

      const { data, error } = await supabase
        .from('shield_owners')
        .select('shield_id, claimed_at, shield:silent_shields(Name, profile_type, Activated, photo_url)')
        .eq('owner_id', user.id)
        .order('claimed_at', { ascending: false });

      if (!error) {
        setShields((data as unknown as ClaimedShield[]) || []);

        const shieldIds = (data || []).map((d: { shield_id: string }) => d.shield_id);
        if (shieldIds.length > 0) {
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('shield_id, email_enabled')
            .eq('owner_id', user.id)
            .in('shield_id', shieldIds);

          const prefsMap: NotifPrefs = {};
          for (const p of prefs || []) prefsMap[p.shield_id] = p.email_enabled;
          for (const id of shieldIds) if (!(id in prefsMap)) prefsMap[id] = true;
          setNotifPrefs(prefsMap);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const fromCheckout = new URLSearchParams(window.location.search).get('checkout') === 'success';
        if (fromCheckout) {
          setCheckoutPending(true);
          let found = false;
          for (let i = 0; i < 8; i++) {
            await new Promise((r) => setTimeout(r, 1000));
            const res = await fetch('/api/stripe/subscription-status', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
              const body = await res.json();
              if (body.subscription?.status === 'active') {
                setSubscription(body.subscription);
                found = true;
                break;
              }
            }
          }
          if (!found) await loadSubscription(session.access_token);
          setSubLoading(false);
          setCheckoutPending(false);
          window.history.replaceState({}, '', '/account');
        } else {
          await loadSubscription(session.access_token);
        }
        await loadScanHistory(session.access_token);
      }

      setLoading(false);
    }

    load();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.href = '/account/login';
    });

    return () => authSub.unsubscribe();
  }, [loadSubscription, loadScanHistory]);

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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ shieldId, email_enabled: next }),
    });

    if (res.ok) {
      setNotifPrefs((prev) => ({ ...prev, [shieldId]: next }));
      setSavedPref(shieldId);
      setTimeout(() => setSavedPref((p) => (p === shieldId ? null : p)), 2000);
    }
    setSavingPref(null);
  }

  async function handleUpgrade(plan: 'monthly' | 'annual') {
    setUpgrading(true);
    setUpgradeError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/account/login';
      return;
    }

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      });

      const body = await res.json();
      if (res.ok && body.url) {
        window.location.href = body.url;
      } else {
        setUpgradeError(body.error || 'Something went wrong. Please try again.');
        setUpgrading(false);
      }
    } catch {
      setUpgradeError('Could not reach checkout. Check your connection and try again.');
      setUpgrading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPortalLoading(false); return; }

    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  const isPremium = subscription?.status === 'active';
  const renewalDate = formatDate(subscription?.current_period_end ?? null);
  const willCancel = subscription?.cancel_at_period_end === true;

  const showPremiumNudge =
    !isPremium && !subLoading && !checkoutPending && shields.length > 0;

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">

        {/* Premium nudge — surfaced until the owner subscribes */}
        {showPremiumNudge && (
          <a
            href="#premium"
            className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 transition hover:bg-red-500/15"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 text-red-300" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
              </svg>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-white">You&apos;re not getting scan alerts yet</span>
              <span className="block text-xs text-slate-300">Activate Premium to know when your shield is scanned →</span>
            </span>
          </a>
        )}

        {/* Header */}
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

          {/* Shields */}
          {shields.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-200">No shields claimed yet</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tap any Silent Shield with your phone, then tap{' '}
                <span className="font-semibold text-slate-200">Edit Profile</span> and claim it to link it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shields.map((item) => {
                const name = shieldDisplayName(item.shield);
                const category = formatCategory(item.shield?.profile_type);
                const emailOn = notifPrefs[item.shield_id] ?? true;
                const saving = savingPref === item.shield_id;
                const initial = name.charAt(0).toUpperCase();

                return (
                  <div key={item.shield_id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-full border border-slate-600 bg-slate-900 flex items-center justify-center overflow-hidden">
                        {item.shield?.photo_url ? (
                          <img src={item.shield.photo_url} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-slate-400">{initial}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{name}</p>
                        <p className="text-xs text-slate-400">{category}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/p/${item.shield_id}?owner=1`}
                        className="flex-1 text-center rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
                      >
                        View Profile
                      </Link>
                      <Link
                        href={`/edit/${item.shield_id}`}
                        className="flex-1 text-center rounded-lg bg-red-500 hover:bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition"
                      >
                        Edit Profile
                      </Link>
                    </div>

                    <div className="border-t border-slate-700 pt-3">
                      {isPremium ? (
                        <>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={emailOn}
                            aria-label={`${emailOn ? 'Disable' : 'Enable'} email notifications for ${name}`}
                            disabled={saving}
                            onClick={() => toggleEmailNotif(item.shield_id, emailOn)}
                            className="flex w-full items-center justify-between gap-3 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 rounded"
                          >
                            <span className="text-xs text-slate-400 text-left">
                              Email scan alerts
                              <span className="block text-[11px] text-slate-500 mt-0.5">
                                Notify me when this shield is scanned
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
                          {saving && <p className="mt-1 text-[11px] text-slate-400">Saving…</p>}
                          {!saving && savedPref === item.shield_id && (
                            <p className="mt-1 text-[11px] text-emerald-400">Saved ✓</p>
                          )}
                        </>
                      ) : (
                        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-300">Email Scan Alerts</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Included with Silent Shield Premium</p>
                          </div>
                          <span className="text-[10px] font-semibold text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 shrink-0">
                            Premium
                          </span>
                        </div>
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

        {/* Premium Section */}
        <div id="premium" className="scroll-mt-6 rounded-2xl border shadow-xl overflow-hidden">
          {checkoutPending ? (
            <div className="bg-slate-950/90 border-slate-700 px-6 py-8 text-center space-y-3">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-red-500" />
              <p className="text-sm font-semibold text-white">Activating Premium…</p>
              <p className="text-xs text-slate-400">This usually takes just a moment.</p>
            </div>
          ) : subLoading ? (
            <div className="bg-slate-950/90 border-slate-700 px-6 py-8 text-center">
              <p className="text-xs text-slate-400">Loading…</p>
            </div>
          ) : isPremium ? (
            <PremiumActive
              plan={subscription!.plan}
              renewalDate={renewalDate}
              willCancel={willCancel}
              portalLoading={portalLoading}
              onManage={handleManageBilling}
              scanHistory={scanHistory}
              shields={shields}
            />
          ) : (
            <PremiumUpgrade
              pastDue={subscription?.status === 'past_due'}
              upgrading={upgrading}
              upgradeError={upgradeError}
              portalLoading={portalLoading}
              onUpgrade={handleUpgrade}
              onManageBilling={handleManageBilling}
            />
          )}
        </div>

      </div>
    </main>
  );
}

function PremiumActive({
  plan,
  renewalDate,
  willCancel,
  portalLoading,
  onManage,
  scanHistory,
  shields,
}: {
  plan: 'monthly' | 'annual';
  renewalDate: string | null;
  willCancel: boolean | null;
  portalLoading: boolean;
  onManage: () => void;
  scanHistory: ScanEntry[];
  shields: ClaimedShield[];
}) {
  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700 px-6 py-7 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-emerald-400">
            Premium Active
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Silent Shield Premium</h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5 text-emerald-400" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      </div>

      {/* Subscription details */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-2">
        <Row label="Plan" value={plan === 'annual' ? 'Annual' : 'Monthly'} />
        <Row label="Status" value="Active" valueClass="text-emerald-400" />
        {renewalDate && (
          <Row
            label={willCancel ? 'Access until' : 'Renews'}
            value={renewalDate}
            valueClass={willCancel ? 'text-yellow-400' : undefined}
          />
        )}
      </div>

      {willCancel && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-xs text-yellow-200 leading-relaxed">
            Your subscription is cancelled. You'll keep Premium access until {renewalDate}.
          </p>
        </div>
      )}

      {/* Scan History */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-[0.15em]">Scan History</p>
        {scanHistory.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 text-center space-y-1">
            <p className="text-sm font-semibold text-slate-300">No scans yet</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              When someone taps your Silent Shield, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {scanHistory.slice(0, 10).map((entry) => {
              const { date, time } = formatDateTime(entry.created_at);
              const matchedShield = shields.find(s => s.shield_id === entry.shield_id);
              const shieldName = shieldDisplayName(matchedShield?.shield ?? null);
              const notified = entry.status === 'sent';
              return (
                <div key={entry.id} className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{shieldName} scanned</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{date} · {time}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
                    notified
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : 'text-slate-500 border-slate-600 bg-slate-800'
                  }`}>
                    {notified ? 'Notified' : 'No alert'}
                  </span>
                </div>
              );
            })}
            {scanHistory.length > 10 && (
              <p className="text-center text-[11px] text-slate-500">
                Showing 10 of {scanHistory.length} scans
              </p>
            )}
          </div>
        )}
      </div>

      {/* Manage */}
      <button
        type="button"
        onClick={onManage}
        disabled={portalLoading}
        className="block w-full text-center rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-60 transition"
      >
        {portalLoading ? 'Opening billing…' : 'Manage Subscription'}
      </button>
    </div>
  );
}

function PremiumUpgrade({
  pastDue,
  upgrading,
  upgradeError,
  portalLoading,
  onUpgrade,
  onManageBilling,
}: {
  pastDue: boolean;
  upgrading: boolean;
  upgradeError: string | null;
  portalLoading: boolean;
  onUpgrade: (plan: 'monthly' | 'annual') => void;
  onManageBilling: () => void;
}) {
  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700 px-6 py-7 space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-red-400">
          Silent Shield Premium
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">Know the moment your shield is scanned.</h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Get an instant email alert whenever your Silent Shield is viewed — so you always know when someone needs help.
        </p>
      </div>

      <ul className="space-y-2">
        <Feature text="Instant email scan alerts" active />
        <Feature text="Scan history" active />
        <Feature text="SMS alerts" soon />
        <Feature text="Multiple caregiver notifications" soon />
        <Feature text="Family plans" soon />
      </ul>

      {pastDue ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-semibold text-yellow-200">Payment issue</p>
            <p className="text-xs text-yellow-300 mt-1 leading-relaxed">
              Your last payment didn't go through. Update your billing info to restore Premium.
            </p>
          </div>
          <button
            type="button"
            onClick={onManageBilling}
            disabled={portalLoading}
            className="w-full rounded-xl bg-red-500 hover:bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60 transition"
          >
            {portalLoading ? 'Opening billing…' : 'Update Billing'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 items-start">
            <PriceButton
              label="Monthly"
              price="$3.99"
              period="/mo"
              disabled={upgrading}
              onClick={() => onUpgrade('monthly')}
            />
            <PriceButton
              label="Annual"
              price="$39.99"
              period="/yr"
              badge="Best Value"
              accent
              disabled={upgrading}
              onClick={() => onUpgrade('annual')}
            />
          </div>
          {upgrading && (
            <p className="text-center text-xs text-slate-400">Redirecting to checkout…</p>
          )}
          {upgradeError && (
            <p className="text-center text-xs text-red-400">{upgradeError}</p>
          )}
          <p className="text-center text-[11px] text-slate-500 leading-relaxed">
            Billed via Stripe · Cancel anytime
          </p>
        </div>
      )}
    </div>
  );
}

function PriceButton({
  label,
  price,
  period,
  badge,
  accent,
  disabled,
  onClick,
}: {
  label: string;
  price: string;
  period: string;
  badge?: string;
  accent?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center rounded-xl px-3 py-4 text-center disabled:opacity-60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 ${
        accent
          ? 'border-2 border-red-500/60 bg-red-500/5 hover:bg-red-500/10 shadow-lg shadow-red-500/10'
          : 'border border-slate-600 bg-slate-800 hover:border-red-500/60 hover:bg-slate-700'
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
          {badge}
        </span>
      )}
      <span className={`text-xs font-semibold ${accent ? 'text-slate-300' : 'text-slate-400'}`}>{label}</span>
      <span className={`mt-1 text-2xl font-bold ${accent ? 'text-white' : 'text-white'}`}>{price}</span>
      <span className={`text-[11px] ${accent ? 'text-slate-400' : 'text-slate-500'}`}>{period}</span>
    </button>
  );
}

function Feature({ text, active, soon }: { text: string; active?: boolean; soon?: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      {active ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="h-4 w-4 shrink-0 flex items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        </span>
      )}
      <span className={`text-sm ${active ? 'text-slate-200' : 'text-slate-500'}`}>{text}</span>
      {soon && (
        <span className="ml-auto rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          Soon
        </span>
      )}
    </li>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-semibold ${valueClass ?? 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
