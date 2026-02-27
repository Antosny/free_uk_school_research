"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  fetchSchool,
  fetchNearbySchools,
  School,
  ratingBgClass,
} from "@/lib/api";
import { getHome, HomeLocation } from "@/lib/home";
import SchoolCard from "@/components/SchoolCard";

const SchoolMap = dynamic(() => import("@/components/SchoolMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center bg-gray-100">
      Loading map...
    </div>
  ),
});

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const urn = Number(params.urn);
  const [school, setSchool] = useState<School | null>(null);
  const [nearby, setNearby] = useState<School[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [home, setHomeState] = useState<HomeLocation | null>(null);

  useEffect(() => {
    setHomeState(getHome());
    const handler = () => setHomeState(getHome());
    window.addEventListener("home-changed", handler);
    return () => window.removeEventListener("home-changed", handler);
  }, []);

  useEffect(() => {
    if (!urn) return;
    fetchSchool(urn)
      .then((s) => {
        setSchool(s);
        if (s.latitude && s.longitude) {
          fetchNearbySchools(s.latitude, s.longitude, 3).then((list) =>
            setNearby(list.filter((n) => n.urn !== s.urn).slice(0, 10)),
          );
        }
      })
      .catch(() => setError("School not found"));
  }, [urn]);

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <p className="text-lg text-gray-500">{error}</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const isPrimary = school.phase?.toLowerCase().includes("primary");

  const hasKs4Dest =
    school.ks4_dest_education != null ||
    school.ks4_dest_apprenticeships != null ||
    school.ks4_dest_employment != null;
  const hasKs5Dest =
    school.ks5_dest_higher_education != null ||
    school.ks5_dest_further_education != null ||
    school.ks5_dest_apprenticeships != null ||
    school.ks5_dest_employment != null;
  const hasKs5HeDest =
    school.ks5_dest_russell_group != null ||
    school.ks5_dest_oxbridge != null ||
    school.ks5_dest_top_third != null;
  const hasDestinations = hasKs4Dest || hasKs5Dest || hasKs5HeDest;

  const hasEthnicity =
    school.ethnicity_white != null ||
    school.ethnicity_mixed != null ||
    school.ethnicity_asian != null ||
    school.ethnicity_black != null ||
    school.ethnicity_other != null;

  // Ethnicity sub-breakdowns by group
  const ethnicityBreakdowns: {
    group: string;
    groupTotal: number | null;
    items: { label: string; value: number | null; color: string }[];
  }[] = [
    {
      group: "White",
      groupTotal: school.ethnicity_white,
      items: [
        { label: "White British", value: school.ethnicity_white_british, color: "bg-sky-300" },
        { label: "Irish", value: school.ethnicity_irish, color: "bg-sky-400" },
        { label: "Gypsy/Roma", value: school.ethnicity_gypsy_roma, color: "bg-sky-500" },
        { label: "Other White", value: school.ethnicity_other_white, color: "bg-sky-600" },
      ],
    },
    {
      group: "Mixed",
      groupTotal: school.ethnicity_mixed,
      items: [
        { label: "White & Black Caribbean", value: school.ethnicity_mixed_white_black_caribbean, color: "bg-violet-300" },
        { label: "White & Black African", value: school.ethnicity_mixed_white_black_african, color: "bg-violet-400" },
        { label: "White & Asian", value: school.ethnicity_mixed_white_asian, color: "bg-violet-500" },
        { label: "Other Mixed", value: school.ethnicity_other_mixed, color: "bg-violet-600" },
      ],
    },
    {
      group: "Asian",
      groupTotal: school.ethnicity_asian,
      items: [
        { label: "Indian", value: school.ethnicity_indian, color: "bg-amber-300" },
        { label: "Pakistani", value: school.ethnicity_pakistani, color: "bg-amber-400" },
        { label: "Bangladeshi", value: school.ethnicity_bangladeshi, color: "bg-amber-500" },
        { label: "Chinese", value: school.ethnicity_chinese, color: "bg-orange-400" },
        { label: "Other Asian", value: school.ethnicity_other_asian, color: "bg-amber-600" },
      ],
    },
    {
      group: "Black",
      groupTotal: school.ethnicity_black,
      items: [
        { label: "Caribbean", value: school.ethnicity_black_caribbean, color: "bg-emerald-400" },
        { label: "African", value: school.ethnicity_black_african, color: "bg-emerald-500" },
        { label: "Other Black", value: school.ethnicity_other_black, color: "bg-emerald-600" },
      ],
    },
  ];

  // Latest catchment distance for the map radius
  const latestCatchment = school.catchment?.find(
    (e) => e.last_distance_offered != null,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back to map */}
      <button
        onClick={() => {
          if (school.latitude && school.longitude) {
            router.push(`/map?lat=${school.latitude}&lng=${school.longitude}`);
          } else {
            router.push("/map");
          }
        }}
        className="mb-4 inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-900"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Back to map
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{school.name}</h1>
        <p className="mt-1 text-gray-500">
          {[school.phase, school.type].filter(Boolean).join(" · ")}
        </p>
        {school.postcode && (
          <p className="text-sm text-gray-400">{school.postcode}</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details */}
        <div className="space-y-4">
          {/* Ofsted */}
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Ofsted Rating
            </h2>
            {school.ofsted_rating ? (
              <div className="flex items-center gap-3">
                <span
                  className={`rounded px-3 py-1 text-sm font-semibold ${ratingBgClass(school.ofsted_rating)}`}
                >
                  {school.ofsted_rating}
                </span>
                {school.ofsted_date && (
                  <span className="text-sm text-gray-400">
                    Inspected {school.ofsted_date}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No rating available</p>
            )}
          </div>

          {/* School info */}
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              School Info
            </h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-gray-500">URN</dt>
              <dd className="text-gray-900">{school.urn}</dd>
              {school.age_low != null && school.age_high != null && (
                <>
                  <dt className="text-gray-500">Age Range</dt>
                  <dd className="text-gray-900">
                    {school.age_low}–{school.age_high}
                  </dd>
                </>
              )}
              {school.num_pupils != null && (
                <>
                  <dt className="text-gray-500">Pupils</dt>
                  <dd className="text-gray-900">
                    {school.num_pupils.toLocaleString()}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* Catchment — Last Distance Offered */}
          {school.catchment && school.catchment.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Catchment — Last Distance Offered
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 font-medium">Year</th>
                    <th className="pb-2 font-medium">Distance</th>
                    <th className="pb-2 font-medium">Offers</th>
                    <th className="pb-2 font-medium">Apps</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {school.catchment.map((entry, i) => {
                    const prev = school.catchment?.[i + 1];
                    const trend =
                      entry.last_distance_offered != null &&
                      prev?.last_distance_offered != null
                        ? entry.last_distance_offered > prev.last_distance_offered
                          ? "up"
                          : entry.last_distance_offered < prev.last_distance_offered
                            ? "down"
                            : null
                        : null;

                    return (
                      <tr
                        key={entry.year}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-1.5 text-gray-900">
                          {entry.year}/{(entry.year + 1).toString().slice(-2)}
                        </td>
                        <td className="py-1.5 text-gray-900">
                          {entry.last_distance_offered != null
                            ? `${entry.last_distance_offered.toFixed(2)} mi`
                            : "—"}
                        </td>
                        <td className="py-1.5 text-gray-600">
                          {entry.offers_made ?? "—"}
                        </td>
                        <td className="py-1.5 text-gray-600">
                          {entry.applications ?? "—"}
                        </td>
                        <td className="py-1.5 text-right">
                          {trend === "up" && (
                            <span
                              className="text-green-600"
                              title="Distance increased (easier to get in)"
                            >
                              ▲
                            </span>
                          )}
                          {trend === "down" && (
                            <span
                              className="text-red-500"
                              title="Distance decreased (harder to get in)"
                            >
                              ▼
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-400">
                Furthest distance from which a place was offered on National
                Offers Day. ▲ = easier to get in, ▼ = harder.
              </p>
            </div>
          )}

          {/* Exam Results */}
          {(isPrimary
            ? school.ks2_reading != null || school.ks2_maths != null
            : school.ks4_attainment8 != null ||
              school.ks4_progress8 != null) && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {isPrimary ? "KS2 Results" : "KS4 Results"}
              </h2>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                {isPrimary ? (
                  <>
                    {school.ks2_reading != null && (
                      <>
                        <dt className="text-gray-500">Reading</dt>
                        <dd className="text-gray-900">{school.ks2_reading}</dd>
                      </>
                    )}
                    {school.ks2_maths != null && (
                      <>
                        <dt className="text-gray-500">Maths</dt>
                        <dd className="text-gray-900">{school.ks2_maths}</dd>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {school.ks4_attainment8 != null && (
                      <>
                        <dt className="text-gray-500">Attainment 8</dt>
                        <dd className="text-gray-900">
                          {school.ks4_attainment8}
                        </dd>
                      </>
                    )}
                    {school.ks4_progress8 != null && (
                      <>
                        <dt className="text-gray-500">Progress 8</dt>
                        <dd className="text-gray-900">
                          {school.ks4_progress8}
                        </dd>
                      </>
                    )}
                  </>
                )}
              </dl>
            </div>
          )}

          {/* Student Destinations */}
          {hasDestinations && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Student Destinations
              </h2>

              {hasKs4Dest && (() => {
                const items = [
                  { label: "Education", value: school.ks4_dest_education, color: "bg-blue-500" },
                  { label: "Apprenticeships", value: school.ks4_dest_apprenticeships, color: "bg-amber-500" },
                  { label: "Employment", value: school.ks4_dest_employment, color: "bg-green-500" },
                ].filter((d) => d.value != null && d.value > 0);
                const total = items.reduce((sum, d) => sum + (d.value ?? 0), 0);

                return (
                  <div className="mb-3">
                    <p className="mb-1.5 text-xs font-medium text-gray-500">
                      After Year 11 (KS4)
                    </p>
                    <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100">
                      {items.map((d) => (
                        <div
                          key={d.label}
                          className={`${d.color} h-full`}
                          style={{ width: `${((d.value ?? 0) / Math.max(total, 1)) * 100}%` }}
                          title={`${d.label}: ${d.value}%`}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                      {items.map((d) => (
                        <span key={d.label} className="flex items-center gap-1">
                          <span className={`inline-block h-2 w-2 rounded-full ${d.color}`} />
                          {d.label} {d.value}%
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {hasKs5Dest && (() => {
                const items = [
                  { label: "Higher Ed", value: school.ks5_dest_higher_education, color: "bg-indigo-500" },
                  { label: "Further Ed", value: school.ks5_dest_further_education, color: "bg-blue-400" },
                  { label: "Apprenticeships", value: school.ks5_dest_apprenticeships, color: "bg-amber-500" },
                  { label: "Employment", value: school.ks5_dest_employment, color: "bg-green-500" },
                ].filter((d) => d.value != null && d.value > 0);
                const total = items.reduce((sum, d) => sum + (d.value ?? 0), 0);

                return (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-500">
                      After Year 13 (16-18)
                    </p>
                    <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100">
                      {items.map((d) => (
                        <div
                          key={d.label}
                          className={`${d.color} h-full`}
                          style={{ width: `${((d.value ?? 0) / Math.max(total, 1)) * 100}%` }}
                          title={`${d.label}: ${d.value}%`}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                      {items.map((d) => (
                        <span key={d.label} className="flex items-center gap-1">
                          <span className={`inline-block h-2 w-2 rounded-full ${d.color}`} />
                          {d.label} {d.value}%
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {hasKs5HeDest && (
                <div className="mt-3 rounded-md bg-indigo-50 p-3">
                  <p className="mb-2 text-xs font-medium text-indigo-700">
                    Higher Education Breakdown (16-18 leavers)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {school.ks5_dest_oxbridge != null && (
                      <div>
                        <p className="text-lg font-bold text-indigo-800">
                          {school.ks5_dest_oxbridge}%
                        </p>
                        <p className="text-xs text-indigo-600">Oxbridge</p>
                      </div>
                    )}
                    {school.ks5_dest_russell_group != null && (
                      <div>
                        <p className="text-lg font-bold text-indigo-700">
                          {school.ks5_dest_russell_group}%
                        </p>
                        <p className="text-xs text-indigo-600">Russell Group</p>
                      </div>
                    )}
                    {school.ks5_dest_top_third != null && (
                      <div>
                        <p className="text-lg font-bold text-indigo-600">
                          {school.ks5_dest_top_third}%
                        </p>
                        <p className="text-xs text-indigo-600">Top Third</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs text-gray-400">
                % of leavers in sustained destinations (DfE destination measures).
              </p>
            </div>
          )}

          {/* Pupil Demographics */}
          {(school.fsm_percent != null || hasEthnicity) && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Pupil Demographics
              </h2>

              {school.fsm_percent != null && (
                <div className="mb-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-medium text-gray-500">
                      Free School Meals
                    </p>
                    <span className="text-sm font-semibold text-gray-900">
                      {school.fsm_percent}%
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-orange-400"
                      style={{ width: `${Math.min(school.fsm_percent, 100)}%` }}
                      title={`${school.fsm_percent}% eligible for FSM`}
                    />
                  </div>
                </div>
              )}

              {hasEthnicity && (() => {
                const items = [
                  { label: "White", value: school.ethnicity_white, color: "bg-sky-400" },
                  { label: "Mixed", value: school.ethnicity_mixed, color: "bg-violet-400" },
                  { label: "Asian", value: school.ethnicity_asian, color: "bg-amber-400" },
                  { label: "Black", value: school.ethnicity_black, color: "bg-emerald-500" },
                  { label: "Other", value: school.ethnicity_other, color: "bg-gray-400" },
                ].filter((d) => d.value != null && d.value > 0);
                const total = items.reduce((sum, d) => sum + (d.value ?? 0), 0);

                return (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-500">
                      Ethnicity
                    </p>
                    <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100">
                      {items.map((d) => (
                        <div
                          key={d.label}
                          className={`${d.color} h-full`}
                          style={{ width: `${((d.value ?? 0) / Math.max(total, 1)) * 100}%` }}
                          title={`${d.label}: ${d.value}%`}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                      {items.map((d) => (
                        <span key={d.label} className="flex items-center gap-1">
                          <span className={`inline-block h-2 w-2 rounded-full ${d.color}`} />
                          {d.label} {d.value}%
                        </span>
                      ))}
                    </div>

                    {ethnicityBreakdowns.map((bd) => {
                      const detail = bd.items.filter(
                        (d) => d.value != null && d.value > 0,
                      );
                      if (detail.length === 0) return null;
                      const groupTotal = bd.groupTotal ?? 1;
                      return (
                        <div key={bd.group} className="mt-3">
                          <p className="mb-1 text-xs font-medium text-gray-400">
                            {bd.group} breakdown
                          </p>
                          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-gray-100">
                            {detail.map((d) => (
                              <div
                                key={d.label}
                                className={`${d.color} h-full`}
                                style={{
                                  width: `${((d.value ?? 0) / Math.max(groupTotal, 1)) * 100}%`,
                                }}
                                title={`${d.label}: ${d.value}%`}
                              />
                            ))}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            {detail.map((d) => (
                              <span
                                key={d.label}
                                className="flex items-center gap-1"
                              >
                                <span
                                  className={`inline-block h-2 w-2 rounded-full ${d.color}`}
                                />
                                {d.label} {d.value}%
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Map */}
        <div>
          {school.latitude != null && school.longitude != null && (
            <div className="h-64 overflow-hidden rounded-lg border border-gray-200">
              <SchoolMap
                center={[school.latitude, school.longitude]}
                zoom={latestCatchment ? 14 : 15}
                schools={[school]}
                catchmentRadiusMiles={
                  latestCatchment?.last_distance_offered ?? undefined
                }
                homeLocation={home ? { lat: home.latitude, lng: home.longitude, postcode: home.postcode } : undefined}
              />
            </div>
          )}
          {latestCatchment?.last_distance_offered != null && (
            <p className="mt-1 text-xs text-gray-400">
              Dashed circle = {latestCatchment.last_distance_offered.toFixed(2)} mi
              catchment ({latestCatchment.year})
            </p>
          )}
        </div>
      </div>

      {/* Nearby schools */}
      {nearby.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Nearby Schools
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {nearby.map((s) => (
              <SchoolCard key={s.urn} school={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
