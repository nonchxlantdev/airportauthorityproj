import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GOLDSON_AIRPORT_BOUNDS, DEFAULT_MAP_TILE_URL_TEMPLATE } from '../config/offlineMapDefaults.js';

const MAP_CENTER = [
  (GOLDSON_AIRPORT_BOUNDS.north + GOLDSON_AIRPORT_BOUNDS.south) / 2,
  (GOLDSON_AIRPORT_BOUNDS.east + GOLDSON_AIRPORT_BOUNDS.west) / 2
];

function createStaffMarkerIcon(initials, isSelected) {
  return L.divIcon({
    className: 'staff-map-marker-wrap',
    html: `
      <span class="staff-map-marker ${isSelected ? 'selected' : ''}">
        <span class="staff-map-marker__ring"></span>
        <span class="staff-map-marker__avatar">${initials}</span>
      </span>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20]
  });
}

function buildPopupContent(row) {
  return `
    <div class="staff-map-popup">
      <div class="staff-map-popup__header">
        <span class="staff-map-popup__avatar">${row.initials}</span>
        <div>
          <strong>${row.name}</strong>
          <span>${row.role}</span>
        </div>
      </div>
      <div class="staff-map-popup__meta">
        <span>${row.department}</span>
        <span>Last seen ${row.recordedAt || 'Unknown'}</span>
      </div>
    </div>
  `;
}

function fitMapToStaff(map, locatedStaff) {
  if (!locatedStaff.length) {
    map.fitBounds([
      [GOLDSON_AIRPORT_BOUNDS.south, GOLDSON_AIRPORT_BOUNDS.west],
      [GOLDSON_AIRPORT_BOUNDS.north, GOLDSON_AIRPORT_BOUNDS.east]
    ], { padding: [24, 24] });
    return;
  }

  if (locatedStaff.length === 1) {
    map.setView([locatedStaff[0].latitude, locatedStaff[0].longitude], 16);
    return;
  }

  const bounds = L.latLngBounds(locatedStaff.map((row) => [row.latitude, row.longitude]));
  map.fitBounds(bounds.pad(0.2));
}

export function StaffLocationsMap({
  staffRows,
  selectedUserId,
  refocusToken = '',
  onSelectStaff
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersByUserIdRef = useRef(new Map());
  const lastRefocusTokenRef = useRef(null);
  const lastSelectedUserIdRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView(MAP_CENTER, 15);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer(DEFAULT_MAP_TILE_URL_TEMPLATE, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    map.fitBounds([
      [GOLDSON_AIRPORT_BOUNDS.south, GOLDSON_AIRPORT_BOUNDS.west],
      [GOLDSON_AIRPORT_BOUNDS.north, GOLDSON_AIRPORT_BOUNDS.east]
    ], { padding: [24, 24] });

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markersByUserIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    const locatedStaff = staffRows.filter((row) => row.hasLocation);
    const visibleUserIds = new Set(locatedStaff.map((row) => row.userId));

    for (const [userId, marker] of markersByUserIdRef.current.entries()) {
      if (!visibleUserIds.has(userId)) {
        layer.removeLayer(marker);
        markersByUserIdRef.current.delete(userId);
      }
    }

    locatedStaff.forEach((row) => {
      const isSelected = selectedUserId === row.userId;
      let marker = markersByUserIdRef.current.get(row.userId);

      if (marker) {
        marker.setLatLng([row.latitude, row.longitude]);
        marker.setIcon(createStaffMarkerIcon(row.initials, isSelected));
        marker.setPopupContent(buildPopupContent(row));
      } else {
        marker = L.marker([row.latitude, row.longitude], {
          icon: createStaffMarkerIcon(row.initials, isSelected),
          zIndexOffset: isSelected ? 1000 : 0
        });

        marker.bindPopup(buildPopupContent(row), {
          className: 'staff-map-popup-shell',
          maxWidth: 260
        });

        marker.on('click', () => onSelectStaff?.(row.userId));
        marker.addTo(layer);
        markersByUserIdRef.current.set(row.userId, marker);
      }

      marker.setZIndexOffset(isSelected ? 1000 : 0);

      if (isSelected) {
        marker.openPopup();
      }
    });

    const refocusChanged = refocusToken !== lastRefocusTokenRef.current;
    const selectionChanged = selectedUserId !== lastSelectedUserIdRef.current;

    if (refocusChanged) {
      lastRefocusTokenRef.current = refocusToken;
      fitMapToStaff(map, locatedStaff);
      lastSelectedUserIdRef.current = selectedUserId;
      return;
    }

    if (selectionChanged && selectedUserId) {
      const selected = locatedStaff.find((row) => row.userId === selectedUserId);
      if (selected) {
        map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 16), {
          animate: true,
          duration: 0.6
        });
      }
    }

    lastSelectedUserIdRef.current = selectedUserId;
  }, [staffRows, selectedUserId, refocusToken, onSelectStaff]);

  return (
    <div className="staff-locations-map-shell">
      <div className="staff-locations-map" ref={containerRef} aria-label="Staff locations map" />
    </div>
  );
}
