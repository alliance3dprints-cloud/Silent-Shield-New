-- Sprint: Launch security hardening (SEC-01, SEC-02, SEC-03)
--
-- IMPORTANT ROLLOUT ORDER:
--   1. Deploy the application code that ships with this migration FIRST.
--      (All shield writes now go through server routes using the service role,
--       and the public profile selects explicit columns — not select *.)
--   2. THEN run this migration.
--   Running it before the new code is live will break saves and the public page.

-- ─────────────────────────────────────────────────────────────
-- SEC-03: Edit PIN brute-force tracking
-- ─────────────────────────────────────────────────────────────
create table if not exists public.pin_attempts (
  id         uuid primary key default gen_random_uuid(),
  shield_id  text not null,
  ip         text not null,
  created_at timestamptz not null default now()
);

create index if not exists pin_attempts_lookup
  on public.pin_attempts (shield_id, ip, created_at);

alter table public.pin_attempts enable row level security;
-- No policies: only the service role (which bypasses RLS) may read/write it.

-- ─────────────────────────────────────────────────────────────
-- SEC-01 / SEC-02: make the anon (public browser) key READ-ONLY and
-- unable to see sensitive columns.
--
-- The public profile page reads with the anon key. It must be able to SELECT
-- the display columns, but NEVER Edit_pin_hash or owner_email, and must not be
-- able to INSERT / UPDATE / DELETE. All writes now happen server-side with the
-- service role, which bypasses these grants entirely.
-- ─────────────────────────────────────────────────────────────

-- Remove any blanket table privileges the anon/authenticated roles may hold.
revoke all on table public.silent_shields from anon;
revoke all on table public.silent_shields from authenticated;

-- Grant SELECT only on the non-sensitive columns to the public roles.
grant select (
  id, "Activated", "Name", "Date_of_Birth", photo_url, profile_type,
  conditions, allergies, medications, blood_type,
  critical_notes, emergency_instructions, "Medical_Info", "Notes",
  "Emergency_Contact_Name", "Emergency_Contact_Phone", contact_1_relationship,
  contact_2_name, contact_2_phone, contact_2_relationship,
  "Address", last_updated_at, activated_at
) on public.silent_shields to anon, authenticated;

-- Ensure RLS is on and a permissive SELECT policy exists so the column grants
-- above are actually usable by the public roles. (Column privileges gate WHICH
-- columns; the RLS policy gates WHICH rows — here, all rows are publicly viewable
-- by design, since anyone who scans a shield must see the emergency profile.)
alter table public.silent_shields enable row level security;

drop policy if exists "Public can read shields" on public.silent_shields;
create policy "Public can read shields"
  on public.silent_shields
  for select
  to anon, authenticated
  using (true);

-- Note: no INSERT/UPDATE/DELETE policies for anon/authenticated are created,
-- so the public roles cannot write. Edit_pin_hash and owner_email are excluded
-- from the column grant, so they are unreadable via the anon key.
