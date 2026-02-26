"use client";

import { useState, useEffect, useRef } from "react";
import { getHome, setHome, clearHome, HomeLocation } from "@/lib/home";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HomeButton() {
  const [home, setHomeState] = useState<HomeLocation | null>(null);
  const [open, setOpen] = useState(false);
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHomeState(getHome());
    const handler = () => setHomeState(getHome());
    window.addEventListener("home-changed", handler);
    return () => window.removeEventListener("home-changed", handler);
  }, []);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = postcode.trim();
    if (!q) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (data.type === "postcode" && data.latitude && data.longitude) {
        setHome({
          postcode: data.postcode,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setOpen(false);
        setPostcode("");
      } else {
        setError("Could not find that postcode");
      }
    } catch {
      setError("Failed to look up postcode");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    clearHome();
    setPostcode("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        title={home ? `Home: ${home.postcode}` : "Set home address"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 ${home ? "text-green-600" : ""}`}
        >
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
        {home ? home.postcode : "Set Home"}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <p className="mb-2 text-sm font-medium text-gray-700">
            {home ? "Your home address" : "Set your home address"}
          </p>

          {home && (
            <div className="mb-3 flex items-center justify-between rounded bg-green-50 px-3 py-2">
              <span className="text-sm font-medium text-green-800">
                {home.postcode}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Enter postcode..."
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-200"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "..." : "Set"}
            </button>
          </form>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
