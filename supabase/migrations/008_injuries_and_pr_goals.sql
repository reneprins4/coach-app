-- Injuries table
create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Unique constraint for upsert on user_id
alter table public.injuries add constraint injuries_user_id_key unique (user_id);

-- RLS policies
alter table public.injuries enable row level security;
create policy "Users can read own injuries" on public.injuries for select using (auth.uid() = user_id);
create policy "Users can insert own injuries" on public.injuries for insert with check (auth.uid() = user_id);
create policy "Users can update own injuries" on public.injuries for update using (auth.uid() = user_id);
create policy "Users can delete own injuries" on public.injuries for delete using (auth.uid() = user_id);

-- PR Goals table
create table if not exists public.pr_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Unique constraint for upsert on user_id
alter table public.pr_goals add constraint pr_goals_user_id_key unique (user_id);

-- RLS policies
alter table public.pr_goals enable row level security;
create policy "Users can read own pr_goals" on public.pr_goals for select using (auth.uid() = user_id);
create policy "Users can insert own pr_goals" on public.pr_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own pr_goals" on public.pr_goals for update using (auth.uid() = user_id);
create policy "Users can delete own pr_goals" on public.pr_goals for delete using (auth.uid() = user_id);
