import Link from "next/link";
import { School, ratingBgClass } from "@/lib/api";

export default function SchoolCard({ school }: { school: School }) {
  return (
    <Link
      href={`/school/${school.urn}`}
      className="block rounded-lg border border-gray-200 p-4 transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900">
            {school.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {[school.phase, school.type].filter(Boolean).join(" · ")}
          </p>
          {school.postcode && (
            <p className="text-sm text-gray-400">{school.postcode}</p>
          )}
          {school.distance_from_home !== undefined ? (
            <p className="mt-1 text-sm text-blue-600">
              {school.distance_from_home} km from home
            </p>
          ) : school.distance_km !== undefined ? (
            <p className="mt-1 text-sm text-green-700">
              {school.distance_km} km away
            </p>
          ) : null}
        </div>
        {school.ofsted_rating && (
          <span
            className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${ratingBgClass(school.ofsted_rating)}`}
          >
            {school.ofsted_rating}
          </span>
        )}
      </div>
      {(school.ks5_dest_russell_group != null || school.ks5_dest_oxbridge != null) && (
        <div className="mt-2 flex gap-3 border-t border-gray-100 pt-2 text-xs">
          {school.ks5_dest_oxbridge != null && (
            <span className="text-indigo-700">
              <span className="font-semibold">{school.ks5_dest_oxbridge}%</span> Oxbridge
            </span>
          )}
          {school.ks5_dest_russell_group != null && (
            <span className="text-indigo-600">
              <span className="font-semibold">{school.ks5_dest_russell_group}%</span> Russell Group
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
