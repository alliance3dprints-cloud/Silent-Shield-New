import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { logNotification, type NotificationEventType } from './log';
import { isRateLimited, updateRateLimit } from './rateLimit';
import { sendEmailNotification } from './channels/email';

export async function notifyOwners(shieldId: string, eventType: NotificationEventType) {
  try {
    const db = getServiceRoleClient();

    // Fetch all owners of this shield with their auth email
    const { data: owners, error: ownersError } = await db
      .from('shield_owners')
      .select('owner_id')
      .eq('shield_id', shieldId);

    if (ownersError || !owners || owners.length === 0) return;

    // Fetch shield name once
    const { data: shield } = await db
      .from('silent_shields')
      .select('Name')
      .eq('id', shieldId)
      .maybeSingle();

    const shieldName = shield?.Name || shieldId;

    for (const { owner_id } of owners) {
      // [Future slot] Subscription check:
      // const tier = await getOwnerSubscriptionTier(owner_id);
      // if (!tierAllowsNotifications(tier)) {
      //   await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'skipped_no_subscription' });
      //   continue;
      // }

      // Load per-owner per-shield preferences
      const { data: prefs } = await db
        .from('notification_preferences')
        .select('email_enabled, sms_enabled, push_enabled')
        .eq('owner_id', owner_id)
        .eq('shield_id', shieldId)
        .maybeSingle();

      // Default to email enabled if no prefs row exists yet
      const emailEnabled = prefs?.email_enabled ?? true;
      const smsEnabled = prefs?.sms_enabled ?? false;
      const pushEnabled = prefs?.push_enabled ?? false;

      // --- Email ---
      if (emailEnabled) {
        const rateLimited = await isRateLimited(shieldId, 'email');
        if (rateLimited) {
          await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'skipped_rate_limit' });
        } else {
          try {
            const { data: { user } } = await db.auth.admin.getUserById(owner_id);
            const email = user?.email;
            if (email) {
              await sendEmailNotification({ to: email, shieldName, shieldId });
              await updateRateLimit(shieldId, 'email');
              await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'sent' });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'failed', errorMessage: message });
          }
        }
      } else {
        await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'skipped_disabled' });
      }

      // --- SMS (future) ---
      if (smsEnabled) {
        // sendSmsNotification(...) will go here
      }

      // --- Push (future) ---
      if (pushEnabled) {
        // sendPushNotification(...) will go here
      }
    }
  } catch (err) {
    // Never propagate — emergency profile page must not be affected
    console.error('notifyOwners failed silently:', err);
  }
}
