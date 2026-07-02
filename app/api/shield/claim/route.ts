import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { verifyPin, hashPin } from '@/lib/pin';
import { setMarketingOptIn } from '@/lib/marketing';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { shieldId, pin, marketingOptIn } = await req.json();

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

    const { ok, legacy } = await verifyPin(pin, shield.Edit_pin_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }
    if (legacy) {
      const upgraded = await hashPin(pin);
      await db.from('silent_shields').update({ Edit_pin_hash: upgraded }).eq('id', shieldId);
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

    // Seed default notification preferences (email on, sms/push off)
    await db.from('notification_preferences').upsert({
      owner_id: user.id,
      shield_id: shieldId,
      email_enabled: true,
      sms_enabled: false,
      push_enabled: false,
    });

    if (marketingOptIn === true) {
      await setMarketingOptIn(user.id, user.email ?? '', true);
    }

    return NextResponse.json({ message: 'Shield claimed successfully' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
