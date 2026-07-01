-- Sprint 4: Silent Shield Premium subscriptions table
-- Run this in Supabase SQL Editor before deploying Sprint 4.

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan                   text check (plan in ('monthly', 'annual')),
  status                 text not null default 'incomplete'
                           check (status in ('active', 'past_due', 'canceled', 'incomplete')),
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Owners can read their own subscription row only.
-- All writes come from the service role (webhook handler).
alter table public.subscriptions enable row level security;

create policy "Owner can read own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = owner_id);
