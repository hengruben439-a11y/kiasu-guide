-- ============================================================
-- Cash flow expense categories — per-user persistent splits
-- Applied: 2026-03-21
-- ============================================================

create table if not exists public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  label       text not null,
  pct         numeric(6,2) not null default 0 check (pct >= 0 and pct <= 100),
  colour      text not null default '#a89070',
  sort_order  int not null default 0,
  created_at  timestamptz default timezone('utc', now()),
  updated_at  timestamptz default timezone('utc', now()),
  unique (user_id, key)
);

alter table public.expense_categories enable row level security;

create policy "expense_categories_own"
  on public.expense_categories for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger expense_categories_updated_at
  before update on public.expense_categories
  for each row execute function public.handle_updated_at();
