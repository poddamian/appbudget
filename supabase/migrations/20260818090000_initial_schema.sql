-- BudgetTrack — initial schema
-- Tabele: categories, expenses, user_settings
-- RLS: każdy użytkownik widzi wyłącznie swoje dane (auth.uid() = user_id)
-- Trigger: nowy użytkownik dostaje 6 domyślnych kategorii i wiersz ustawień

-- =====================================================================
-- Tabele
-- =====================================================================

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  icon          text not null default 'circle',
  monthly_limit numeric(12, 2) not null default 0 check (monthly_limit >= 0),
  is_default    boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  note        text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

create table public.user_settings (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  alert_at_80_percent    boolean not null default true,
  alert_at_100_percent   boolean not null default true,
  weekly_summary_enabled boolean not null default true,
  is_premium             boolean not null default false
);

create index categories_user_id_sort_order_idx on public.categories (user_id, sort_order);
create index expenses_user_id_date_idx on public.expenses (user_id, date desc);
create index expenses_category_id_idx on public.expenses (category_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.user_settings enable row level security;

-- categories
create policy "categories_select_own" on public.categories
  for select using ((select auth.uid()) = user_id);

create policy "categories_insert_own" on public.categories
  for insert with check ((select auth.uid()) = user_id);

create policy "categories_update_own" on public.categories
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "categories_delete_own" on public.categories
  for delete using ((select auth.uid()) = user_id);

-- expenses
create policy "expenses_select_own" on public.expenses
  for select using ((select auth.uid()) = user_id);

create policy "expenses_insert_own" on public.expenses
  for insert with check ((select auth.uid()) = user_id);

create policy "expenses_update_own" on public.expenses
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "expenses_delete_own" on public.expenses
  for delete using ((select auth.uid()) = user_id);

-- user_settings
create policy "user_settings_select_own" on public.user_settings
  for select using ((select auth.uid()) = user_id);

create policy "user_settings_insert_own" on public.user_settings
  for insert with check ((select auth.uid()) = user_id);

create policy "user_settings_update_own" on public.user_settings
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_settings_delete_own" on public.user_settings
  for delete using ((select auth.uid()) = user_id);

-- =====================================================================
-- Domyślne dane dla nowego użytkownika
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, name, icon, monthly_limit, is_default, sort_order)
  values
    (new.id, 'Jedzenie',   'utensils',    800,  true, 1),
    (new.id, 'Transport',  'car',         300,  true, 2),
    (new.id, 'Mieszkanie', 'home',        1500, true, 3),
    (new.id, 'Rozrywka',   'gamepad-2',   300,  true, 4),
    (new.id, 'Zdrowie',    'heart-pulse', 200,  true, 5),
    (new.id, 'Inne',       'shapes',      200,  true, 6);

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
