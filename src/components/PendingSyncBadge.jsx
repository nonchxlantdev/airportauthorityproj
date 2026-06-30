import { useEffect, useState } from 'react';
import { subscribeQueueCount } from '../utils/offlineQueue.js';

export function PendingSyncBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => subscribeQueueCount(setCount), []);

  if (!count) return null;

  return (
    <span className="pending-sync-badge" role="status" aria-live="polite">
      {count} item{count === 1 ? '' : 's'} pending sync
    </span>
  );
}
