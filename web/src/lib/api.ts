const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CatchmentEntry {
  year: number;
  last_distance_offered: number | null;
  offers_made: number | null;
  applications: number | null;
}

export interface School {
  urn: number;
  name: string;
  type: string | null;
  phase: string | null;
  age_low: number | null;
  age_high: number | null;
  num_pupils: number | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  ofsted_rating: string | null;
  ofsted_date: string | null;
  ks2_reading: number | null;
  ks2_maths: number | null;
  ks4_attainment8: number | null;
  ks4_progress8: number | null;
  ks4_dest_education: number | null;
  ks4_dest_apprenticeships: number | null;
  ks4_dest_employment: number | null;
  ks5_dest_higher_education: number | null;
  ks5_dest_further_education: number | null;
  ks5_dest_apprenticeships: number | null;
  ks5_dest_employment: number | null;
  fsm_percent: number | null;
  ethnicity_white: number | null;
  ethnicity_mixed: number | null;
  ethnicity_asian: number | null;
  ethnicity_black: number | null;
  ethnicity_other: number | null;
  ethnicity_white_british: number | null;
  ethnicity_irish: number | null;
  ethnicity_gypsy_roma: number | null;
  ethnicity_other_white: number | null;
  ethnicity_mixed_white_black_caribbean: number | null;
  ethnicity_mixed_white_black_african: number | null;
  ethnicity_mixed_white_asian: number | null;
  ethnicity_other_mixed: number | null;
  ethnicity_indian: number | null;
  ethnicity_pakistani: number | null;
  ethnicity_bangladeshi: number | null;
  ethnicity_chinese: number | null;
  ethnicity_other_asian: number | null;
  ethnicity_black_caribbean: number | null;
  ethnicity_black_african: number | null;
  ethnicity_other_black: number | null;
  distance_km?: number;
  distance_from_home?: number;
  catchment?: CatchmentEntry[];
}

export interface PostcodeResult {
  type: "postcode";
  postcode: string;
  latitude: number;
  longitude: number;
}

export interface NameSearchResult {
  type: "name";
  query: string;
  results: School[];
}

export type SearchResult = PostcodeResult | NameSearchResult;

export async function fetchNearbySchools(
  lat: number,
  lng: number,
  radiusKm: number = 5,
  phase?: string,
  rating?: string,
): Promise<School[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius_km: radiusKm.toString(),
  });
  if (phase) params.set("phase", phase);
  if (rating) params.set("rating", rating);

  const res = await fetch(`${API_BASE}/api/schools?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchSchool(urn: number): Promise<School> {
  const res = await fetch(`${API_BASE}/api/schools/${urn}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function searchSchools(query: string): Promise<SearchResult> {
  const res = await fetch(
    `${API_BASE}/api/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function ratingColor(rating: string | null): string {
  switch (rating) {
    case "Outstanding":
      return "#166534"; // dark green
    case "Good":
      return "#22c55e"; // green
    case "Requires Improvement":
      return "#f59e0b"; // amber
    case "Inadequate":
      return "#ef4444"; // red
    default:
      return "#9ca3af"; // grey
  }
}

export function ratingBgClass(rating: string | null): string {
  switch (rating) {
    case "Outstanding":
      return "bg-green-800 text-white";
    case "Good":
      return "bg-green-500 text-white";
    case "Requires Improvement":
      return "bg-amber-500 text-white";
    case "Inadequate":
      return "bg-red-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
}
