-- ============================================================
-- The Kiasu Guide — Initial Schema
-- Applied: 2026-03-19 (reconstructed from live DB)
-- ============================================================
-- This migration captures the full production schema as of
-- the project's initial build phase. All tables were originally
-- created via Supabase MCP calls; this file is the authoritative
-- source-of-truth going forward.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Helper functions ────────────────────────────────────────

-- is_admin(): used in RLS policies — SECURITY DEFINER to avoid
-- circular reads when querying client_profiles itself
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.client_profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- handle_updated_at(): stamp updated_at on every UPDATE
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- create_profiles_on_signup(): fires on auth.users INSERT —
-- creates client_profiles + legacy profiles rows
create or replace function public.create_profiles_on_signup()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.client_profiles (user_id, role, pipeline_status, pdpa_consent)
  values (new.id, 'client', 'prospect', false)
  on conflict (user_id) do nothing;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;

  return new;
end;
$$;

-- handle_new_user(): legacy trigger (kept for backward compat)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── Legacy tables (V1 — kept for backward compat) ───────────

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  role            text not null default 'client',
  phone           text,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- ─────────────────────────────────────────────────────────────

create table if not exists public.financial_profiles (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  age               integer not null,
  monthly_income    numeric(12,2) not null default 0,
  monthly_expenses  numeric(12,2) not null default 0,
  current_savings   numeric(14,2) not null default 0,
  cpf_balance       numeric(14,2) not null default 0,
  retirement_age    integer not null default 65,
  risk_profile      text not null default 'moderate',
  investment_goals  text,
  existing_insurance text,
  notes             text,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create trigger handle_financial_profiles_updated_at
  before update on public.financial_profiles
  for each row execute function public.handle_updated_at();

alter table public.financial_profiles enable row level security;

create policy "Users can view own financial profile"
  on public.financial_profiles for select using (auth.uid() = user_id);

create policy "Users can insert own financial profile"
  on public.financial_profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own financial profile"
  on public.financial_profiles for update using (auth.uid() = user_id);

create policy "Admins can view all financial profiles"
  on public.financial_profiles for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "financial_profiles_admin_read"
  on public.financial_profiles for select
  using (is_admin() or (user_id = auth.uid()));

-- ─── Core tables ─────────────────────────────────────────────

create table if not exists public.client_profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  preferred_name        text,
  dob                   date,
  sex                   text,                     -- 'male','female','other','prefer_not_to_say'
  height_cm             numeric,
  weight_kg             numeric,
  pre_existing          text,
  pdpa_consent          boolean default false,
  employment_status     text,
  monthly_income        numeric default 0,
  monthly_expenses      numeric default 0,
  num_dependents        integer default 0,
  liquid_savings        numeric default 0,
  cpf_oa                numeric default 0,
  cpf_sa                numeric default 0,
  cpf_ma                numeric default 0,
  property_value        numeric default 0,
  property_liquid       boolean default false,
  monthly_investment    numeric default 0,
  portfolio_value       numeric default 0,
  target_return_rate    numeric default 0.06,
  retirement_age        integer default 65,
  desired_monthly_income numeric default 5000,
  dividend_yield        numeric default 0.04,
  inflation_rate        numeric default 0.03,
  role                  text default 'client',    -- 'client' | 'admin'
  pipeline_status       text default 'prospect',  -- 'prospect','active','review_due','inactive'
  created_at            timestamptz default timezone('utc', now()),
  updated_at            timestamptz default timezone('utc', now())
);

alter table public.client_profiles enable row level security;

create policy "client_profiles_select"
  on public.client_profiles for select
  using (user_id = auth.uid() or is_admin());

create policy "client_profiles_insert_own"
  on public.client_profiles for insert
  with check (user_id = auth.uid());

create policy "client_profiles_update_own"
  on public.client_profiles for update
  using (user_id = auth.uid());

create policy "client_profiles_admin_update"
  on public.client_profiles for update
  using (user_id = auth.uid() or is_admin());

-- ─────────────────────────────────────────────────────────────

