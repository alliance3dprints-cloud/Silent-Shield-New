import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { verifyPin, hashPin } from '@/lib/pin';
import { setMarketingOptIn } from '@/lib/marketing';
import { normalizeEmail, isValidEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { shieldId, pin, email, marketingOptIn } = await req.json();

    if (!shieldId || !pin || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailLower = normalizeEmail(email);
    if (!isValidEmail(emailLower)) {
      return NextResponse.json({ error: 'Please enter a valid email address (check for extra dots or spaces).' }, { status: 400 });
    }

    const db = getServiceRoleClient();

    // Verify shield exists and PIN is correct
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

    // Find or create the Supabase user without sending any email.
    // email_confirm: true marks the address verified so they can sign in via magic link later.
    let userId: string;

    const { data: existingUsers, error: listError } = await db.auth.admin.listUsers();
    const existingUser = listError ? null : existingUsers?.users.find(u => u.email?.toLowerCase() === emailLower);

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: createError } = await db.auth.admin.createUser({
        email: emailLower,
        email_confirm: true,
      });

      if (createError || !newUser?.user) {
        console.error('createUser error:', createError);
        return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 });
      }

      userId = newUser.user.id;
    }

    // Check if already claimed
    const { data: existing } = await db
      .from('shield_owners')
      .select('id, owner_id')
      .eq('shield_id', shieldId)
      .maybeSingle();

    if (existing) {
      if (existing.owner_id === userId) {
        return NextResponse.json({ message: 'Already claimed by you', email: emailLower });
      }
      return NextResponse.json(
        { error: 'This shield is already claimed by another account' },
        { status: 409 }
      );
    }

    // Claim the shield
    const { error: claimError } = await db
      .from('shield_owners')
      .insert({ owner_id: userId, shield_id: shieldId });

    if (claimError) {
      console.error('Claim error:', claimError);
      return NextResponse.json({ error: 'Failed to claim shield' }, { status: 500 });
    }

    // Seed default notification preferences
    await db.from('notification_preferences').upsert({
      owner_id: userId,
      shield_id: shieldId,
      email_enabled: true,
      sms_enabled: false,
      push_enabled: false,
    });

    // Record marketing consent (explicit opt-in only).
    if (marketingOptIn === true) {
      await setMarketingOptIn(userId, emailLower, true);
    }

    return NextResponse.json({ message: 'Shield claimed successfully', email: emailLower });
  } catch (err) {
    console.error('claim-public error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
