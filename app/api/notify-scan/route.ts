import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const RATE_LIMIT_MINUTES = 5;

export async function POST(req: NextRequest) {
  try {
    const { shieldId, ip, userAgent } = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY);

    if (!shieldId) {
      return NextResponse.json({ error: 'Missing shieldId' }, { status: 400 });
    }

    const { data: shield, error: shieldError } = await supabase
      .from('silent_shields')
      .select('Name, owner_email, subscription_tier, notify_on_scan')
      .eq('id', shieldId)
      .maybeSingle();

    if (shieldError || !shield) {
      return NextResponse.json({ error: 'Shield not found' }, { status: 404 });
    }

    if (
      shield.subscription_tier !== 'premium' ||
      !shield.notify_on_scan ||
      !shield.owner_email
    ) {
      return NextResponse.json({ skipped: true });
    }

    const cutoff = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();

    const { data: recentScans } = await supabase
      .from('scan_events')
      .select('id')
      .eq('shield_id', shieldId)
      .gte('scanned_at', cutoff)
      .order('scanned_at', { ascending: false })
      .limit(2);

    if (recentScans && recentScans.length > 1) {
      return NextResponse.json({ skipped: true, reason: 'rate_limited' });
    }

    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const profileName = shield.Name || 'Unknown';
    const locationHint = ip ? ` from IP ${ip}` : '';

    const { error: emailError } = await resend.emails.send({
      from: 'Silent Shield <alerts@silentshield.com>',
      to: shield.owner_email,
      subject: `Silent Shield Scanned — ${profileName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; background: #fef2f2; color: #ef4444; border: 1px solid #fecaca;">
              Scan Alert
            </span>
          </div>

          <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; text-align: center; margin: 0 0 8px;">
            ${profileName}'s Silent Shield was scanned
          </h1>

          <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0 0 24px;">
            ${timeStr}${locationHint}
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #475569; margin: 0 0 8px;">
              <strong>Shield ID:</strong> ${shieldId}
            </p>
            <p style="font-size: 13px; color: #475569; margin: 0 0 8px;">
              <strong>Time:</strong> ${timeStr}
            </p>
            ${userAgent ? `<p style="font-size: 13px; color: #475569; margin: 0;"><strong>Device:</strong> ${userAgent.substring(0, 80)}</p>` : ''}
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://silentshield.com'}/p/${shieldId}"
               style="display: inline-block; padding: 10px 24px; background: #ef4444; color: #fff; font-size: 14px; font-weight: 600; border-radius: 8px; text-decoration: none;">
              View Profile
            </a>
          </div>

          <p style="font-size: 11px; color: #94a3b8; text-align: center;">
            You're receiving this because scan alerts are enabled for this Silent Shield.
            To manage notifications, edit your shield profile.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return NextResponse.json({ error: 'Email failed' }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('notify-scan error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
