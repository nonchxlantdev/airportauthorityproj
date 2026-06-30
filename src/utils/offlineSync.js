import { supabase } from '../supabaseClient.js';
import { isOfflineCapable } from './platformCapabilities.js';
import {
  listQueueItems,
  markQueueAttempt,
  removeQueueItem
} from './offlineQueue.js';
import { isOfflineError } from './workspaceData.js';

const SYNC_TAG = 'bac-offline-queue';
const STAFF_POSITIONS_TABLE = import.meta.env.VITE_STAFF_POSITIONS_TABLE || '';

let isFlushing = false;

async function uploadQueuedPhoto(item) {
  const blob = new Blob([item.fileData], { type: item.contentType });
  const { error: uploadError } = await supabase.storage
    .from('job-attachments')
    .upload(item.filePath, blob, { contentType: item.contentType, upsert: false });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from('job-attachments').getPublicUrl(item.filePath);
  const attachment = {
    name: item.fileName,
    url: publicData.publicUrl,
    path: item.filePath,
    type: item.contentType
  };

  const { data: jobRow, error: jobError } = await supabase
    .from('jobs')
    .select('attachments')
    .eq('id', item.jobId)
    .single();

  if (jobError) throw jobError;

  const attachments = [...(Array.isArray(jobRow.attachments) ? jobRow.attachments : []), attachment];
  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      attachments,
      last_updated_by: item.actorId
    })
    .eq('id', item.jobId);

  if (updateError) throw updateError;

  await supabase.from('job_history').insert({
    job_id: item.jobId,
    title: 'Photo attachment uploaded',
    note: `${item.fileName} synced after reconnecting.`,
    actor_id: item.actorId,
    actor_name: item.actorName
  });
}

async function flushJobStatusUpdate(item) {
  const { error: updateError } = await supabase
    .from('jobs')
    .update(item.updatePayload)
    .eq('id', item.jobId);

  if (updateError) throw updateError;

  await supabase.from('job_history').insert({
    job_id: item.jobId,
    title: item.historyTitle,
    note: item.historyNote,
    actor_id: item.actorId,
    actor_name: item.actorName
  });
}

async function flushGpsPing(item) {
  if (!STAFF_POSITIONS_TABLE) {
    throw new Error('Staff positions table is not configured.');
  }

  const { error } = await supabase
    .from(STAFF_POSITIONS_TABLE)
    .upsert({
      user_id: item.userId,
      latitude: item.latitude,
      longitude: item.longitude,
      accuracy_meters: item.accuracyMeters ?? null,
      recorded_at: item.recordedAt
    }, { onConflict: 'user_id' });

  if (error) throw error;
}

async function processQueueItem(item) {
  switch (item.type) {
    case 'job_status_update':
      await flushJobStatusUpdate(item);
      break;
    case 'photo_upload':
      await uploadQueuedPhoto(item);
      break;
    case 'gps_ping':
      await flushGpsPing(item);
      break;
    default:
      throw new Error(`Unknown offline queue item type: ${item.type}`);
  }
}

export async function registerBackgroundSync() {
  if (!isOfflineCapable() || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await registration.sync.register(SYNC_TAG);
    }
  } catch {
    // Background Sync may be unavailable even when feature-detected.
  }
}

export async function flushOfflineQueue({ onItemSynced } = {}) {
  if (isFlushing) return { flushed: 0, failed: 0 };
  isFlushing = true;

  let flushed = 0;
  let failed = 0;

  try {
    const items = await listQueueItems();

    for (const item of items) {
      await markQueueAttempt(item.id);

      try {
        await processQueueItem(item);
        await removeQueueItem(item.id);
        flushed += 1;
        onItemSynced?.(item);
      } catch (error) {
        failed += 1;
        if (!isOfflineError(error)) {
          console.error('Offline queue item failed:', item.type, error);
        }
        if (isOfflineError(error)) break;
      }
    }
  } finally {
    isFlushing = false;
  }

  return { flushed, failed };
}

export function setupOfflineSyncListeners(onSynced) {
  const flush = () => flushOfflineQueue({ onItemSynced: onSynced }).catch(() => {});

  const handleOnline = () => flush();
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') flush();
  };
  const handleServiceWorkerMessage = (event) => {
    if (event.data?.type === 'FLUSH_OFFLINE_QUEUE') flush();
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibility);
  navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

  flush();

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibility);
    navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
  };
}

export { SYNC_TAG };
