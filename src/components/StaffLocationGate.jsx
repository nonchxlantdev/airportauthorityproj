export function StaffLocationGate({ status, onRetry }) {
  if (status !== 'denied' && status !== 'unavailable') {
    return null;
  }

  return (
    <div className="staff-location-gate" role="dialog" aria-modal="true" aria-labelledby="location-gate-title">
      <div className="staff-location-gate__panel">
        <h2 id="location-gate-title">Location access required</h2>
        <p>
          Your location must stay on while you use this app for airport operations and safety.
        </p>
        {status === 'denied' ? (
          <p>
            Location was blocked. Enable location for this site in your browser or device settings, then tap Retry.
          </p>
        ) : (
          <p>This device does not support location services. Use a phone or tablet with GPS to continue.</p>
        )}
        {status === 'denied' && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Retry location access
          </button>
        )}
        <p className="staff-location-gate__note">
          Location sharing is automatic for all users and cannot be turned off in the app.
        </p>
      </div>
    </div>
  );
}
