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

    const { data: row, error } = await supabase
      .from('silent_shields')
      .select('*')
      .eq('id', shieldId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: 'Shield not found' }, { status: 404 });
    }

    const enteredHash = await hashPin(pin);

    if (!row.Edit_pin_hash || enteredHash !== row.Edit_pin_hash) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    const { Edit_pin_hash, ...safeRow } = row;

    return NextResponse.json({ data: safeRow });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
