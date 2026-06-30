-- Row Level Security for Airport Authority demo
-- Run in Supabase Dashboard → SQL Editor after tables exist.
-- Safe to re-run: drops existing policies before recreating.

-- ---------------------------------------------------------------------------
-- Helpers (security definer reads profiles for the signed-in user)
-- ---------------------------------------------------------------------------

create or replace function public.auth_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_user_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select department from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_is_manager_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_user_role(), '') in (
    'System Administrator',
    'General Manager / Senior Management',
    'Department Manager',
    'Supervisor'
  );
$$;

create or replace function public.auth_can_view_all_jobs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_user_role(), '') in (
    'System Administrator',
    'General Manager / Senior Management',
    'Read-Only / Auditor'
  );
$$;

create or replace function public.auth_can_create_jobs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_user_role(), '') in (
    'System Administrator',
    'General Manager / Senior Management',
    'Department Manager',
    'Supervisor'
  );
$$;

create or replace function public.auth_can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_user_role(), '') = 'System Administrator';
$$;

create or replace function public.auth_user_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.team_members where user_id = auth.uid();
$$;

create or replace function public.auth_can_access_job(job_row public.jobs)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth_can_view_all_jobs()
    or (
      auth_user_role() in ('Department Manager', 'Supervisor')
      and job_row.department = auth_user_department()
    )
    or job_row.assigned_user_id = auth.uid()
    or job_row.team_id in (select auth_user_team_ids());
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or auth_can_manage_users())
  with check (id = auth.uid() or auth_can_manage_users());

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------

alter table public.jobs enable row level security;

drop policy if exists "jobs_select_scoped" on public.jobs;
create policy "jobs_select_scoped"
  on public.jobs for select to authenticated
  using (auth_can_access_job(jobs));

drop policy if exists "jobs_insert_managers" on public.jobs;
create policy "jobs_insert_managers"
  on public.jobs for insert to authenticated
  with check (auth_can_create_jobs());

drop policy if exists "jobs_update_scoped" on public.jobs;
create policy "jobs_update_scoped"
  on public.jobs for update to authenticated
  using (
    auth_can_create_jobs()
    or assigned_user_id = auth.uid()
    or team_id in (select auth_user_team_ids())
  )
  with check (
    auth_can_create_jobs()
    or assigned_user_id = auth.uid()
    or team_id in (select auth_user_team_ids())
  );

drop policy if exists "jobs_delete_admin" on public.jobs;
create policy "jobs_delete_admin"
  on public.jobs for delete to authenticated
  using (auth_user_role() = 'System Administrator');

-- ---------------------------------------------------------------------------
-- job_history
-- ---------------------------------------------------------------------------

alter table public.job_history enable row level security;

drop policy if exists "job_history_select_via_job" on public.job_history;
create policy "job_history_select_via_job"
  on public.job_history for select to authenticated
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = job_history.job_id
        and auth_can_access_job(jobs)
    )
  );

drop policy if exists "job_history_insert_actor" on public.job_history;
create policy "job_history_insert_actor"
  on public.job_history for insert to authenticated
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.jobs
      where jobs.id = job_history.job_id
        and (
          auth_can_create_jobs()
          or jobs.assigned_user_id = auth.uid()
          or jobs.team_id in (select auth_user_team_ids())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- teams & team_members
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated"
  on public.teams for select to authenticated
  using (true);

drop policy if exists "teams_insert_managers" on public.teams;
create policy "teams_insert_managers"
  on public.teams for insert to authenticated
  with check (auth_is_manager_or_above());

drop policy if exists "team_members_select_authenticated" on public.team_members;
create policy "team_members_select_authenticated"
  on public.team_members for select to authenticated
  using (true);

drop policy if exists "team_members_insert_managers" on public.team_members;
create policy "team_members_insert_managers"
  on public.team_members for insert to authenticated
  with check (auth_is_manager_or_above());

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_authenticated" on public.announcements;
create policy "announcements_select_authenticated"
  on public.announcements for select to authenticated
  using (true);

drop policy if exists "announcements_insert_managers" on public.announcements;
create policy "announcements_insert_managers"
  on public.announcements for insert to authenticated
  with check (auth_is_manager_or_above());

-- ---------------------------------------------------------------------------
-- staff_positions (extends staff_positions.sql if already applied)
-- ---------------------------------------------------------------------------

alter table public.staff_positions enable row level security;

drop policy if exists "staff_positions_select_authenticated" on public.staff_positions;
create policy "staff_positions_select_authenticated"
  on public.staff_positions for select to authenticated
  using (true);

drop policy if exists "staff_positions_insert_own" on public.staff_positions;
create policy "staff_positions_insert_own"
  on public.staff_positions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "staff_positions_update_own" on public.staff_positions;
create policy "staff_positions_update_own"
  on public.staff_positions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: job-attachments bucket (create bucket in Dashboard if missing)
-- ---------------------------------------------------------------------------

drop policy if exists "job_attachments_select" on storage.objects;
create policy "job_attachments_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'job-attachments');

drop policy if exists "job_attachments_insert" on storage.objects;
create policy "job_attachments_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'job-attachments');

drop policy if exists "job_attachments_update" on storage.objects;
create policy "job_attachments_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'job-attachments');

drop policy if exists "job_attachments_delete" on storage.objects;
create policy "job_attachments_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'job-attachments' and auth_can_manage_users());
