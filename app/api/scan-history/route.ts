import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const { shieldId, pin } = await req.json();

    if (!shieldId || !pin) {
      return NextResponse.json({ error: 'Missing shieldId or pin' }, { status: 400 });
    }

    const { data: shield, error: shieldError } = await supabase
      .from('silent_shields')
      .select('Edit_pin_hash, subscription_tier')
      .eq('id', shieldId)
      .maybeSingle();

    if (shieldError || !shield) {
      return NextResponse.json({ error: 'Shield not found' }, { status: 404 });
    }

    const enteredHash = await hashPin(pin);

    if (!shield.Edit_pin_hash || enteredHash !== shield.Edit_pin_hash) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    if (shield.subscription_tier !== 'premium') {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 });
    }

    const { data: events, error: eventsError } = await supabase
      .from('scan_events')
      .select('id, scanned_at, ip_address, user_agent')
      .eq('shield_id', shieldId)
      .order('scanned_at', { ascending: false })
      .limit(100);

    if (eventsError) {
      console.error(eventsError);
      return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }

    return NextResponse.json({ data: events || [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
