import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getServiceRoleClient();

  const { data } = await db
    .from('subscriptions')
    .select('status, plan, current_period_end, cancel_at_period_end')
    .eq('owner_id', user.id)
    .maybeSingle();

  return NextResponse.json({ subscription: data ?? null });
}
