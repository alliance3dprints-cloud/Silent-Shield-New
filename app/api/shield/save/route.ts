import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { verifyPin, hashPin } from '@/lib/pin';

// Columns an owner is allowed to write. Everything else (id, Edit_pin_hash,
// Activated, activated_at) is off-limits and enforced server-side.
const EDITABLE_FIELDS = [
  'profile_type', 'Name', 'Date_of_Birth', 'Address', 'photo_url',
  'owner_email', 'owner_email_consent',
  'Emergency_Contact_Name', 'Emergency_Contact_Phone', 'contact_1_relationship',
  'contact_2_name', 'contact_2_phone', 'contact_2_relationship',
  'conditions', 'allergies', 'medications', 'blood_type',
  'critical_notes', 'emergency_instructions',
] as const;

export async function POST(req: NextRequest) {
  try {
    const { shieldId, pin, fields } = await req.json();

    if (!shieldId || typeof fields !== 'object' || fields === null) {
      return NextResponse.json({ error: 'Missing shieldId or fields' }, { status: 400 });
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

    // Authorize by account ownership first, then fall back to PIN.
    let authorized = false;

    const user = await getAuthenticatedUser(req);
    if (user) {
      const { data: ownership } = await db
        .from('shield_owners')
        .select('id')
        .eq('shield_id', shieldId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (ownership) authorized = true;
    }

    if (!authorized && pin) {
      const { ok, legacy } = await verifyPin(pin, shield.Edit_pin_hash);
      if (ok) {
        authorized = true;
        // Transparently upgrade a legacy SHA-256 hash to bcrypt on success.
        if (legacy) {
          const upgraded = await hashPin(pin);
          await db.from('silent_shields').update({ Edit_pin_hash: upgraded }).eq('id', shieldId);
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Not authorized to edit this shield' }, { status: 403 });
    }

    // Build the update from the whitelist only.
    const update: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in fields) update[key] = fields[key];
    }
    update.last_updated_at = new Date().toISOString();

    const { error: updateError } = await db
      .from('silent_shields')
      .update(update)
      .eq('id', shieldId);

    if (updateError) {
      console.error('Shield save error:', updateError);
      return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('save route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
