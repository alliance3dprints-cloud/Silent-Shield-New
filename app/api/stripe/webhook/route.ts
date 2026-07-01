import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

export const runtime = 'nodejs';

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function planFromPrice(priceId: string): 'monthly' | 'annual' {
  if (priceId === process.env.STRIPE_ANNUAL_PRICE_ID) return 'annual';
  return 'monthly';
}

// In Stripe API 2026-06-24.dahlia, current_period_end is replaced by
// billing_schedules[0].bill_until.computed_timestamp
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const schedule = sub.billing_schedules?.[0];
  const ts = schedule?.bill_until?.computed_timestamp;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const db = getServiceRoleClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const ownerId = session.client_reference_id;
      if (!ownerId || typeof session.subscription !== 'string') break;

      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const priceId = sub.items.data[0]?.price?.id ?? '';
      const plan = planFromPrice(priceId);
      const periodEnd = getPeriodEnd(sub);

      await db.from('subscriptions').upsert(
        {
          owner_id: ownerId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription,
          plan,
          status: 'active',
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' }
      );
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const ownerId = sub.metadata?.owner_id;
      if (!ownerId) break;

      const priceId = sub.items.data[0]?.price?.id ?? '';
      const plan = planFromPrice(priceId);
      const periodEnd = getPeriodEnd(sub);
      const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status;

      await db.from('subscriptions').upsert(
        {
          owner_id: ownerId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          plan,
          status,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' }
      );
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const ownerId = sub.metadata?.owner_id;
      if (!ownerId) break;

      await db
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('owner_id', ownerId);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.parent?.subscription_details?.subscription;
      if (!subRef) break;
      const subId = typeof subRef === 'string' ? subRef : (subRef as Stripe.Subscription).id;

      const sub = await stripe.subscriptions.retrieve(subId);
      const ownerId = sub.metadata?.owner_id;
      if (!ownerId) break;

      const periodEnd = getPeriodEnd(sub);
      await db
        .from('subscriptions')
        .update({ status: 'active', current_period_end: periodEnd, updated_at: new Date().toISOString() })
        .eq('owner_id', ownerId);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.parent?.subscription_details?.subscription;
      if (!subRef) break;
      const subId = typeof subRef === 'string' ? subRef : (subRef as Stripe.Subscription).id;

      const sub = await stripe.subscriptions.retrieve(subId);
      const ownerId = sub.metadata?.owner_id;
      if (!ownerId) break;

      await db
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('owner_id', ownerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
