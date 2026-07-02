import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { Resend } from 'resend';

// Records a marketing preference. The Supabase table is the source of truth
// (exportable for campaigns); the Resend Audience sync is best-effort and only
// runs when RESEND_AUDIENCE_ID is configured.
export async function setMarketingOptIn(userId: string, email: string, optedIn: boolean) {
  const db = getServiceRoleClient();
  await db.from('marketing_opt_in').upsert(
    { user_id: userId, email, opted_in: optedIn, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );

  await syncResendAudience(email, optedIn);
}

async function syncResendAudience(email: string, optedIn: boolean) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) return; // sync is optional

  const resend = new Resend(apiKey);
  try {
    await resend.contacts.create({ audienceId, email, unsubscribed: !optedIn });
  } catch {
    try {
      await resend.contacts.update({ audienceId, email, unsubscribed: !optedIn });
    } catch (err) {
      console.error('Resend audience sync failed (non-fatal):', err);
    }
  }
}
