-- Sprint: Launch security hardening (SEC-01, SEC-02, SEC-03)
--
-- ⚠️  ROLLOUT ORDER — READ FIRST:
--   1. Deploy this session's application code and confirm it is LIVE.
--      (All shield writes now go through server routes using the service-role
--       key, which bypasses these grants. The public page reads only the
--       safe columns granted below.)
--   2. Smoke-test on the live deploy: activate, edit/save, view profile, scan.
--   3. THEN run this migration.
--   Running it before the new code is live will break activation and editing.
--
-- WHAT THIS DOES: permission changes only. It does NOT modify, delete, or
-- truncate any row. It does NOT enable RLS or drop any policy. It only removes
-- the public keys' ability to WRITE the shield table, and limits what columns
-- they can READ (excluding Edit_pin_hash and owner_email).
--
-- Wrapped in a transaction: if any statement errors (e.g. a column name
-- mismatch), the whole thing rolls back and nothing changes.

begin;

-- ── SEC-03: Edit PIN brute-force tracking (new table, purely additive) ──
create table if not exists public.pin_attempts (
  id         uuid primary key default gen_random_uuid(),
  shield_id  text not null,
  ip         text not null,
  created_at timestamptz not null default now()
);

create index if not exists pin_attempts_lookup
  on public.pin_attempts (shield_id, ip, created_at);

alter table public.pin_attempts enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this table.

-- ── SEC-01 / SEC-02: make the public keys READ-ONLY and column-limited ──
--
-- Today anon + authenticated hold INSERT/UPDATE/DELETE/TRUNCATE on the shield
-- table — anyone with the public browser key can overwrite a user's data.
-- Remove ALL their privileges, then grant back SELECT on the display columns
-- only. Edit_pin_hash and owner_email are deliberately NOT granted, so the
-- public key can never read them.

revoke all on table public.silent_shields from anon;
revoke all on table public.silent_shields from authenticated;

grant select (
  id,
  "Activated",
  "Name",
  "Date_of_Birth",
  photo_url,
  profile_type,
  conditions,
  allergies,
  medications,
  blood_type,
  critical_notes,
  emergency_instructions,
  "Medical_Info",
  "Notes",
  "Emergency_Contact_Name",
  "Emergency_Contact_Phone",
  contact_1_relationship,
  contact_2_name,
  contact_2_phone,
  contact_2_relationship,
  "Address",
  last_updated_at,
  activated_at
) on public.silent_shields to anon, authenticated;

commit;

-- ─────────────────────────────────────────────────────────────
-- INSTANT ROLLBACK (only if something breaks after running):
--   grant all on table public.silent_shields to anon, authenticated;
-- That restores the exact prior access. No data is ever affected either way.
-- ─────────────────────────────────────────────────────────────
