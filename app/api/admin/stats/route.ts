import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

// Only accounts whose email is listed in ADMIN_EMAILS (comma-separated) can
// see business metrics.
function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

const MONTHLY_PRICE = 3.99;
const ANNUAL_PRICE = 39.99;

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getServiceRoleClient();

  // Activated shields
  const { count: activatedShields } = await db
    .from('silent_shields')
    .select('*', { count: 'exact', head: true })
    .eq('Activated', true);

  // Owners / claims
  const { data: owners } = await db.from('shield_owners').select('owner_id, shield_id');
  const claimedShields = new Set((owners ?? []).map((o) => o.shield_id)).size;
  const uniqueOwners = new Set((owners ?? []).map((o) => o.owner_id)).size;

  // Subscriptions
  const { data: subs } = await db.from('subscriptions').select('status, plan');
  const active = (subs ?? []).filter((s) => s.status === 'active');
  const monthly = active.filter((s) => s.plan === 'monthly').length;
  const annual = active.filter((s) => s.plan === 'annual').length;
  const pastDue = (subs ?? []).filter((s) => s.status === 'past_due').length;
  const mrr = monthly * MONTHLY_PRICE + annual * (ANNUAL_PRICE / 12);

  // Scans & alerts (from notification_log)
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: totalScans }, { count: alertsSent }, { count: scans7d }] = await Promise.all([
    db.from('notification_log').select('*', { count: 'exact', head: true }).eq('event_type', 'scan'),
    db.from('notification_log').select('*', { count: 'exact', head: true }).eq('event_type', 'scan').eq('status', 'sent'),
    db.from('notification_log').select('*', { count: 'exact', head: true }).eq('event_type', 'scan').gte('created_at', since7),
  ]);

  // Marketing opt-ins (table may not exist yet)
  let marketingOptIns = 0;
  const { count: mCount, error: mErr } = await db
    .from('marketing_opt_in')
    .select('*', { count: 'exact', head: true })
    .eq('opted_in', true);
  if (!mErr) marketingOptIns = mCount ?? 0;

  return NextResponse.json({
    activatedShields: activatedShields ?? 0,
    claimedShields,
    uniqueOwners,
    activeSubscribers: active.length,
    monthly,
    annual,
    pastDue,
    mrr: Math.round(mrr * 100) / 100,
    totalScans: totalScans ?? 0,
    alertsSent: alertsSent ?? 0,
    scans7d: scans7d ?? 0,
    marketingOptIns,
  });
}
