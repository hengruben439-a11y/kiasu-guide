-- ============================================================
-- Health score history — one record per user per day
-- Applied: 2026-03-21
-- ============================================================

create table if not exists public.health_score_history (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  recorded_date         date not null default current_date,
  score                 int not null,
  dim_protection        int not null default 0,
  dim_retirement        int not null default 0,
  dim_liquidity         int not null default 0,
  dim_debt              int not null default 0,
  dim_investment        int not null default 0,
  created_at            timestamptz default timezone('utc', now()),
  unique (user_id, recorded_date)
);

alter table public.health_score_history enable row level security;

create policy "health_score_history_own"
  on public.health_score_history for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
