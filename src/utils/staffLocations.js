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
      return {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        department: user.department,
        role: user.role,
        initials: user.initials || 'NA',
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
        accuracyMeters: position?.accuracy_meters ?? null,
        recordedAt: position?.recorded_at ? formatDateTime(new Date(position.recorded_at)) : null,
        hasLocation: Number.isFinite(position?.latitude) && Number.isFinite(position?.longitude)
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
