export function formatDateTime(value = new Date()) {
  return new Intl.DateTimeFormat('en-BZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(value);
}

export function formatDateLabel(value) {
  if (!value) return 'Select date';
  return new Intl.DateTimeFormat('en-BZ', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}
