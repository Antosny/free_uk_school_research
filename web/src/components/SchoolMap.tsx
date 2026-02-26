"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { School, ratingColor } from "@/lib/api";

function createIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
    className: "",
  });
}

const homeIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="#2563eb"/>
    <path d="M14 7l-7 6v8h5v-5h4v5h5v-8l-7-6z" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
  className: "",
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [map, lat, lng]);
  return null;
}

export interface CatchmentCircle {
  lat: number;
  lng: number;
  radiusMiles: number;
  label?: string;
}

export interface HomeMarker {
  lat: number;
  lng: number;
  postcode: string;
}

interface SchoolMapProps {
  center: [number, number];
  zoom?: number;
  schools: School[];
  className?: string;
  catchmentRadiusMiles?: number;
  catchmentCircle?: CatchmentCircle;
  onSchoolClick?: (urn: number) => void;
  homeLocation?: HomeMarker;
}

export default function SchoolMap({
  center,
  zoom = 13,
  schools,
  className = "",
  catchmentRadiusMiles,
  catchmentCircle,
  onSchoolClick,
  homeLocation,
}: SchoolMapProps) {
  // Legacy prop: circle centered on map center
  const legacyRadiusMetres = catchmentRadiusMiles
    ? catchmentRadiusMiles * 1609.34
    : undefined;

  const circleStyle = {
    color: "#16a34a",
    fillColor: "#22c55e",
    fillOpacity: 0.1,
    weight: 2,
    dashArray: "6 4",
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`h-full w-full ${className}`}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap lat={center[0]} lng={center[1]} />
      {legacyRadiusMetres != null && (
        <Circle
          center={center}
          radius={legacyRadiusMetres}
          pathOptions={circleStyle}
        />
      )}
      {catchmentCircle && (
        <Circle
          center={[catchmentCircle.lat, catchmentCircle.lng]}
          radius={catchmentCircle.radiusMiles * 1609.34}
          pathOptions={circleStyle}
        />
      )}
      {homeLocation && (
        <Marker
          position={[homeLocation.lat, homeLocation.lng]}
          icon={homeIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-blue-700">Home</p>
              <p className="text-xs text-gray-500">{homeLocation.postcode}</p>
            </div>
          </Popup>
        </Marker>
      )}
      {schools.map(
        (school) =>
          school.latitude != null &&
          school.longitude != null && (
            <Marker
              key={school.urn}
              position={[school.latitude, school.longitude]}
              icon={createIcon(ratingColor(school.ofsted_rating))}
              eventHandlers={
                onSchoolClick
                  ? { click: () => onSchoolClick(school.urn) }
                  : undefined
              }
            >
              <Popup>
                <div className="min-w-[180px]">
                  <a
                    href={`/school/${school.urn}`}
                    className="font-semibold text-green-700 hover:underline"
                  >
                    {school.name}
                  </a>
                  <p className="text-xs text-gray-500">
                    {school.phase} · {school.type}
                  </p>
                  {school.ofsted_rating && (
                    <p className="mt-1 text-xs">
                      Ofsted: <strong>{school.ofsted_rating}</strong>
                    </p>
                  )}
                  {school.distance_km !== undefined && (
                    <p className="text-xs text-gray-400">
                      {school.distance_km} km away
                    </p>
                  )}
                  {school.catchment && school.catchment.length > 0 && (
                    <p className="mt-1 text-xs text-green-700">
                      Catchment:{" "}
                      {school.catchment[0].last_distance_offered?.toFixed(2)} mi
                      ({school.catchment[0].year})
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ),
      )}
    </MapContainer>
  );
}
