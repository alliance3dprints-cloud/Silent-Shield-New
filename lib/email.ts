// Shared, strict email normalization + validation.
// Rejects the real-world mistakes our old regex let through: trailing dots
// (name@gmail.com.), doubled dots (name@@ / a..b), leading/trailing dots,
// and stray whitespace.

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);

  // Exactly one @, non-empty local and domain parts.
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;

  // No whitespace anywhere.
  if (/\s/.test(email)) return false;

  // No leading/trailing dots, and no consecutive dots, in either part.
  for (const part of [local, domain]) {
    if (part.startsWith('.') || part.endsWith('.')) return false;
    if (part.includes('..')) return false;
  }

  // Domain must have at least one dot and a 2+ char final label (…@x.co).
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  if (labels.some((l) => l.length === 0)) return false;
  if (labels[labels.length - 1].length < 2) return false;

  // Allowed characters (conservative but covers all normal addresses).
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+$/.test(email)) return false;

  return true;
}
