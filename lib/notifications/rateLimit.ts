import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import type { NotificationChannel } from './log';

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function isRateLimited(
  shieldId: string,
  channel: NotificationChannel,
): Promise<boolean> {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '') || DEFAULT_WINDOW_MS;

  try {
    const db = getServiceRoleClient();
    const { data } = await db
      .from('notification_rate_limits')
      .select('last_sent_at')
      .eq('shield_id', shieldId)
      .eq('channel', channel)
      .maybeSingle();

    if (!data) return false;

    const elapsed = Date.now() - new Date(data.last_sent_at).getTime();
    return elapsed < windowMs;
  } catch (err) {
    console.error('Rate limit check failed:', err);
    return false;
  }
}

export async function updateRateLimit(
  shieldId: string,
  channel: NotificationChannel,
) {
  try {
    const db = getServiceRoleClient();
    await db
      .from('notification_rate_limits')
      .upsert({ shield_id: shieldId, channel, last_sent_at: new Date().toISOString() });
  } catch (err) {
    console.error('Rate limit update failed:', err);
  }
}