create table if not exists public.benefit_blocks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  benefit_type    text not null,    -- 'death','tpd','ci','hospitalisation','income_loss'
  policy_name     text,
  coverage        numeric default 0,
  payout_mode     text default 'lump_sum',  -- 'lump_sum' | 'monthly'
  multiplier      numeric default 1,
  max_claims      integer,
  cooldown_years  integer,
  expiry_age      integer,
  renewal_date    date,
  enabled         boolean default true,
  created_at      timestamptz default timezone('utc', now()),
  updated_at      timestamptz default timezone('utc', now())
);

alter table public.benefit_blocks enable row level security;

create policy "benefit_blocks_select"
  on public.benefit_blocks for select
  using (user_id = auth.uid() or is_admin());

create policy "benefit_blocks_write_own"
  on public.benefit_blocks for insert
  with check (user_id = auth.uid());

create policy "benefit_blocks_update_own"
  on public.benefit_blocks for update
  using (user_id = auth.uid());

create policy "benefit_blocks_delete_own"
  on public.benefit_blocks for delete
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────

create table if not exists public.case_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_id   uuid not null references auth.users(id),
  note_type   text default 'admin_only',   -- 'admin_only' | 'client_visible'
  content     text not null,
  created_at  timestamptz default timezone('utc', now()),
  updated_at  timestamptz default timezone('utc', now())
);

alter table public.case_notes enable row level security;

create policy "case_notes_select"
  on public.case_notes for select
  using (
    is_admin() or
    (user_id = auth.uid() and note_type = 'client_visible')
  );

create policy "case_notes_insert"
  on public.case_notes for insert
  with check (is_admin() or author_id = auth.uid());

create policy "case_notes_update"
  on public.case_notes for update
  using (is_admin() or author_id = auth.uid());

create policy "case_notes_delete"
  on public.case_notes for delete
  using (is_admin() or author_id = auth.uid());

-- ─────────────────────────────────────────────────────────────

create table if not exists public.daily_quotes (
  id        uuid primary key default gen_random_uuid(),
  category  text default 'money',    -- 'money' | 'life' | 'business'
  quote     text not null,
  author    text,
  active    boolean default true
);

alter table public.daily_quotes enable row level security;

create policy "daily_quotes_select"
  on public.daily_quotes for select
  using (true);

-- Seed quotes
insert into public.daily_quotes (category, quote, author, active) values
  ('money', 'Do not save what is left after spending; instead, spend what is left after saving.', 'Warren Buffett', true),
  ('money', 'An investment in knowledge pays the best interest.', 'Benjamin Franklin', true),
  ('life', 'The best time to plant a tree was 20 years ago. The second best time is now.', 'Chinese Proverb', true),
  ('business', 'Price is what you pay. Value is what you get.', 'Warren Buffett', true),
  ('money', 'Financial peace isn''t the acquisition of stuff. It''s learning to live on less than you make.', 'Dave Ramsey', true)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────

create table if not exists public.documents (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  file_url            text not null,
  document_type       text,           -- 'policy_schedule','payslip','tax_notice','other'
  extraction_status   text default 'pending',  -- 'pending','processing','done','failed'
  confidence_score    numeric,
  created_at          timestamptz default timezone('utc', now())
);

alter table public.documents enable row level security;

create policy "documents_own"
  on public.documents for all
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────

create table if not exists public.lead_forms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  source      text default 'landing',
  created_at  timestamptz default timezone('utc', now())
);

alter table public.lead_forms enable row level security;

create policy "lead_forms_insert"
  on public.lead_forms for insert
  with check (true);

-- ─────────────────────────────────────────────────────────────

create table if not exists public.policy_reminders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  policy_name     text not null,
  reminder_date   date not null,
  note            text,
  dismissed       boolean default false,
  created_at      timestamptz default timezone('utc', now())
);

alter table public.policy_reminders enable row level security;

create policy "policy_reminders_own"
  on public.policy_reminders for all
  using (user_id = auth.uid());

-- ─── Auth trigger ────────────────────────────────────────────
-- Fires on every new signup; creates client_profiles + profiles rows

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profiles_on_signup();
