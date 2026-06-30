import { Resend } from 'resend';

export async function sendEmailNotification({
  to,
  shieldName,
  shieldId,
}: {
  to: string;
  shieldName: string;
  shieldId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL ?? 'alerts@alliance3dprints.com';

  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const resend = new Resend(apiKey);

  const scannedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const { error } = await resend.emails.send({
    from: `Silent Shield Alerts <${from}>`,
    to,
    subject: `Your Silent Shield was scanned — ${shieldName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1e293b;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#ef4444;margin:0 0 16px;">
          Silent Shield Alert
        </p>

        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">
          Your shield was scanned
        </h1>

        <p style="font-size:14px;color:#475569;margin:0 0 24px;">
          Someone tapped or scanned your Silent Shield and viewed the emergency profile.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Shield</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${shieldName}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;font-family:monospace;">${shieldId}</p>

          <p style="margin:12px 0 4px;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Scanned At</p>
          <p style="margin:0;font-size:14px;color:#0f172a;">${scannedAt}</p>
        </div>

        <p style="font-size:12px;color:#94a3b8;margin:0 0 4px;">
          If this was unexpected, ensure the correct person is carrying this shield.
        </p>

        <p style="font-size:11px;color:#cbd5e1;margin:24px 0 0;border-top:1px solid #e2e8f0;padding-top:16px;">
          You are receiving this because you have scan notifications enabled for this shield.
          Sign in to <a href="https://silentshield.com/account" style="color:#ef4444;">My Account</a> to manage your preferences.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
