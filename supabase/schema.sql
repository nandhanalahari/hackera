-- Hackera multi-user schema for Supabase
-- Run in SQL Editor for project: https://blrftevprbcbkduqhovk.supabase.co
-- Enables per-account progress, attempts, and reviews with RLS.

create extension if not exists "pgcrypto";

create table if not exists public.oa_progress (
  user_key text not null,
  problem_slug text not null,
  status text not null default 'todo',
  attempts int not null default 0,
  best_score int,
  last_code text,
  solved_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_key, problem_slug)
);

create table if not exists public.oa_attempts (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  problem_slug text not null,
  problem_title text,
  section text,
  code text,
  created_at timestamptz not null default now()
);

create table if not exists public.oa_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.oa_attempts(id) on delete set null,
  user_key text not null,
  problem_slug text not null,
  verdict text,
  score int,
  time_complexity text,
  space_complexity text,
  summary text,
  strengths jsonb default '[]'::jsonb,
  improvements jsonb default '[]'::jsonb,
  resources jsonb default '[]'::jsonb,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists oa_attempts_user_idx on public.oa_attempts(user_key, created_at desc);
create index if not exists oa_reviews_user_idx on public.oa_reviews(user_key, created_at desc);

alter table public.oa_progress enable row level security;
alter table public.oa_attempts enable row level security;
alter table public.oa_reviews enable row level security;

drop policy if exists "oa_progress_own" on public.oa_progress;
create policy "oa_progress_own" on public.oa_progress
  for all to authenticated
  using (user_key = auth.uid()::text)
  with check (user_key = auth.uid()::text);

drop policy if exists "oa_attempts_own" on public.oa_attempts;
create policy "oa_attempts_own" on public.oa_attempts
  for all to authenticated
  using (user_key = auth.uid()::text)
  with check (user_key = auth.uid()::text);

drop policy if exists "oa_reviews_own" on public.oa_reviews;
create policy "oa_reviews_own" on public.oa_reviews
  for all to authenticated
  using (user_key = auth.uid()::text)
  with check (user_key = auth.uid()::text);
