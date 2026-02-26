"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/map?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter a postcode or school name..."
        className={`flex-1 rounded-lg border border-gray-300 px-4 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 ${
          large ? "py-4 text-lg" : "py-2 text-sm"
        }`}
      />
      <button
        type="submit"
        className={`rounded-lg bg-green-600 font-medium text-white hover:bg-green-700 ${
          large ? "px-8 py-4 text-lg" : "px-4 py-2 text-sm"
        }`}
      >
        Search
      </button>
    </form>
  );
}
