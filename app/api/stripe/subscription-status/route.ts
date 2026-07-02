import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { getStripe } from '@/lib/stripe';

type SubShape = {
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  plan: 'monthly' | 'annual';
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function planFromPrice(priceId: string | undefined): 'monthly' | 'annual' {
  return priceId && priceId === process.env.STRIPE_ANNUAL_PRICE_ID ? 'annual' : 'monthly';
}

function mapStatus(s: Stripe.Subscription['status']): SubShape['status'] {
  if (s === 'active' || s === 'trialing') return 'active';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled';
  return 'incomplete';
}

function periodEnd(sub: Stripe.Subscription): string | null {
  const ts = sub.billing_schedules?.[0]?.bill_until?.computed_timestamp;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

// Prefer an active/trialing sub, then past_due, then the most recently created.
function pickSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  if (subs.length === 0) return null;
  const byPriority = [...subs].sort((a, b) => {
    const rank = (s: Stripe.Subscription) =>
      s.status === 'active' || s.status === 'trialing' ? 0 : s.status === 'past_due' ? 1 : 2;
    return rank(a) - rank(b) || b.created - a.created;
  });
  return byPriority[0];
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getServiceRoleClient();

  const { data: local } = await db
    .from('subscriptions')
    .select('status, plan, current_period_end, cancel_at_period_end, stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle();

  // Reconcile against Stripe when we have a customer on file, so a missed
  // webhook (Stripe/DB divergence) self-heals on the next account load.
  if (local?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const list = await stripe.subscriptions.list({
        customer: local.stripe_customer_id,
        status: 'all',
        limit: 5,
      });
      const chosen = pickSubscription(list.data);

      if (chosen) {
        const fresh: SubShape = {
          status: mapStatus(chosen.status),
          plan: planFromPrice(chosen.items.data[0]?.price?.id),
          current_period_end: periodEnd(chosen),
          cancel_at_period_end: chosen.cancel_at_period_end,
        };

        const changed =
          fresh.status !== local.status ||
          fresh.plan !== local.plan ||
          fresh.current_period_end !== local.current_period_end ||
          fresh.cancel_at_period_end !== local.cancel_at_period_end;

        if (changed) {
          await db
            .from('subscriptions')
            .update({
              ...fresh,
              stripe_subscription_id: chosen.id,
              updated_at: new Date().toISOString(),
            })
            .eq('owner_id', user.id);
        }
        return NextResponse.json({ subscription: fresh });
      }

      // No subscriptions in Stripe at all → ensure we're not showing active.
      if (local.status !== 'canceled') {
        await db
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('owner_id', user.id);
      }
      return NextResponse.json({
        subscription: { ...local, status: 'canceled', stripe_customer_id: undefined },
      });
    } catch (err) {
      // On any Stripe error, fall back to the local record rather than failing.
      console.error('subscription reconcile failed:', err);
    }
  }

  if (!local) return NextResponse.json({ subscription: null });
  const { stripe_customer_id, ...safe } = local;
  return NextResponse.json({ subscription: safe });
}
