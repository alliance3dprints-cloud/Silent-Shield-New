import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { shieldId, newPin } = await req.json();

    if (!shieldId || !newPin) {
      return NextResponse.json({ error: 'Missing shieldId or newPin' }, { status: 400 });
    }

    if (newPin.length < 4 || newPin.length > 10) {
      return NextResponse.json({ error: 'PIN must be 4-10 characters' }, { status: 400 });
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

    const newHash = await hashPin(newPin);

    const { error: updateError } = await db
      .from('silent_shields')
      .update({ Edit_pin_hash: newHash, last_updated_at: new Date().toISOString() })
      .eq('id', shieldId);

    if (updateError) {
      console.error('PIN reset error:', updateError);
      return NextResponse.json({ error: 'Failed to reset PIN' }, { status: 500 });
    }

    return NextResponse.json({ message: 'PIN reset successfully' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
