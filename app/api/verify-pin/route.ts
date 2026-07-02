import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { verifyPin, hashPin } from '@/lib/pin';
import { isPinLocked, recordPinFailure, clearPinAttempts } from '@/lib/pinRateLimit';

export async function POST(req: NextRequest) {
  try {
    const { shieldId, pin } = await req.json();

    if (!shieldId || !pin) {
      return NextResponse.json({ error: 'Missing shieldId or pin' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (await isPinLocked(shieldId, ip)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait 15 minutes and try again, or use "Forgot PIN?" to recover access.' },
        { status: 429 },
      );
    }

    // Service role so the hash stays unreadable by the public anon key.
    const db = getServiceRoleClient();
    const { data: row, error } = await db
      .from('silent_shields')
      .select('*')
      .eq('id', shieldId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: 'Shield not found' }, { status: 404 });
    }

    const { ok, legacy } = await verifyPin(pin, row.Edit_pin_hash);

    if (!ok) {
      await recordPinFailure(shieldId, ip);
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    // Upgrade a matched legacy SHA-256 hash to bcrypt.
    if (legacy) {
      const upgraded = await hashPin(pin);
      await db.from('silent_shields').update({ Edit_pin_hash: upgraded }).eq('id', shieldId);
    }

    await clearPinAttempts(shieldId, ip);

    const { Edit_pin_hash, ...safeRow } = row;
    return NextResponse.json({ data: safeRow });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
