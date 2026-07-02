import { Resend } from 'resend';
import { makeUnsubscribeToken } from '@/lib/unsubscribe';

export async function sendEmailNotification({
  to,
  shieldName,
  shieldId,
  ownerId,
}: {
  to: string;
  shieldName: string;
  shieldId: string;
  ownerId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL ?? 'alerts@alliance3dprints.com';
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://silentshield.app').replace(/\/$/, '');

  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const resend = new Resend(apiKey);

  const scannedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const manageUrl = `${base}/account`;
  const unsubUrl = `${base}/api/unsubscribe?token=${makeUnsubscribeToken(shieldId, ownerId)}`;

  const { error } = await resend.emails.send({
    from: `Silent Shield Alerts <${from}>`,
    to,
    subject: `Silent Shield scanned: ${shieldName}`,
    // RFC 8058 one-click unsubscribe — required by Gmail/Yahoo bulk sender rules.
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1e293b;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#ef4444;margin:0 0 16px;">
          Silent Shield Scan Alert
        </p>

        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">
          Someone viewed ${shieldName}'s profile
        </h1>

        <p style="font-size:14px;color:#475569;margin:0 0 24px;">
          This is your scan notification. Someone tapped the Silent Shield NFC tag and viewed the emergency profile.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Shield</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${shieldName}</p>

          <p style="margin:12px 0 4px;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Scanned At</p>
          <p style="margin:0;font-size:14px;color:#0f172a;">${scannedAt}</p>
        </div>

        <p style="font-size:12px;color:#94a3b8;margin:0 0 4px;">
          If you weren't expecting this scan, make sure the right person is wearing this shield.
        </p>

        <p style="font-size:11px;color:#cbd5e1;margin:24px 0 0;border-top:1px solid #e2e8f0;padding-top:16px;">
          You are receiving this because you have scan notifications enabled for this shield.<br/>
          <a href="${manageUrl}" style="color:#ef4444;">Manage notifications</a> &nbsp;·&nbsp;
          <a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe</a>
        </p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
