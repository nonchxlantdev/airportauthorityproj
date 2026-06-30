-- Staff GPS positions for Philip S. W. Goldson Int'l Airport operations map.
-- Run in Supabase Dashboard → SQL Editor → New query → Run.

create table if not exists public.staff_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_positions_user_id_key unique (user_id)
);

create index if not exists staff_positions_recorded_at_idx
  on public.staff_positions (recorded_at desc);

alter table public.staff_positions enable row level security;

-- Authenticated users can read all staff positions (managers viewing the map).
create policy "staff_positions_select_authenticated"
  on public.staff_positions
  for select
  to authenticated
  using (true);

-- Users can insert/update only their own position row.
create policy "staff_positions_insert_own"
  on public.staff_positions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "staff_positions_update_own"
  on public.staff_positions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: keep updated_at current on each write.
create or replace function public.set_staff_positions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_positions_updated_at on public.staff_positions;

create trigger staff_positions_updated_at
  before update on public.staff_positions
  for each row
  execute function public.set_staff_positions_updated_at();
