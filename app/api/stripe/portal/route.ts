import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getServiceRoleClient();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { data } = await db
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${base}/account`,
  });

  return NextResponse.json({ url: portalSession.url });
}
