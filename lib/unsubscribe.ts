import crypto from 'crypto';

// Signed, stateless unsubscribe tokens so an email link can turn off scan
// alerts for one owner+shield without a login. Signed with the server-only
// service-role key so tokens can't be forged.

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'insecure-dev-secret';
}

export function makeUnsubscribeToken(shieldId: string, ownerId: string): string {
  const payload = Buffer.from(`${shieldId}.${ownerId}`).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string,
): { shieldId: string; ownerId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  const decoded = Buffer.from(payload, 'base64url').toString();
  const [shieldId, ownerId] = decoded.split('.');
  if (!shieldId || !ownerId) return null;
  return { shieldId, ownerId };
}
