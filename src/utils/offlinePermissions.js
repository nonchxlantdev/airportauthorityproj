const APPROVAL_ROLES = [
  'System Administrator',
  'General Manager / Senior Management',
  'Department Manager'
];

const JOB_CREATOR_ROLES = [
  'System Administrator',
  'General Manager / Senior Management',
  'Department Manager',
  'Supervisor'
];

const VIEW_ALL_JOBS_ROLES = [
  'System Administrator',
  'General Manager / Senior Management',
  'Read-Only / Auditor'
];

export function canApproveCompletedJobs(user) {
  return APPROVAL_ROLES.includes(user?.role || '');
}

export function canViewAllJobs(user) {
  return VIEW_ALL_JOBS_ROLES.includes(user?.role || '');
}

export function canQueueJobStatusUpdate(user, job, teamIds = []) {
  if (!user?.id || !job) return false;
  if (canViewAllJobs(user)) return true;
  if (job.assignedUserId === user.id) return true;
  return teamIds.includes(job.teamId);
}

export function canQueuePhotoUpload(user, job) {
  if (!user?.id || !job) return false;
  if (user.role === 'System Administrator') return true;
  if (job.createdById === user.id) return true;
  if (job.assignedUserId === user.id) return true;
  return false;
}

export function isApprovalDecision(approvalStatus) {
  return ['Approved', 'Rejected'].includes(approvalStatus);
}

export function requiresOnlineApprovalChange(previousStatus, nextStatus) {
  return isApprovalDecision(nextStatus) && nextStatus !== previousStatus;
}

export function assertQueueableApprovalChange(user, previousStatus, nextStatus) {
  if (!requiresOnlineApprovalChange(previousStatus, nextStatus)) return;

  const message = 'Approving or rejecting completed jobs requires an online connection so permissions can be verified.';
  const error = new Error(message);
  error.code = 'APPROVAL_ONLINE_ONLY';
  throw error;
}

export function assertQueueableApprovalActor(user, nextStatus) {
  if (!isApprovalDecision(nextStatus)) return;
  if (canApproveCompletedJobs(user)) return;

  const error = new Error('Your role cannot approve or reject completed jobs.');
  error.code = 'APPROVAL_NOT_PERMITTED';
  throw error;
}
