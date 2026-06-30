import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

export type NotificationStatus =
  | 'sent'
  | 'skipped_rate_limit'
  | 'skipped_disabled'
  | 'skipped_no_owner'
  | 'skipped_no_subscription'
  | 'skipped_missing_email_config'
  | 'failed';

export type NotificationChannel = 'email' | 'sms' | 'push';
export type NotificationEventType = 'scan';

export async function logNotification({
  shieldId,
  ownerId,
  channel,
  eventType,
  status,
  errorMessage,
}: {
  shieldId: string;
  ownerId: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  status: NotificationStatus;
  errorMessage?: string;
}) {
  try {
    const db = getServiceRoleClient();
    await db.from('notification_log').insert({
      shield_id: shieldId,
      owner_id: ownerId,
      channel,
      event_type: eventType,
      status,
      error_message: errorMessage ?? null,
    });
  } catch (err) {
    console.error('Failed to write notification log:', err);
  }
}
