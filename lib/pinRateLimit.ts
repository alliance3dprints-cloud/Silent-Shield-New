import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

// Brute-force protection for the Edit PIN. Failed attempts are recorded per
// shield + IP; once the threshold is hit within the window, further attempts
// are blocked until the window rolls off.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export async function isPinLocked(shieldId: string, ip: string): Promise<boolean> {
  try {
    const db = getServiceRoleClient();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { count } = await db
      .from('pin_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('shield_id', shieldId)
      .eq('ip', ip)
      .gte('created_at', since);
    return (count ?? 0) >= MAX_ATTEMPTS;
  } catch (err) {
    // Fail open on infra error so legitimate owners are never locked out.
    console.error('PIN lock check failed:', err);
    return false;
  }
}

export async function recordPinFailure(shieldId: string, ip: string): Promise<void> {
  try {
    const db = getServiceRoleClient();
    await db.from('pin_attempts').insert({ shield_id: shieldId, ip });
  } catch (err) {
    console.error('PIN failure record failed:', err);
  }
}

export async function clearPinAttempts(shieldId: string, ip: string): Promise<void> {
  try {
    const db = getServiceRoleClient();
    await db.from('pin_attempts').delete().eq('shield_id', shieldId).eq('ip', ip);
  } catch (err) {
    console.error('PIN attempts clear failed:', err);
  }
}
