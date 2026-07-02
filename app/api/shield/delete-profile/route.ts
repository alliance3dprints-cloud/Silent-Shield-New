import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/lib/supabaseServiceRole';

// Permanently wipes a shield's emergency profile and deactivates it — for a
// lost or discarded tag whose data should no longer be scannable. Irreversible.
// Clears personal data, the photo, the PIN, activation, and unlinks the shield
// from the account. The tag reverts to an unactivated state.
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { shieldId } = await req.json();
    if (!shieldId) {
      return NextResponse.json({ error: 'Missing shieldId' }, { status: 400 });
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

    // Best-effort: remove any uploaded profile photos for this shield.
    try {
      const { data: files } = await db.storage.from('shield-profile-photos').list(shieldId);
      if (files && files.length > 0) {
        await db.storage
          .from('shield-profile-photos')
          .remove(files.map((f) => `${shieldId}/${f.name}`));
      }
    } catch (err) {
      console.error('Photo cleanup failed (non-fatal):', err);
    }

    // Wipe all personal data and revert the shield to unactivated.
    const { error: wipeError } = await db
      .from('silent_shields')
      .update({
        Name: null,
        Address: null,
        Emergency_Contact_Name: null,
        Emergency_Contact_Phone: null,
        Date_of_Birth: null,
        Medical_Info: null,
        Notes: null,
        photo_url: null,
        contact_2_name: null,
        contact_2_phone: null,
        contact_1_relationship: null,
        contact_2_relationship: null,
        conditions: null,
        allergies: null,
        medications: null,
        blood_type: null,
        critical_notes: null,
        emergency_instructions: null,
        profile_type: null,
        owner_email: null,
        owner_email_consent: false,
        Edit_pin_hash: null,
        Activated: false,
        activated_at: null,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', shieldId);

    if (wipeError) {
      console.error('Profile wipe error:', wipeError);
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
    }

    // Unlink from the account and clear its notification prefs.
    await db.from('notification_preferences').delete().eq('owner_id', user.id).eq('shield_id', shieldId);
    await db.from('shield_owners').delete().eq('owner_id', user.id).eq('shield_id', shieldId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('delete-profile route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
