"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { School, ratingColor } from "@/lib/api";

const INDEPENDENT_COLOR = "#7c3aed"; // purple

function isIndependent(school: School): boolean {
  return school.type?.toLowerCase().includes("independent") ?? false;
}

function isGrammar(school: School): boolean {
  return (
    school.admissions_policy === "Selective" &&
    !isIndependent(school)
  );
}

const iconCache = new Map<string, L.DivIcon>();

function createIcon(color: string, label?: string) {
  const key = `${color}:${label ?? ""}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const center = label
    ? `<text x="12" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="Arial,sans-serif">${label}</text>`
    : `<circle cx="12" cy="12" r="5" fill="white"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/>
    ${center}
  </svg>`;
  const icon = L.divIcon({
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
    className: "",
  });
  iconCache.set(key, icon);
  return icon;
}

function schoolIcon(school: School): L.DivIcon {
  const color = isIndependent(school) ? INDEPENDENT_COLOR : ratingColor(school.ofsted_rating);
  const label = isGrammar(school) ? "G" : undefined;
  return createIcon(color, label);
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

export interface MapBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }) {
  const cbRef = useRef(onBoundsChange);
  cbRef.current = onBoundsChange;

  const emitBounds = useCallback((map: L.Map) => {
    const b = map.getBounds();
    cbRef.current({
      south: b.getSouth(),
      north: b.getNorth(),
      west: b.getWest(),
      east: b.getEast(),
    });
  }, []);

  const map = useMapEvents({
    moveend: () => emitBounds(map),
    zoomend: () => emitBounds(map),
  });

  // Emit initial bounds after all effects (including RecenterMap) have settled
  useEffect(() => {
    const timer = setTimeout(() => emitBounds(map), 0);
    return () => clearTimeout(timer);
  }, [map, emitBounds]);

  return null;
}

interface SchoolMapProps {
  center: [number, number];
  zoom?: number;
  schools: School[];
  className?: string;
  catchmentRadiusMiles?: number;
  catchmentCircle?: CatchmentCircle;
  onSchoolClick?: (urn: number) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  homeLocation?: HomeMarker;
  tooManySchools?: boolean;
}

export default function SchoolMap({
  center,
  zoom = 13,
  schools,
  className = "",
  catchmentRadiusMiles,
  catchmentCircle,
  onSchoolClick,
  onBoundsChange,
  homeLocation,
  tooManySchools,
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
    <div className="relative h-full w-full">
      {tooManySchools && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center">
          <div className="pointer-events-auto rounded-lg bg-amber-50 px-4 py-2 shadow-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800">
              Too many schools to display. Please zoom in to see schools on the map.
            </p>
          </div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        className={`h-full w-full ${className}`}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <RecenterMap lat={center[0]} lng={center[1]} />
        {onBoundsChange && <BoundsWatcher onBoundsChange={onBoundsChange} />}
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
        (school, idx) => {
          if (school.latitude == null || school.longitude == null) return null;
          // Offset co-located markers so each icon is visible
          const dupesBefore = schools
            .slice(0, idx)
            .filter(
              (s) => s.latitude === school.latitude && s.longitude === school.longitude,
            ).length;
          const lat = school.latitude + dupesBefore * 0.00008;
          const lng = school.longitude + dupesBefore * 0.00008;
          return (
            <Marker
              key={school.urn}
              position={[lat, lng]}
              icon={schoolIcon(school)}
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
          );
        },
      )}
      </MapContainer>
    </div>
  );
}
