-- Sprint: Launch security hardening (SEC-01, SEC-03) — ROBUST VERSION
--
-- ⚠️  This replaces an earlier version that used column-level GRANT SELECT.
-- Column-level grants are fragile with Supabase/PostgREST (they can break the
-- public read path when the schema cache refreshes). This version does NOT
-- touch SELECT or columns at all — it only removes the public keys' ability to
-- WRITE. Reads are completely unaffected.
--
-- Safe because every write in the app now goes through server routes using the
-- service-role key, which bypasses these grants. Revoking anon/authenticated
-- write access cannot break activation, editing, claiming, or scanning.
--
-- Prerequisite: this session's server-side write code must be deployed & live
-- (it already is). Then run this. No data is modified. No SELECT is changed.

begin;

-- ── SEC-03: Edit PIN brute-force tracking (idempotent) ──
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

-- ── SEC-01: block writes from the public browser keys ──
-- Removes INSERT/UPDATE/DELETE/TRUNCATE only. SELECT is deliberately left
-- intact so the public profile keeps reading normally. All legitimate writes
-- go through the service role, which is unaffected by these grants.
revoke insert, update, delete, truncate on table public.silent_shields from anon;
revoke insert, update, delete, truncate on table public.silent_shields from authenticated;

commit;

-- ─────────────────────────────────────────────────────────────
-- INSTANT ROLLBACK (restores full access, incl. writes):
--   grant all on table public.silent_shields to anon, authenticated;
-- Non-destructive either way — no row is ever affected.
-- ─────────────────────────────────────────────────────────────
