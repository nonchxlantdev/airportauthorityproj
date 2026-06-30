function escapeCsvValue(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function exportJobsToCsv(jobs, filename = 'airport-jobs-report.csv') {
  const headers = [
    'Job ID',
    'Title',
    'Department',
    'Area',
    'Location',
    'Assigned To',
    'Status',
    'Priority',
    'Approval Status',
    'Due Date',
    'Completion Date',
    'Last Updated'
  ];

  const rows = jobs.map((job) => [
    job.id,
    job.title,
    job.department,
    job.area,
    job.location,
    job.teamName || job.assignedTo,
    job.status,
    job.priority,
    job.approvalStatus,
    job.dueDate || '',
    job.completionDate || '',
    job.lastUpdated || ''
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
