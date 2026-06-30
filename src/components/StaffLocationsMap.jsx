import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GOLDSON_AIRPORT_BOUNDS } from '../config/offlineMapDefaults.js';
import { DEFAULT_MAP_TILE_URL_TEMPLATE } from '../config/offlineMapDefaults.js';

const MAP_CENTER = [
  (GOLDSON_AIRPORT_BOUNDS.north + GOLDSON_AIRPORT_BOUNDS.south) / 2,
  (GOLDSON_AIRPORT_BOUNDS.east + GOLDSON_AIRPORT_BOUNDS.west) / 2
];

function createStaffMarkerIcon(initials) {
  return L.divIcon({
    className: 'staff-map-marker-wrap',
    html: `<span class="staff-map-marker">${initials}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16]
  });
}

export function StaffLocationsMap({ staffRows, selectedUserId, onSelectStaff }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView(MAP_CENTER, 15);

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
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const locatedStaff = staffRows.filter((row) => row.hasLocation);

    locatedStaff.forEach((row) => {
      const marker = L.marker([row.latitude, row.longitude], {
        icon: createStaffMarkerIcon(row.initials)
      });

      marker.bindPopup(`
        <strong>${row.name}</strong><br />
        ${row.department}<br />
        ${row.role}<br />
        Last seen: ${row.recordedAt || 'Unknown'}
      `);

      marker.on('click', () => onSelectStaff?.(row.userId));
      marker.addTo(layer);

      if (selectedUserId === row.userId) {
        marker.openPopup();
      }
    });

    if (selectedUserId) {
      const selected = locatedStaff.find((row) => row.userId === selectedUserId);
      if (selected) {
        map.panTo([selected.latitude, selected.longitude]);
      }
    }
  }, [staffRows, selectedUserId, onSelectStaff]);

  return (
    <div className="staff-locations-map-shell">
      <div className="staff-locations-map" ref={containerRef} aria-label="Staff locations map" />
    </div>
  );
}
