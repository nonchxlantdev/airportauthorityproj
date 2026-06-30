import { isOfflineCapable } from './platformCapabilities.js';
import {
  assertQueueableApprovalActor,
  assertQueueableApprovalChange,
  canQueueJobStatusUpdate,
  canQueuePhotoUpload,
  requiresOnlineApprovalChange
} from './offlinePermissions.js';
import { enqueueQueueItem } from './offlineQueue.js';
import { registerBackgroundSync } from './offlineSync.js';
import { isOfflineError } from './workspaceData.js';

export class OfflineWriteError extends Error {
  constructor(message, code = 'OFFLINE_WRITE_BLOCKED') {
    super(message);
    this.code = code;
    this.name = 'OfflineWriteError';
  }
}

async function queueAndRegister(item) {
  const entry = await enqueueQueueItem(item);
  await registerBackgroundSync();
  return entry;
}

export function getOfflineUserMessage(error) {
  if (error?.code === 'APPROVAL_ONLINE_ONLY') {
    return 'Approving or rejecting completed jobs requires an online connection.';
  }
  if (error?.code === 'OFFLINE_WRITE_BLOCKED') {
    return error.message;
  }
  if (!navigator.onLine) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  return error?.message || 'Unable to save changes right now.';
}

export async function runOfflineCapableWrite({
  execute,
  queue,
  canQueue = true
}) {
  try {
    return { queued: false, result: await execute() };
  } catch (error) {
    if (!isOfflineCapable() || !canQueue || !isOfflineError(error)) {
      throw error;
    }

    await queue();
    return { queued: true, result: null };
  }
}

export async function queueJobStatusUpdate({
  user,
  job,
  teamIds,
  nextStatus,
  note,
  updatePayload,
  historyTitle,
  historyNote
}) {
  if (!canQueueJobStatusUpdate(user, job, teamIds)) {
    throw new OfflineWriteError('You do not have permission to update this job offline.');
  }

  return queueAndRegister({
    type: 'job_status_update',
    jobId: job.id,
    actorId: user.id,
    actorName: user.name,
    updatePayload,
    historyTitle,
    historyNote: note || historyNote
  });
}

export async function queuePhotoUploads({
  user,
  job,
  jobId,
  files
}) {
  if (!canQueuePhotoUpload(user, job)) {
    throw new OfflineWriteError('You do not have permission to upload attachments for this job offline.');
  }

  const selectedFiles = Array.from(files).filter((file) => ['image/jpeg', 'image/png'].includes(file.type));
  const entries = [];

  for (const file of selectedFiles) {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
    const filePath = `${jobId}/${crypto.randomUUID()}-${safeName}`;
    const fileData = await file.arrayBuffer();

    entries.push(await queueAndRegister({
      type: 'photo_upload',
      jobId,
      actorId: user.id,
      actorName: user.name,
      fileName: file.name,
      filePath,
      contentType: file.type,
      fileData
    }));
  }

  return entries;
}

export async function queueGpsPing({
  userId,
  latitude,
  longitude,
  accuracyMeters
}) {
  return queueAndRegister({
    type: 'gps_ping',
    userId,
    latitude,
    longitude,
    accuracyMeters,
    recordedAt: new Date().toISOString()
  });
}

export function guardApprovalEdit({
  user,
  previousApprovalStatus,
  nextApprovalStatus,
  isOfflineAttempt = !navigator.onLine
}) {
  assertQueueableApprovalActor(user, nextApprovalStatus);

  if (isOfflineCapable() && isOfflineAttempt) {
    assertQueueableApprovalChange(previousApprovalStatus, nextApprovalStatus);
  }

  if (requiresOnlineApprovalChange(previousApprovalStatus, nextApprovalStatus) && !navigator.onLine) {
    throw new OfflineWriteError(
      'Approving or rejecting completed jobs requires an online connection so permissions can be verified.',
      'APPROVAL_ONLINE_ONLY'
    );
  }
}

export function buildQueuedAttachment(file) {
  return {
    name: file.name,
    url: '',
    path: `pending://${crypto.randomUUID()}`,
    type: file.type,
    pendingSync: true
  };
}
