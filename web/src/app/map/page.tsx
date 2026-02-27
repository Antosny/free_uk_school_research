"use client";

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  fetchSchoolsByBounds,
  fetchSchool,
  searchSchools,
  School,
} from "@/lib/api";
import { getHome, haversineKm, HomeLocation } from "@/lib/home";
import type { CatchmentCircle, MapBounds } from "@/components/SchoolMap";
import SearchBar from "@/components/SearchBar";
import SchoolCard from "@/components/SchoolCard";
import SchoolDetail from "@/components/SchoolDetail";
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
  const [center, setCenter] = useState<[number, number]>(() => {
    const h = getHome();
    if (h) return [h.latitude, h.longitude];
    return [DEFAULT_LAT, DEFAULT_LNG];
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [rating, setRating] = useState("");
  const [showList, setShowList] = useState(false);
  const [showGrammar, setShowGrammar] = useState(true);
  const [showIndependent, setShowIndependent] = useState(true);
  const [tooManySchools, setTooManySchools] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [catchmentCircle, setCatchmentCircle] = useState<
    CatchmentCircle | undefined
  >();
  const boundsRef = useRef<MapBounds | null>(null);

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
      setSelectedSchool(detail);
      setShowList(true); // ensure panel is visible on mobile
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

  const loadSchoolsForBounds = useCallback(
    async (bounds: MapBounds) => {
      setLoading(true);
      try {
        const result = await fetchSchoolsByBounds(
          bounds,
          phase || undefined,
          rating || undefined,
        );
        if (result.total > 1500) {
          setTooManySchools(true);
          setSchools([]);
        } else {
          setTooManySchools(false);
          setSchools(enrichWithHomeDistance(result.schools));
        }
      } catch (err) {
        console.error("Failed to load schools:", err);
      } finally {
        setLoading(false);
      }
    },
    [phase, rating, enrichWithHomeDistance],
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      boundsRef.current = bounds;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        loadSchoolsForBounds(bounds);
      }, 300);
    },
    [loadSchoolsForBounds],
  );

  useEffect(() => {
    const q = searchParams.get("q");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (lat && lng) {
      const la = parseFloat(lat);
      const ln = parseFloat(lng);
      setCenter([la, ln]);
      // BoundsWatcher will fire on recenter and load schools
    } else if (q) {
      searchSchools(q).then((result) => {
        if (result.type === "postcode") {
          setCenter([result.latitude, result.longitude]);
        } else if (result.results.length > 0) {
          const first = result.results[0];
          if (first.latitude && first.longitude) {
            setCenter([first.latitude, first.longitude]);
          }
          setSchools(enrichWithHomeDistance(result.results));
        }
      });
    } else {
      const h = getHome();
      if (h) {
        setCenter([h.latitude, h.longitude]);
      }
      // BoundsWatcher will fire on map init and load schools
    }
  }, [searchParams, enrichWithHomeDistance]);

  // Reload when filters change (skip initial mount — the BoundsWatcher handles that)
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (boundsRef.current) {
      loadSchoolsForBounds(boundsRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, rating]);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const indep = s.type?.toLowerCase().includes("independent") ?? false;
      const grammar = s.admissions_policy === "Selective" && !indep;
      if (!showGrammar && grammar) return false;
      if (!showIndependent && indep) return false;
      return true;
    });
  }, [schools, showGrammar, showIndependent]);

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col md:flex-row">
      {/* Left side: search + map */}
      <div className="flex flex-1 flex-col">
        <div className="space-y-3 border-b border-gray-200 p-4">
          <SearchBar />
          <Filters
            phase={phase}
            setPhase={setPhase}
            rating={rating}
            setRating={setRating}
            showGrammar={showGrammar}
            setShowGrammar={setShowGrammar}
            showIndependent={showIndependent}
            setShowIndependent={setShowIndependent}
          />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {loading
                ? "Searching..."
                : tooManySchools
                  ? "Too many schools — zoom in to see results"
                  : `${filteredSchools.length} schools found`}
            </span>
            <button
              onClick={() => setShowList(!showList)}
              className="text-green-600 hover:underline md:hidden"
            >
              {showList ? "Hide list" : "Show list"}
            </button>
          </div>
        </div>
        <div className="flex-1">
          <SchoolMap
            center={center}
            schools={filteredSchools}
            catchmentCircle={catchmentCircle}
            onSchoolClick={handleSchoolClick}
            onBoundsChange={handleBoundsChange}
            homeLocation={home ? { lat: home.latitude, lng: home.longitude, postcode: home.postcode } : undefined}
            tooManySchools={tooManySchools}
          />
        </div>
      </div>

      {/* Right side: school detail or school list */}
      <div
        className={`${
          showList ? "h-1/2 md:h-full" : "h-auto md:h-full"
        } flex w-full flex-col overflow-hidden border-t border-gray-200 md:w-96 md:border-l md:border-t-0`}
      >
        <div
          className={`flex-1 overflow-y-auto ${showList ? "" : "hidden md:block"}`}
        >
          {selectedSchool ? (
            <div className="p-4">
              <button
                onClick={() => {
                  setSelectedSchool(null);
                  setCatchmentCircle(undefined);
                }}
                className="mb-3 inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                </svg>
                Back to list
              </button>
              <SchoolDetail school={selectedSchool} />
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {filteredSchools.map((school) => (
                <SchoolCard key={school.urn} school={school} />
              ))}
            </div>
          )}
        </div>
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
