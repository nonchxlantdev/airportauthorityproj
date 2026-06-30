import { useEffect } from 'react';
import { recordStaffGpsPosition, staffPositionsTableConfigured } from '../utils/workspaceData.js';

const REPORT_INTERVAL_MS = 2 * 60 * 1000;

export function useStaffGpsReporter(user, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled || !user?.id || !staffPositionsTableConfigured()) return undefined;
    if (!navigator.geolocation) return undefined;

    let cancelled = false;

    async function reportPosition(position) {
      if (cancelled) return;

      try {
        await recordStaffGpsPosition({
          userId: user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy
        });
      } catch {
        // Silent fail — offline queue handles capable devices elsewhere.
      }
    }

    function reportCurrentPosition() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          reportPosition(position);
        },
        () => {},
        {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 20_000
        }
      );
    }

    reportCurrentPosition();
    const intervalId = window.setInterval(reportCurrentPosition, REPORT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, user?.id]);
}
