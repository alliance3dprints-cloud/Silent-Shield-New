import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { hashPin } from '@/lib/pin';

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

    if (!shieldId || !pin || typeof fields !== 'object' || fields === null) {
      return NextResponse.json({ error: 'Missing shieldId, pin, or fields' }, { status: 400 });
    }

    if (typeof pin !== 'string' || pin.length < 4 || pin.length > 10) {
      return NextResponse.json({ error: 'PIN must be 4-10 characters' }, { status: 400 });
    }

    const db = getServiceRoleClient();

    const { data: existing } = await db
      .from('silent_shields')
      .select('id, Activated')
      .eq('id', shieldId)
      .maybeSingle();

    if (existing?.Activated === true) {
      return NextResponse.json(
        { error: 'This Silent Shield has already been activated.' },
        { status: 409 },
      );
    }

    const record: Record<string, unknown> = { id: shieldId };
    for (const key of EDITABLE_FIELDS) {
      if (key in fields) record[key] = fields[key];
    }
    record.profile_type = record.profile_type || 'general';
    record.Edit_pin_hash = await hashPin(pin);
    record.Activated = true;
    record.activated_at = new Date().toISOString();
    record.last_updated_at = new Date().toISOString();

    // Upsert so a pre-provisioned (issued, unactivated) row is filled in rather than duplicated.
    const { error } = await db
      .from('silent_shields')
      .upsert(record, { onConflict: 'id' });

    if (error) {
      console.error('Activate error:', error);
      return NextResponse.json({ error: 'Activation failed. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('activate route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
