-- Marketing opt-in: a clean, consented, exportable list of account holders
-- who want product-update emails. Source of truth lives here; you can export
-- opted-in addresses or sync them to a Resend Audience.

create table if not exists public.marketing_opt_in (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  opted_in   boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.marketing_opt_in enable row level security;

-- Owners may read their own preference; all writes go through the service role.
create policy "Owner can read own marketing pref"
  on public.marketing_opt_in
  for select
  using (auth.uid() = user_id);

-- To export your list for a campaign, run (as service role / SQL editor):
--   select email from public.marketing_opt_in where opted_in = true;
