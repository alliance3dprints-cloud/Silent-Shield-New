// app/history/[id]/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

type HistoryPageProps = {
  params: { id: string };
};

type ScanEvent = {
  id: string;
  scanned_at: string;
  ip_address: string | null;
  user_agent: string | null;
};

const inputClassName =
  'w-full border border-slate-700 bg-slate-900/60 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/60';

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function parseDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';

  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) {
    const match = ua.match(/Android[^;]*;\s*([^)]+)/);
    return match ? match[1].trim() : 'Android device';
  }
  if (ua.includes('Macintosh')) return 'Mac';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Linux')) return 'Linux device';

  return 'Unknown device';
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatTimestamp(iso);
}

export default function ScanHistoryPage({ params }: HistoryPageProps) {
  const shieldId = params.id;

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);

    if (!pinInput) {
      setPinError('Please enter your PIN.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/scan-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shieldId, pin: pinInput }),
      });

      if (res.status === 401) {
        setPinError('Incorrect PIN.');
        setLoading(false);
        return;
      }

      if (res.status === 403) {
        setUpgradeRequired(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const body = await res.json();
        setPinError(body.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      const { data } = await res.json();
      setEvents(data);
      setVerified(true);
    } catch {
      setPinError('Something went wrong. Please try again.');
    }

    setLoading(false);
  }

  if (upgradeRequired) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-6">
        <div className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-slate-700 shadow-xl px-6 py-7 space-y-5 text-center">
          <div className="flex justify-center">
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-amber-500/10 text-amber-400 border border-amber-500/40">
              Premium Feature
            </p>
          </div>

          <h1 className="text-2xl font-bold text-white">Scan History</h1>

          <p className="text-sm text-slate-400">
            Scan history is available with Silent Shield Premium.
            See when and where your shield is scanned in real time.
          </p>

          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 text-left space-y-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Premium includes:
            </p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✦</span>
                Real-time scan email alerts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✦</span>
                Full scan history dashboard
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✦</span>
                Multiple caregiver notifications
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">✦</span>
                <span className="text-slate-400">SMS alerts (coming soon)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">✦</span>
                <span className="text-slate-400">Location insights (coming soon)</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-2xl font-bold text-white">
              $3.99<span className="text-sm font-normal text-slate-400">/month</span>
            </p>
            <p className="text-xs text-slate-500">
              or $39.99/year (save 16%)
            </p>
          </div>

          <Link
            href={`/premium/${shieldId}`}
            className="block w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-center py-3 font-bold shadow-lg shadow-amber-500/20 transition"
          >
            Upgrade to Premium
          </Link>

          <Link
            href={`/edit/${shieldId}`}
            className="block text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Back to edit profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-slate-700 shadow-xl px-6 py-7 space-y-5">
        <div className="flex justify-center mt-2">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-amber-500/10 text-amber-400 border border-amber-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Premium
          </p>
        </div>

        <h1 className="mt-3 text-center text-3xl font-bold text-white tracking-tight">
          Scan History
        </h1>

        <p className="text-center text-xs text-slate-400 mt-1">
          Shield ID: <span className="font-mono text-slate-200">{shieldId}</span>
        </p>

        {!verified ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-400 text-center">
              Enter your edit PIN to view scan history.
            </p>

            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className={inputClassName}
              placeholder="Edit PIN"
            />

            {pinError && <p className="text-sm text-red-400">{pinError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60 transition"
            >
              {loading ? 'Verifying…' : 'View History'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                {events.length} scan{events.length !== 1 ? 's' : ''} recorded
              </p>
            </div>

            {events.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-6 text-center">
                <p className="text-sm text-slate-400">
                  No scans recorded yet. When someone scans this shield, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-100">
                        {formatTimestamp(event.scanned_at)}
                      </p>
                      <span className="text-xs text-slate-500">
                        {timeAgo(event.scanned_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {parseDevice(event.user_agent)}
                    </p>

                    {event.ip_address && (
                      <p className="text-xs text-slate-500 font-mono">
                        IP: {event.ip_address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 space-y-3">
              <Link
                href={`/edit/${shieldId}`}
                className="block w-full text-center rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
              >
                Edit Profile
              </Link>

              <Link
                href={`/p/${shieldId}`}
                className="block text-xs text-center text-slate-400 hover:text-slate-200 underline underline-offset-2"
              >
                View public profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
