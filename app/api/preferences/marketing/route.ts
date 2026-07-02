import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { setMarketingOptIn } from '@/lib/marketing';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceRoleClient();
  const { data } = await db
    .from('marketing_opt_in')
    .select('opted_in')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ opted_in: data?.opted_in ?? false });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { opted_in } = await req.json();
  if (typeof opted_in !== 'boolean') {
    return NextResponse.json({ error: 'opted_in must be a boolean' }, { status: 400 });
  }

  try {
    await setMarketingOptIn(user.id, user.email ?? '', opted_in);
    return NextResponse.json({ opted_in });
  } catch (err) {
    console.error('marketing pref update failed:', err);
    return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
  }
}
