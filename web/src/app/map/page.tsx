"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  fetchNearbySchools,
  fetchSchool,
  searchSchools,
  School,
} from "@/lib/api";
import { getHome, haversineKm, HomeLocation } from "@/lib/home";
import type { CatchmentCircle } from "@/components/SchoolMap";
import SearchBar from "@/components/SearchBar";
import SchoolCard from "@/components/SchoolCard";
import Filters from "@/components/Filters";

const SchoolMap = dynamic(() => import("@/components/SchoolMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-100">
      Loading map...
    </div>
  ),
});

// Default center: London
const DEFAULT_LAT = 51.5074;
const DEFAULT_LNG = -0.1278;

function MapPageContent() {
  const searchParams = useSearchParams();

  const [home, setHomeState] = useState<HomeLocation | null>(null);
  const [center, setCenter] = useState<[number, number]>([
    DEFAULT_LAT,
    DEFAULT_LNG,
  ]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [rating, setRating] = useState("");
  const [radius, setRadius] = useState(5);
  const [showList, setShowList] = useState(false);
  const [catchmentCircle, setCatchmentCircle] = useState<
    CatchmentCircle | undefined
  >();

  const enrichWithHomeDistance = useCallback(
    (data: School[]): School[] => {
      const h = getHome();
      if (!h) return data;
      return data
        .map((s) => {
          if (s.latitude == null || s.longitude == null) return s;
          const d = Math.round(haversineKm(h.latitude, h.longitude, s.latitude, s.longitude) * 100) / 100;
          return { ...s, distance_from_home: d };
        })
        .sort((a, b) => (a.distance_from_home ?? Infinity) - (b.distance_from_home ?? Infinity));
    },
    [],
  );

  // Listen for home changes
  useEffect(() => {
    setHomeState(getHome());
    const handler = () => {
      setHomeState(getHome());
      setSchools((prev) => enrichWithHomeDistance(prev));
    };
    window.addEventListener("home-changed", handler);
    return () => window.removeEventListener("home-changed", handler);
  }, [enrichWithHomeDistance]);

  const handleSchoolClick = useCallback(async (urn: number) => {
    try {
      const detail = await fetchSchool(urn);
      const entry = detail.catchment?.find(
        (e) => e.last_distance_offered != null,
      );
      if (entry && detail.latitude && detail.longitude) {
        setCatchmentCircle({
          lat: detail.latitude,
          lng: detail.longitude,
          radiusMiles: entry.last_distance_offered!,
          label: `${entry.last_distance_offered!.toFixed(2)} mi (${entry.year})`,
        });
      } else {
        setCatchmentCircle(undefined);
      }
      // Enrich the school in the list with catchment data for the popup
      if (detail.catchment?.length) {
        setSchools((prev) =>
          prev.map((s) =>
            s.urn === urn ? { ...s, catchment: detail.catchment } : s,
          ),
        );
      }
    } catch {
      setCatchmentCircle(undefined);
    }
  }, []);

  const loadSchools = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      try {
        const data = await fetchNearbySchools(
          lat,
          lng,
          radius,
          phase || undefined,
          rating || undefined,
        );
        setSchools(enrichWithHomeDistance(data));
      } catch (err) {
        console.error("Failed to load schools:", err);
      } finally {
        setLoading(false);
      }
    },
    [radius, phase, rating, enrichWithHomeDistance],
  );

  useEffect(() => {
    const q = searchParams.get("q");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (lat && lng) {
      const la = parseFloat(lat);
      const ln = parseFloat(lng);
      setCenter([la, ln]);
      loadSchools(la, ln);
    } else if (q) {
      searchSchools(q).then((result) => {
        if (result.type === "postcode") {
          setCenter([result.latitude, result.longitude]);
          loadSchools(result.latitude, result.longitude);
        } else if (result.results.length > 0) {
          const first = result.results[0];
          if (first.latitude && first.longitude) {
            setCenter([first.latitude, first.longitude]);
            loadSchools(first.latitude, first.longitude);
          }
          setSchools(enrichWithHomeDistance(result.results));
        }
      });
    } else {
      const h = getHome();
      if (h) {
        setCenter([h.latitude, h.longitude]);
        loadSchools(h.latitude, h.longitude);
      } else {
        loadSchools(DEFAULT_LAT, DEFAULT_LNG);
      }
    }
  }, [searchParams, loadSchools]);

  // Reload when filters change (skip initial mount — the searchParams effect handles that)
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    loadSchools(center[0], center[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, rating, radius]);

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col md:flex-row">
      {/* Sidebar */}
      <div
        className={`${
          showList ? "h-1/2 md:h-full" : "h-auto md:h-full"
        } flex w-full flex-col overflow-hidden border-b border-gray-200 md:w-96 md:border-b-0 md:border-r`}
      >
        <div className="space-y-3 border-b border-gray-200 p-4">
          <SearchBar />
          <Filters
            phase={phase}
            setPhase={setPhase}
            rating={rating}
            setRating={setRating}
            radius={radius}
            setRadius={setRadius}
          />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {loading ? "Searching..." : `${schools.length} schools found`}
            </span>
            <button
              onClick={() => setShowList(!showList)}
              className="text-green-600 hover:underline md:hidden"
            >
              {showList ? "Hide list" : "Show list"}
            </button>
          </div>
        </div>
        <div
          className={`flex-1 overflow-y-auto ${showList ? "" : "hidden md:block"}`}
        >
          <div className="space-y-2 p-4">
            {schools.map((school) => (
              <SchoolCard key={school.urn} school={school} />
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <SchoolMap
          center={center}
          schools={schools}
          catchmentCircle={catchmentCircle}
          onSchoolClick={handleSchoolClick}
          homeLocation={home ? { lat: home.latitude, lng: home.longitude, postcode: home.postcode } : undefined}
        />
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-57px)] items-center justify-center">
          Loading...
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}
