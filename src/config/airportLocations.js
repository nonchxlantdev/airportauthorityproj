/** Airport site locations used for jobs and staff zone filtering. */
export const AIRPORT_LOCATIONS = [
  'Terminal 1',
  'Terminal 2',
  'Cargo Area',
  'Runway / Apron',
  'Parking Area',
  'VIP Lounge',
  'Immigration Area',
  'Customs Area',
  'Restrooms',
  'Other Airport Location'
];

/**
 * Approximate GPS rectangles within Goldson Airport for demo zone detection.
 * Coordinates are illustrative bounds inside the airport property.
 */
export const AIRPORT_ZONE_BOUNDS = {
  'Terminal 1': { north: 17.542, south: 17.532, east: -88.302, west: -88.318 },
  'Terminal 2': { north: 17.542, south: 17.531, east: -88.282, west: -88.298 },
  'Cargo Area': { north: 17.538, south: 17.522, east: -88.278, west: -88.292 },
  'Runway / Apron': { north: 17.552, south: 17.518, east: -88.276, west: -88.324 },
  'Parking Area': { north: 17.536, south: 17.526, east: -88.312, west: -88.325 },
  'VIP Lounge': { north: 17.539, south: 17.534, east: -88.288, west: -88.296 },
  'Immigration Area': { north: 17.541, south: 17.535, east: -88.296, west: -88.304 },
  'Customs Area': { north: 17.540, south: 17.534, east: -88.300, west: -88.308 },
  'Restrooms': { north: 17.543, south: 17.530, east: -88.285, west: -88.320 }
};

export const STAFF_LOCATION_FILTERS = ['All locations', 'No location', ...AIRPORT_LOCATIONS];

export function pointInBounds(latitude, longitude, bounds) {
  return (
    latitude <= bounds.north
    && latitude >= bounds.south
    && longitude <= bounds.east
    && longitude >= bounds.west
  );
}

export function inferAirportZone(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  for (const [zoneName, bounds] of Object.entries(AIRPORT_ZONE_BOUNDS)) {
    if (pointInBounds(latitude, longitude, bounds)) {
      return zoneName;
    }
  }

  return 'Other Airport Location';
}
