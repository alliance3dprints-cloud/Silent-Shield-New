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

    const { shieldId, pin } = await req.json();

    if (!shieldId || !pin) {
      return NextResponse.json({ error: 'Missing shieldId or pin' }, { status: 400 });
    }

    const db = getServiceRoleClient();

    const { data: shield, error: shieldError } = await db
      .from('silent_shields')
      .select('id, Edit_pin_hash')
      .eq('id', shieldId)
      .maybeSingle();

    if (shieldError || !shield) {
      return NextResponse.json({ error: 'Shield not found' }, { status: 404 });
    }

    const enteredHash = await hashPin(pin);
    if (!shield.Edit_pin_hash || enteredHash !== shield.Edit_pin_hash) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    const { data: existing } = await db
      .from('shield_owners')
      .select('id, owner_id')
      .eq('shield_id', shieldId)
      .maybeSingle();

    if (existing) {
      if (existing.owner_id === user.id) {
        return NextResponse.json({ message: 'Already claimed by you' });
      }
      return NextResponse.json({ error: 'This shield is already claimed by another account' }, { status: 409 });
    }

    const { error: claimError } = await db
      .from('shield_owners')
      .insert({ owner_id: user.id, shield_id: shieldId });

    if (claimError) {
      console.error('Claim error:', claimError);
      return NextResponse.json({ error: 'Failed to claim shield' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Shield claimed successfully' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
