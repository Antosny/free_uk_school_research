"use client";

interface FiltersProps {
  phase: string;
  setPhase: (v: string) => void;
  rating: string;
  setRating: (v: string) => void;
  radius: number;
  setRadius: (v: number) => void;
}

export default function Filters({
  phase,
  setPhase,
  rating,
  setRating,
  radius,
  setRadius,
}: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={phase}
        onChange={(e) => setPhase(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
      >
        <option value="">All Phases</option>
        <option value="Primary">Primary</option>
        <option value="Secondary">Secondary</option>
        <option value="All-through">All-through</option>
        <option value="16 plus">16 plus</option>
      </select>

      <select
        value={rating}
        onChange={(e) => setRating(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
      >
        <option value="">All Ratings</option>
        <option value="Outstanding">Outstanding</option>
        <option value="Good">Good</option>
        <option value="Requires Improvement">Requires Improvement</option>
        <option value="Inadequate">Inadequate</option>
      </select>

      <select
        value={radius}
        onChange={(e) => setRadius(Number(e.target.value))}
        className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
      >
        <option value={1}>1 km</option>
        <option value={2}>2 km</option>
        <option value={5}>5 km</option>
        <option value={10}>10 km</option>
        <option value={20}>20 km</option>
      </select>
    </div>
  );
}
