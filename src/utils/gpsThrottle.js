const EARTH_RADIUS_METERS = 6_371_000;

export function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function shouldReportGpsPosition(
  latitude,
  longitude,
  lastReport,
  {
    minIntervalMs = 2 * 60 * 1000,
    minMoveMeters = 25
  } = {}
) {
  if (!lastReport || lastReport.latitude == null || lastReport.longitude == null) {
    return true;
  }

  const elapsedMs = Date.now() - (lastReport.reportedAt || 0);
  if (elapsedMs >= minIntervalMs) {
    return true;
  }

  return distanceMeters(
    lastReport.latitude,
    lastReport.longitude,
    latitude,
    longitude
  ) >= minMoveMeters;
}
