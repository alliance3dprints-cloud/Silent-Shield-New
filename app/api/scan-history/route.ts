import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceRoleClient();

  const { data, error } = await db
    .from('notification_log')
    .select('id, shield_id, channel, event_type, status, created_at, shield:silent_shields(Name, profile_type)')
    .eq('owner_id', user.id)
    .eq('event_type', 'scan')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data ?? [] });
}
