"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Loaded from a CDN rather than bundled from node_modules so we don't have
// to fight Next.js's webpack asset handling for Leaflet's default marker
// images (a well-known rough edge with react-leaflet + Next.js).
const DEFAULT_ICON = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MALDIVES_CENTER = [3.5, 73.1];
const MALDIVES_ZOOM = 7;

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 13);
  }, [target, map]);
  return null;
}

function ClickCapture({ active, onPick }) {
  useMapEvents({
    click(e) {
      if (active) onPick(e.latlng);
    },
  });
  return null;
}

export default function MachineMap({ machines, flyTarget, placingFor, pendingLatLng, onPick }) {
  return (
    <MapContainer center={MALDIVES_CENTER} zoom={MALDIVES_ZOOM} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FlyTo target={flyTarget} />
      <ClickCapture active={!!placingFor} onPick={onPick} />

      {machines
        .filter((m) => m.latitude !== null && m.latitude !== undefined && m.longitude !== null && m.longitude !== undefined)
        .map((m) => (
          <Marker key={m.id} position={[Number(m.latitude), Number(m.longitude)]} icon={DEFAULT_ICON}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                {m.picture_data && (
                  <img src={m.picture_data} alt={m.name} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 4, marginBottom: 6 }} />
                )}
                <div style={{ fontWeight: 600 }}>{m.name}{m.model ? ` (${m.model})` : ""}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{m.serial_number}</div>
                <div style={{ fontSize: 12 }}>{m.facility_name}{m.facility_name && m.location_label ? " · " : ""}{m.location_label}</div>
              </div>
            </Popup>
          </Marker>
        ))}

      {pendingLatLng && <Marker position={[pendingLatLng.lat, pendingLatLng.lng]} icon={DEFAULT_ICON} opacity={0.6} />}
    </MapContainer>
  );
}
