"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";

const MALDIVES_CENTER = { lat: 3.5, lng: 73.1 };
const MALDIVES_ZOOM = 7;
const FLY_ZOOM = 13;

// Built lazily (not as a module constant) since it needs window.google,
// which only exists once the Maps script has actually loaded.
function pendingIcon() {
  return {
    path: "M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z",
    fillColor: "#1F3A5F",
    fillOpacity: 0.55,
    strokeColor: "#1F3A5F",
    strokeWeight: 1,
    scale: 1.6,
    anchor: new window.google.maps.Point(12, 22),
  };
}

export default function MachineMap({ machines, flyTarget, placingFor, pendingLatLng, onPick }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey || "" });
  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null);

  const onLoad = useCallback((map) => { mapRef.current = map; }, []);
  const onUnmount = useCallback(() => { mapRef.current = null; }, []);

  useEffect(() => {
    if (flyTarget && mapRef.current) {
      mapRef.current.panTo({ lat: flyTarget.lat, lng: flyTarget.lon });
      mapRef.current.setZoom(FLY_ZOOM);
    }
  }, [flyTarget]);

  function handleMapClick(e) {
    if (placingFor) onPick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }

  if (!apiKey) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-gray-500 p-6 text-center">
        Google Maps isn&apos;t configured yet — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (and GOOGLE_MAPS_API_KEY for the
        server-side search) in your environment variables.
      </div>
    );
  }
  if (loadError) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-red-500">Failed to load Google Maps.</div>;
  }
  if (!isLoaded) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">Loading map...</div>;
  }

  const located = machines.filter(
    (m) => m.latitude !== null && m.latitude !== undefined && m.longitude !== null && m.longitude !== undefined
  );

  return (
    <GoogleMap
      center={MALDIVES_CENTER}
      zoom={MALDIVES_ZOOM}
      mapContainerStyle={{ width: "100%", height: "100%" }}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={{ streetViewControl: false, mapTypeControl: false }}
    >
      {located.map((m) => (
        <Marker
          key={m.id}
          position={{ lat: Number(m.latitude), lng: Number(m.longitude) }}
          onClick={() => setSelected(m)}
        />
      ))}

      {pendingLatLng && (
        <Marker position={{ lat: pendingLatLng.lat, lng: pendingLatLng.lng }} icon={pendingIcon()} />
      )}

      {selected && (
        <InfoWindow
          position={{ lat: Number(selected.latitude), lng: Number(selected.longitude) }}
          onCloseClick={() => setSelected(null)}
        >
          <div style={{ minWidth: 160 }}>
            {selected.picture_data && (
              <img src={selected.picture_data} alt={selected.name} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 4, marginBottom: 6 }} />
            )}
            <div style={{ fontWeight: 600 }}>{selected.name}{selected.model ? ` (${selected.model})` : ""}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{selected.serial_number}</div>
            <div style={{ fontSize: 12 }}>{selected.facility_name}{selected.facility_name && selected.location_label ? " · " : ""}{selected.location_label}</div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
