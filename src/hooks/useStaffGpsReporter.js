import { useCallback, useEffect, useRef, useState } from 'react';
import { recordStaffGpsPosition, staffPositionsTableConfigured } from '../utils/workspaceData.js';

const REPORT_INTERVAL_MS = 2 * 60 * 1000;
const RETRY_DENIED_MS = 30 * 1000;

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 30_000,
  timeout: 25_000
};

export function useStaffGpsReporter(user, { enabled = true } = {}) {
  const [status, setStatus] = useState(() => (enabled ? 'pending' : 'not-required'));
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const reportPosition = useCallback(async (position) => {
    if (!user?.id) return;

    setStatus('granted');

    try {
      await recordStaffGpsPosition({
        userId: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy
      });
    } catch {
      // Offline queue handles capable devices when the write fails.
    }
  }, [user?.id]);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus((current) => (current === 'granted' ? 'granted' : 'pending'));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        reportPosition(position);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied');
          return;
        }
        setStatus((current) => (current === 'granted' ? 'granted' : 'pending'));
      },
      GEO_OPTIONS
    );
  }, [reportPosition]);

  useEffect(() => {
    if (!enabled || !user?.id || !staffPositionsTableConfigured()) {
      setStatus('not-required');
      return undefined;
    }

    if (!navigator.geolocation) {
      setStatus('unavailable');
      return undefined;
    }

    let cancelled = false;
    let watchId = null;

    function handleSuccess(position) {
      if (cancelled) return;
      reportPosition(position);
    }

    function handleError(error) {
      if (cancelled) return;
      if (error.code === error.PERMISSION_DENIED) {
        setStatus('denied');
        return;
      }
      setStatus((current) => (current === 'granted' ? 'granted' : 'pending'));
    }

    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, GEO_OPTIONS);
    requestPosition();

    const intervalId = window.setInterval(requestPosition, REPORT_INTERVAL_MS);
    const retryId = window.setInterval(() => {
      if (statusRef.current === 'denied') requestPosition();
    }, RETRY_DENIED_MS);

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      window.clearInterval(intervalId);
      window.clearInterval(retryId);
    };
  }, [enabled, user?.id, reportPosition, requestPosition]);

  return {
    status,
    isRequired: enabled,
    retry: requestPosition
  };
}
