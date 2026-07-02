import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

// Removes a shield from the authenticated owner's account (unclaim). The shield
// profile itself is left intact so it can be re-claimed later with its PIN —
// this only unlinks it from this account and clears its notification prefs.
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { shieldId } = await req.json();
    if (!shieldId) {
      return NextResponse.json({ error: 'Missing shieldId' }, { status: 400 });
    }

    const db = getServiceRoleClient();

    const { data: ownership } = await db
      .from('shield_owners')
      .select('id')
      .eq('shield_id', shieldId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!ownership) {
      return NextResponse.json({ error: 'You do not own this shield' }, { status: 403 });
    }

    await db
      .from('notification_preferences')
      .delete()
      .eq('owner_id', user.id)
      .eq('shield_id', shieldId);

    const { error: removeError } = await db
      .from('shield_owners')
      .delete()
      .eq('owner_id', user.id)
      .eq('shield_id', shieldId);

    if (removeError) {
      console.error('Shield remove error:', removeError);
      return NextResponse.json({ error: 'Failed to remove shield' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('remove route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
