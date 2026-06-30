import { supabase } from '../supabaseClient.js';
import { isOfflineCapable } from './platformCapabilities.js';
import { loadWorkspaceSnapshot, saveWorkspaceSnapshot } from './offlineDataCache.js';
import { queueGpsPing, runOfflineCapableWrite } from './offlineWrites.js';
import { registerBackgroundSync } from './offlineSync.js';

const STAFF_POSITIONS_TABLE = import.meta.env.VITE_STAFF_POSITIONS_TABLE || '';

export function staffPositionsTableConfigured() {
  return Boolean(STAFF_POSITIONS_TABLE);
}

export async function loadStaffPositions() {
  if (!STAFF_POSITIONS_TABLE) return [];

  const { data, error } = await supabase.from(STAFF_POSITIONS_TABLE).select('*');
  if (error) throw error;
  return data || [];
}

export async function hydrateWorkspaceFromCache(applySnapshot) {
  if (!isOfflineCapable()) return false;

  const snapshot = await loadWorkspaceSnapshot();
  if (!snapshot) return false;

  applySnapshot(snapshot);
  return true;
}

export async function persistWorkspaceSnapshot(snapshot) {
  if (!isOfflineCapable()) return;
  await saveWorkspaceSnapshot(snapshot);
}

export function isOfflineError(error) {
  if (!navigator.onLine) return true;
  const message = `${error?.message || ''}`.toLowerCase();
  return message.includes('failed to fetch') || message.includes('network');
}

export async function recordStaffGpsPosition({
  userId,
  latitude,
  longitude,
  accuracyMeters
}) {
  if (!staffPositionsTableConfigured()) {
    throw new Error('Create the staff_positions table and set VITE_STAFF_POSITIONS_TABLE before recording GPS.');
  }
  const payload = {
    user_id: userId,
    latitude,
    longitude,
    accuracy_meters: accuracyMeters ?? null,
    recorded_at: new Date().toISOString()
  };

  const { queued } = await runOfflineCapableWrite({
    canQueue: isOfflineCapable(),
    execute: async () => {
      const { error } = await supabase
        .from(STAFF_POSITIONS_TABLE)
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
    },
    queue: async () => {
      await queueGpsPing({
        userId,
        latitude,
        longitude,
        accuracyMeters
      });
      await registerBackgroundSync();
    }
  });

  return { queued };
}
