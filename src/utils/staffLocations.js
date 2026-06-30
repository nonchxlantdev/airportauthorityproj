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
        hasLocation
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

export function filterStaffRows(staffRows, { search = '' } = {}) {
  const query = search.trim().toLowerCase();
  if (!query) return staffRows;

  return staffRows.filter((row) => [
    row.name,
    row.email,
    row.department,
    row.role
  ].join(' ').toLowerCase().includes(query));
}

export function summarizeStaffLocations(staffRows) {
  const onMap = staffRows.filter((row) => row.hasLocation).length;

  return {
    total: staffRows.length,
    onMap,
    offline: staffRows.length - onMap
  };
}
