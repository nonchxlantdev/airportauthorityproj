import { useMemo, useState } from 'react';
import {
  MapPin,
  Navigation,
  Radio,
  Search,
  SlidersHorizontal,
  Users,
  WifiOff
} from 'lucide-react';
import { areas } from '../mockData.js';
import { STAFF_LOCATION_FILTERS } from '../config/airportLocations.js';
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
  const [locationFilter, setLocationFilter] = useState('All locations');

  const staffRows = useMemo(() => buildStaffLocationRows(users, staffPositions), [users, staffPositions]);
  const filteredRows = useMemo(
    () => filterStaffRows(staffRows, { search: searchQuery, locationFilter }),
    [staffRows, searchQuery, locationFilter]
  );
  const filteredOnMap = useMemo(() => staffLocationsWithCoordinates(filteredRows), [filteredRows]);
  const summary = useMemo(() => summarizeStaffLocations(staffRows), [staffRows]);
  const tableConfigured = staffPositionsTableConfigured();

  function handleSelectStaff(userId) {
    setSelectedUserId((current) => (current === userId ? null : userId));
  }

  function clearFilters() {
    setSearchQuery('');
    setLocationFilter('All locations');
    setSelectedUserId(null);
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
          <p>Track active staff across {areas[0]} with live GPS and zone filters.</p>
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
              <span>Matching filter</span>
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
        <label className="staff-locations-select">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <select
            value={locationFilter}
            onChange={(event) => {
              setLocationFilter(event.target.value);
              setSelectedUserId(null);
            }}
            aria-label="Filter by location"
          >
            {STAFF_LOCATION_FILTERS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        {(searchQuery || locationFilter !== 'All locations') && (
          <button type="button" className="staff-locations-clear" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className="staff-location-filters" role="tablist" aria-label="Quick location filters">
        {STAFF_LOCATION_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={locationFilter === option}
            className={locationFilter === option ? 'staff-filter-chip active' : 'staff-filter-chip'}
            onClick={() => {
              setLocationFilter(option);
              setSelectedUserId(null);
            }}
          >
            {option}
            {option !== 'All locations' && option !== 'No location' && summary.zones[option] ? (
              <span className="staff-filter-chip__count">{summary.zones[option]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <section className="staff-locations-layout">
        <div className="staff-locations-map-panel">
          <div className="staff-map-panel-header">
            <div>
              <h2><MapPin size={18} /> Live staff map</h2>
              <p>{filteredOnMap.length} staff visible · zones highlighted on map</p>
            </div>
            <span className="staff-live-pill"><span className="staff-live-dot" /> Real-time GPS</span>
          </div>
          <StaffLocationsMap
            staffRows={filteredRows}
            selectedUserId={selectedUserId}
            activeZoneFilter={locationFilter !== 'All locations' && locationFilter !== 'No location' ? locationFilter : null}
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
                    <>
                      <span className="staff-location-card__zone">{row.airportZone}</span>
                      <span className="staff-location-card__time">Last seen {row.recordedAt}</span>
                    </>
                  ) : (
                    <span className="staff-location-card__time muted-line">Waiting for GPS signal</span>
                  )}
                </span>
              </button>
            )) : (
              <EmptyState
                title="No staff match your filters"
                description="Try another search term or location zone."
                compact
              />
            )}
          </div>

          {!summary.onMap && staffRows.length > 0 && (
            <p className="staff-locations-note">
              All signed-in users share location automatically. Staff appear here once GPS is active on their device.
            </p>
          )}
        </aside>
      </section>
    </section>
  );
}
