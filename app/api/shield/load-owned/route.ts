import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

// Returns the full editable row for a shield the authenticated user owns.
// Used by the edit page owner path so it never reads the shield table (or the
// PIN hash) with the public anon key.
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

    const { data: shield, error } = await db
      .from('silent_shields')
      .select('*')
      .eq('id', shieldId)
      .maybeSingle();

    if (error || !shield) {
      return NextResponse.json({ error: 'Shield not found' }, { status: 404 });
    }

    const { Edit_pin_hash, ...safeRow } = shield;
    return NextResponse.json({ data: safeRow });
  } catch (err) {
    console.error('load-owned route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
