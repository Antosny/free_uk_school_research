const STORAGE_KEY = "locrating_home";

export interface HomeLocation {
  postcode: string;
  latitude: number;
  longitude: number;
}

export function getHome(): HomeLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HomeLocation;
  } catch {
    return null;
  }
}

export function setHome(home: HomeLocation): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(home));
  window.dispatchEvent(new Event("home-changed"));
}

export function clearHome(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("home-changed"));
}

/** Haversine distance in km between two points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
