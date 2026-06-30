import { inferAirportZone } from '../config/airportLocations.js';
import { formatDateTime } from './dateFormat.js';

export function buildStaffLocationRows(users, staffPositions = []) {
  const positionsByUserId = staffPositions.reduce((grouped, row) => {
    grouped[row.user_id] = row;
    return grouped;
  }, {});

  return users
    .filter((user) => user.status === 'Active')
    .map((user) => {
      const position = positionsByUserId[user.id];
      const latitude = position?.latitude ?? null;
      const longitude = position?.longitude ?? null;
      const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

      return {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        email: user.email || '',
        department: user.department,
        role: user.role,
        initials: user.initials || 'NA',
        latitude,
        longitude,
        accuracyMeters: position?.accuracy_meters ?? null,
        recordedAt: position?.recorded_at ? formatDateTime(new Date(position.recorded_at)) : null,
        hasLocation,
        airportZone: hasLocation ? inferAirportZone(latitude, longitude) : null
      };
    })
    .sort((left, right) => {
      if (left.hasLocation !== right.hasLocation) return left.hasLocation ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
}

export function staffLocationsWithCoordinates(staffRows) {
  return staffRows.filter((row) => row.hasLocation);
}

export function filterStaffRows(staffRows, { search = '', locationFilter = 'All locations' } = {}) {
  const query = search.trim().toLowerCase();

  return staffRows.filter((row) => {
    const matchesSearch = !query || [
      row.name,
      row.email,
      row.department,
      row.role,
      row.airportZone
    ].join(' ').toLowerCase().includes(query);

    let matchesLocation = true;
    if (locationFilter === 'All locations') {
      matchesLocation = true;
    } else if (locationFilter === 'No location') {
      matchesLocation = !row.hasLocation;
    } else {
      matchesLocation = row.airportZone === locationFilter;
    }

    return matchesSearch && matchesLocation;
  });
}

export function summarizeStaffLocations(staffRows) {
  const onMap = staffRows.filter((row) => row.hasLocation).length;
  const zones = staffRows.reduce((counts, row) => {
    if (!row.airportZone) return counts;
    counts[row.airportZone] = (counts[row.airportZone] || 0) + 1;
    return counts;
  }, {});

  return {
    total: staffRows.length,
    onMap,
    offline: staffRows.length - onMap,
    zones
  };
}
