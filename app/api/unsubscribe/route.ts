import { NextRequest } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

function page(title: string, message: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Silent Shield</title></head>
  <body style="margin:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;">
    <div style="max-width:420px;text-align:center;background:#020617;border:1px solid #334155;border-radius:16px;padding:32px;">
      <p style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ef4444;margin:0 0 12px;">Silent Shield</p>
      <h1 style="font-size:22px;margin:0 0 10px;color:#fff;">${title}</h1>
      <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 20px;">${message}</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || '/'}/account" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600;">Manage notifications</a>
    </div>
  </body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function unsubscribe(token: string | null): Promise<Response> {
  if (!token) return page('Invalid link', 'This unsubscribe link is missing or malformed.');

  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) return page('Invalid link', 'This unsubscribe link is invalid or has expired.');

  try {
    const db = getServiceRoleClient();
    await db.from('notification_preferences').upsert(
      { owner_id: parsed.ownerId, shield_id: parsed.shieldId, email_enabled: false },
      { onConflict: 'owner_id,shield_id' },
    );
  } catch (err) {
    console.error('unsubscribe error:', err);
    return page('Something went wrong', 'We could not update your preferences. Please try again from your account.');
  }

  return page(
    'Unsubscribed',
    'You will no longer receive scan alert emails for this shield. You can turn them back on anytime from your account.',
  );
}

// GET for the email link; POST for RFC 8058 one-click (List-Unsubscribe-Post).
export async function GET(req: NextRequest) {
  return unsubscribe(req.nextUrl.searchParams.get('token'));
}

export async function POST(req: NextRequest) {
  return unsubscribe(req.nextUrl.searchParams.get('token'));
}
