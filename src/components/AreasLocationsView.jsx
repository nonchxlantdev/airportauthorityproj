import { useMemo, useState } from 'react';
import { MapPin, Users } from 'lucide-react';
import { areas } from '../mockData.js';
import { StaffLocationsMap } from './StaffLocationsMap.jsx';
import { buildStaffLocationRows, staffLocationsWithCoordinates } from '../utils/staffLocations.js';
import { staffPositionsTableConfigured } from '../utils/workspaceData.js';

function PageHeading({ title, description }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, description, compact = false }) {
  return (
    <div className={compact ? 'empty-state compact-empty' : 'empty-state'}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function AreasLocationsView({ users, staffPositions }) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const staffRows = useMemo(() => buildStaffLocationRows(users, staffPositions), [users, staffPositions]);
  const locatedStaff = useMemo(() => staffLocationsWithCoordinates(staffRows), [staffRows]);
  const tableConfigured = staffPositionsTableConfigured();

  return (
    <>
      <PageHeading
        title="Areas / Locations"
        description={`Live staff map for ${areas[0]}`}
      />
      {!tableConfigured ? (
        <section className="panel placeholder-panel">
          <MapPin size={30} />
          <h2>Staff GPS tracking is not configured</h2>
          <p>Run `supabase/staff_positions.sql` and set `VITE_STAFF_POSITIONS_TABLE=staff_positions` in your environment.</p>
        </section>
      ) : (
        <section className="staff-locations-layout">
          <div className="panel staff-locations-map-panel">
            <div className="panel-header">
              <h2><MapPin size={17} /> Airport Staff Map</h2>
              <span className="record-count">{locatedStaff.length} on map</span>
            </div>
            <StaffLocationsMap
              staffRows={staffRows}
              selectedUserId={selectedUserId}
              onSelectStaff={setSelectedUserId}
            />
          </div>
          <aside className="panel staff-locations-list">
            <div className="panel-header">
              <h2><Users size={17} /> Active Staff</h2>
              <span className="record-count">{staffRows.length} total</span>
            </div>
            <div className="staff-location-rows">
              {staffRows.length ? staffRows.map((row) => (
                <button
                  type="button"
                  key={row.userId}
                  className={selectedUserId === row.userId ? 'staff-location-row selected' : 'staff-location-row'}
                  onClick={() => setSelectedUserId(row.userId)}
                >
                  <span className="avatar user-avatar">{row.initials}</span>
                  <span className="staff-location-copy">
                    <strong>{row.name}</strong>
                    <small>{row.department} · {row.role}</small>
                    {row.hasLocation ? (
                      <span>Last seen {row.recordedAt}</span>
                    ) : (
                      <span className="muted-line">No location reported yet</span>
                    )}
                  </span>
                </button>
              )) : (
                <EmptyState
                  title="No active staff"
                  description="Active users will appear here once profiles are loaded."
                  compact
                />
              )}
            </div>
            {!locatedStaff.length && staffRows.length > 0 && (
              <p className="staff-locations-note">
                Staff share location automatically when signed in on a device with GPS enabled. Open the app on a phone or tablet outdoors to populate the map.
              </p>
            )}
          </aside>
        </section>
      )}
    </>
  );
}
