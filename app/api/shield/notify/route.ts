import { NextRequest, NextResponse } from 'next/server';
import { notifyOwners } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const { shieldId } = await req.json();
    if (!shieldId || typeof shieldId !== 'string') {
      return NextResponse.json({ error: 'Missing shieldId' }, { status: 400 });
    }
    await notifyOwners(shieldId, 'scan');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
