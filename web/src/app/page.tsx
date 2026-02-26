import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">
          Find Schools Near You
        </h1>
        <p className="mb-8 text-lg text-gray-500">
          Search by postcode or school name to explore schools across England
        </p>
        <SearchBar large />
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
          <span>Try: SW1A 1AA</span>
          <span>·</span>
          <span>E1 6AN</span>
          <span>·</span>
          <span>Oxford</span>
        </div>
      </div>
    </div>
  );
}
