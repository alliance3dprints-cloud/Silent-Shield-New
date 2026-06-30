import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { logNotification, type NotificationEventType } from './log';
import { isRateLimited, updateRateLimit } from './rateLimit';
import { sendEmailNotification } from './channels/email';

export async function notifyOwners(shieldId: string, eventType: NotificationEventType) {
  try {
    const db = getServiceRoleClient();

    const { data: owners, error: ownersError } = await db
      .from('shield_owners')
      .select('owner_id')
      .eq('shield_id', shieldId);

    if (ownersError || !owners || owners.length === 0) {
      await logNotification({
        shieldId,
        ownerId: '00000000-0000-0000-0000-000000000000',
        channel: 'email',
        eventType,
        status: 'skipped_no_owner',
      });
      return;
    }

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

      const { data: prefs } = await db
        .from('notification_preferences')
        .select('email_enabled, sms_enabled, push_enabled')
        .eq('owner_id', owner_id)
        .eq('shield_id', shieldId)
        .maybeSingle();

      const emailEnabled = prefs?.email_enabled ?? true;

      // --- Email ---
      if (!emailEnabled) {
        await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'skipped_disabled' });
      } else {
        const rateLimited = await isRateLimited(shieldId, 'email');
        if (rateLimited) {
          await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'skipped_rate_limit' });
        } else {
          try {
            if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM_EMAIL) {
              await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'skipped_missing_email_config' });
            } else {
              const { data: { user } } = await db.auth.admin.getUserById(owner_id);
              const email = user?.email;
              if (!email) {
                await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'failed', errorMessage: 'No email address on owner account' });
              } else {
                await sendEmailNotification({ to: email, shieldName, shieldId });
                await updateRateLimit(shieldId, 'email');
                await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'sent' });
              }
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await logNotification({ shieldId, ownerId: owner_id, channel: 'email', eventType, status: 'failed', errorMessage: message });
          }
        }
      }

      // --- SMS (future) ---
      // if (prefs?.sms_enabled) { ... }

      // --- Push (future) ---
      // if (prefs?.push_enabled) { ... }
    }
  } catch (err) {
    console.error('notifyOwners failed silently:', err);
  }
}
