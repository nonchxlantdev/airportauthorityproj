import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { isOfflineCapable } from '../utils/platformCapabilities.js';

const STORAGE_KEY = 'bac-offline-platform-notice-dismissed';

export function OfflinePlatformNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOfflineCapable()) return;
    if (localStorage.getItem(STORAGE_KEY) === '1') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismissNotice() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="offline-platform-notice" role="status">
      <p>Offline mode is available on Android tablets.</p>
      <button type="button" className="icon-button" onClick={dismissNotice} aria-label="Dismiss notice">
        <X size={16} />
      </button>
    </div>
  );
}
