import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { shieldId, email_enabled } = await req.json();

    if (!shieldId || typeof email_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing shieldId or email_enabled' }, { status: 400 });
    }

    const db = getServiceRoleClient();

    // Verify caller owns this shield
    const { data: ownership } = await db
      .from('shield_owners')
      .select('id')
      .eq('shield_id', shieldId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!ownership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { error } = await db
      .from('notification_preferences')
      .upsert({
        owner_id: user.id,
        shield_id: shieldId,
        email_enabled,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Prefs update error:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Preferences updated' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
