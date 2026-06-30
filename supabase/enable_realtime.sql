-- Enable Supabase Realtime for live dashboard updates
-- Run in Supabase Dashboard → SQL Editor

alter table public.jobs replica identity full;
alter table public.job_history replica identity full;

-- Add tables to the Realtime publication (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.jobs;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.job_history;
exception
  when duplicate_object then null;
end $$;

-- Optional: verify in Dashboard → Database → Publications → supabase_realtime
