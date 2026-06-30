import { supabase } from '../supabaseClient.js';

export function subscribeWorkspaceRealtime({ onWorkspaceChange, onStaffPositionChange } = {}) {
  const channel = supabase
    .channel('workspace-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs' },
      () => onWorkspaceChange?.()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'job_history' },
      () => onWorkspaceChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'staff_positions' },
      (payload) => onStaffPositionChange?.(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function mergeStaffPositionRow(currentRows, payload) {
  const rows = Array.isArray(currentRows) ? currentRows : [];

  if (payload.eventType === 'DELETE') {
    const deletedId = payload.old?.user_id;
    if (!deletedId) return rows;
    return rows.filter((row) => row.user_id !== deletedId);
  }

  const nextRow = payload.new;
  if (!nextRow?.user_id) return rows;

  const index = rows.findIndex((row) => row.user_id === nextRow.user_id);
  if (index === -1) return [...rows, nextRow];

  const updated = [...rows];
  updated[index] = nextRow;
  return updated;
}
