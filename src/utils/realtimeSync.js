import { supabase } from '../supabaseClient.js';

export function subscribeWorkspaceRealtime(onChange) {
  const channel = supabase
    .channel('workspace-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'job_history' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'staff_positions' },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
