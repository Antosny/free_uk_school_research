"use client";

interface FiltersProps {
  phase: string;
  setPhase: (v: string) => void;
  rating: string;
  setRating: (v: string) => void;
  showGrammar: boolean;
  setShowGrammar: (v: boolean) => void;
  showIndependent: boolean;
  setShowIndependent: (v: boolean) => void;
}

export default function Filters({
  phase,
  setPhase,
  rating,
  setRating,
  showGrammar,
  setShowGrammar,
  showIndependent,
  setShowIndependent,
}: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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

      <label className="flex items-center gap-1.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={showGrammar}
          onChange={(e) => setShowGrammar(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        Grammar
      </label>

      <label className="flex items-center gap-1.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={showIndependent}
          onChange={(e) => setShowIndependent(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        Independent
      </label>
    </div>
  );
}
