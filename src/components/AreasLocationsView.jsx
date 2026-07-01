import { useMemo, useState } from 'react';
import {
  MapPin,
  Navigation,
  Radio,
  Search,
  Users,
  WifiOff
} from 'lucide-react';
import { areas } from '../mockData.js';
import { StaffLocationsMap } from './StaffLocationsMap.jsx';
import {
  buildStaffLocationRows,
  filterStaffRows,
  staffLocationsWithCoordinates,
  summarizeStaffLocations
} from '../utils/staffLocations.js';
import { staffPositionsTableConfigured } from '../utils/workspaceData.js';

function EmptyState({ title, description, compact = false }) {
  return (
    <div className={compact ? 'empty-state compact-empty' : 'empty-state'}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function StaffStatusBadge({ row }) {
  if (!row.hasLocation) {
    return <span className="staff-status-badge offline"><WifiOff size={12} /> No GPS</span>;
  }

  return <span className="staff-status-badge live"><Radio size={12} /> Live</span>;
}

export function AreasLocationsView({ users, staffPositions }) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const staffRows = useMemo(() => buildStaffLocationRows(users, staffPositions), [users, staffPositions]);
  const filteredRows = useMemo(
    () => filterStaffRows(staffRows, { search: searchQuery }),
    [staffRows, searchQuery]
  );
  const filteredOnMap = useMemo(() => staffLocationsWithCoordinates(filteredRows), [filteredRows]);
  const summary = useMemo(() => summarizeStaffLocations(staffRows), [staffRows]);
  const tableConfigured = staffPositionsTableConfigured();

  function handleSelectStaff(userId) {
    setSelectedUserId((current) => (current === userId ? null : userId));
  }

  if (!tableConfigured) {
    return (
      <section className="staff-locations-page">
        <header className="staff-locations-hero">
          <div>
            <p className="staff-locations-eyebrow">Live operations</p>
            <h1>Areas / Locations</h1>
            <p>Real-time staff visibility across {areas[0]}</p>
          </div>
        </header>
        <section className="panel placeholder-panel staff-locations-placeholder">
          <MapPin size={30} />
          <h2>Staff GPS tracking is not configured</h2>
          <p>Run `supabase/staff_positions.sql` and set `VITE_STAFF_POSITIONS_TABLE=staff_positions` in your environment.</p>
        </section>
      </section>
    );
  }

  return (
    <section className="staff-locations-page">
      <header className="staff-locations-hero">
        <div>
          <p className="staff-locations-eyebrow">Live operations</p>
          <h1>Areas / Locations</h1>
          <p>Track active staff across {areas[0]} with live GPS on the map.</p>
        </div>
        <div className="staff-locations-stats">
          <article className="staff-stat-card">
            <Users size={18} />
            <div>
              <strong>{summary.total}</strong>
              <span>Active staff</span>
            </div>
          </article>
          <article className="staff-stat-card accent">
            <Navigation size={18} />
            <div>
              <strong>{summary.onMap}</strong>
              <span>On map now</span>
            </div>
          </article>
          <article className="staff-stat-card">
            <MapPin size={18} />
            <div>
              <strong>{filteredOnMap.length}</strong>
              <span>In search results</span>
            </div>
          </article>
        </div>
      </header>

      <div className="staff-locations-toolbar">
        <label className="staff-locations-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search staff by name, role, or department..."
            aria-label="Search staff"
          />
        </label>
        {searchQuery && (
          <button type="button" className="staff-locations-clear" onClick={() => setSearchQuery('')}>
            Clear search
          </button>
        )}
      </div>

      <section className="staff-locations-layout">
        <div className="staff-locations-map-panel">
          <div className="staff-map-panel-header">
            <div>
              <h2><MapPin size={18} /> Live staff map</h2>
              <p>{filteredOnMap.length} staff visible on map</p>
            </div>
            <span className="staff-live-pill"><span className="staff-live-dot" /> Real-time GPS</span>
          </div>
          <StaffLocationsMap
            staffRows={filteredRows}
            selectedUserId={selectedUserId}
            refocusToken={searchQuery.trim().toLowerCase()}
            onSelectStaff={handleSelectStaff}
          />
        </div>

        <aside className="staff-locations-list">
          <div className="staff-list-header">
            <div>
              <h2><Users size={18} /> Staff roster</h2>
              <p>{filteredRows.length} of {staffRows.length} shown</p>
            </div>
          </div>

          <div className="staff-location-rows">
            {filteredRows.length ? filteredRows.map((row) => (
              <button
                type="button"
                key={row.userId}
                className={selectedUserId === row.userId ? 'staff-location-card selected' : 'staff-location-card'}
                onClick={() => handleSelectStaff(row.userId)}
              >
                <span className="staff-location-card__avatar">{row.initials}</span>
                <span className="staff-location-card__body">
                  <span className="staff-location-card__title">
                    <strong>{row.name}</strong>
                    <StaffStatusBadge row={row} />
                  </span>
                  <span className="staff-location-card__meta">{row.department} · {row.role}</span>
                  {row.hasLocation ? (
                    <span className="staff-location-card__time">Last seen {row.recordedAt}</span>
                  ) : (
                    <span className="staff-location-card__time muted-line">Waiting for GPS signal</span>
                  )}
                </span>
              </button>
            )) : (
              <EmptyState
                title="No staff match your search"
                description="Try another name, role, or department."
                compact
              />
            )}
          </div>

          {!summary.onMap && staffRows.length > 0 && (
            <p className="staff-locations-note">
              Staff appear on the map when they allow location access on their device.
            </p>
          )}
        </aside>
      </section>
    </section>
  );
}
