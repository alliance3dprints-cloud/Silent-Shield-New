import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { plan } = await req.json();
  if (plan !== 'monthly' && plan !== 'annual') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const priceId =
    plan === 'monthly'
      ? process.env.STRIPE_MONTHLY_PRICE_ID
      : process.env.STRIPE_ANNUAL_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 });
  }

  const db = getServiceRoleClient();
  // Derive base URL from env var, or reconstruct from Vercel/proxy forwarding headers
  let base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (!base) {
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
    base = `${proto}://${host}`;
  }

  // Look up existing Stripe customer for this owner
  const { data: existing } = await db
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle();

  let stripeCustomerId = existing?.stripe_customer_id as string | undefined;

  try {
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { owner_id: user.id },
      });
      stripeCustomerId = customer.id;

      await db.from('subscriptions').upsert(
        {
          owner_id: user.id,
          stripe_customer_id: stripeCustomerId,
          status: 'incomplete',
          plan,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/account?checkout=success`,
      cancel_url: `${base}/account`,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { owner_id: user.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    console.error('create-checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
