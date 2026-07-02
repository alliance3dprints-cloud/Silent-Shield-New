import bcrypt from 'bcryptjs';

// PINs are stored as bcrypt hashes. Older shields were stored as unsalted
// SHA-256 hex; verifyPin transparently accepts those and reports when the
// caller should upgrade the stored hash to bcrypt.

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const BCRYPT_ROUNDS = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

async function sha256Hex(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a PIN against a stored hash.
 * Returns { ok, legacy } where legacy=true means the stored value was an
 * old SHA-256 hash and matched — the caller should re-store a bcrypt hash.
 */
export async function verifyPin(
  pin: string,
  storedHash: string | null | undefined,
): Promise<{ ok: boolean; legacy: boolean }> {
  if (!storedHash) return { ok: false, legacy: false };

  if (SHA256_HEX.test(storedHash)) {
    const ok = (await sha256Hex(pin)) === storedHash.toLowerCase();
    return { ok, legacy: ok };
  }

  try {
    const ok = await bcrypt.compare(pin, storedHash);
    return { ok, legacy: false };
  } catch {
    return { ok: false, legacy: false };
  }
}
