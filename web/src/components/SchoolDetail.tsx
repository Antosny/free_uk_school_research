import Link from "next/link";
import { School, ratingBgClass } from "@/lib/api";

/**
 * Renders full school detail info (reusable in both the dedicated page and map sidebar).
 * Does NOT include: nearby schools, map embed, or back-to-map button.
 */
export default function SchoolDetail({ school }: { school: School }) {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link
          href={`/school/${school.urn}`}
          className="text-xl font-bold text-gray-900 hover:text-green-700 hover:underline"
        >
          {school.name}
        </Link>
        <p className="mt-1 text-sm text-gray-500">
          {[school.phase, school.type].filter(Boolean).join(" · ")}
        </p>
        {school.postcode && (
          <p className="text-xs text-gray-400">{school.postcode}</p>
        )}
      </div>

      {/* Ofsted */}
      <div className="rounded-lg border border-gray-200 p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Ofsted Rating
        </h2>
        {school.ofsted_rating ? (
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-2.5 py-0.5 text-xs font-semibold ${ratingBgClass(school.ofsted_rating)}`}
            >
              {school.ofsted_rating}
            </span>
            {school.ofsted_date && (
              <span className="text-xs text-gray-400">
                Inspected {school.ofsted_date}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No rating available</p>
        )}
      </div>

      {/* School Info */}
      <div className="rounded-lg border border-gray-200 p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          School Info
        </h2>
        <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
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

      {/* Catchment */}
      {school.catchment && school.catchment.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Catchment — Last Distance Offered
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-1.5 font-medium">Year</th>
                <th className="pb-1.5 font-medium">Distance</th>
                <th className="pb-1.5 font-medium">Offers</th>
                <th className="pb-1.5 font-medium">Apps</th>
                <th className="pb-1.5 font-medium"></th>
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
                    <td className="py-1 text-gray-900">
                      {entry.year}/{(entry.year + 1).toString().slice(-2)}
                    </td>
                    <td className="py-1 text-gray-900">
                      {entry.last_distance_offered != null
                        ? `${entry.last_distance_offered.toFixed(2)} mi`
                        : "—"}
                    </td>
                    <td className="py-1 text-gray-600">
                      {entry.offers_made ?? "—"}
                    </td>
                    <td className="py-1 text-gray-600">
                      {entry.applications ?? "—"}
                    </td>
                    <td className="py-1 text-right">
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
          <p className="mt-1.5 text-[10px] text-gray-400">
            Furthest distance from which a place was offered on National
            Offers Day. ▲ = easier, ▼ = harder.
          </p>
        </div>
      )}

      {/* Exam Results */}
      {(isPrimary
        ? school.ks2_reading != null || school.ks2_maths != null
        : school.ks4_attainment8 != null ||
          school.ks4_progress8 != null) && (
        <div className="rounded-lg border border-gray-200 p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {isPrimary ? "KS2 Results" : "KS4 Results"}
          </h2>
          <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
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
                    <dd className="text-gray-900">{school.ks4_attainment8}</dd>
                  </>
                )}
                {school.ks4_progress8 != null && (
                  <>
                    <dt className="text-gray-500">Progress 8</dt>
                    <dd className="text-gray-900">{school.ks4_progress8}</dd>
                  </>
                )}
              </>
            )}
          </dl>
        </div>
      )}

      {/* Student Destinations */}
      {hasDestinations && (
        <div className="rounded-lg border border-gray-200 p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                <p className="mb-1 text-[10px] font-medium text-gray-500">
                  After Year 11 (KS4)
                </p>
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
                  {items.map((d) => (
                    <div
                      key={d.label}
                      className={`${d.color} h-full`}
                      style={{ width: `${((d.value ?? 0) / Math.max(total, 1)) * 100}%` }}
                      title={`${d.label}: ${d.value}%`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-600">
                  {items.map((d) => (
                    <span key={d.label} className="flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${d.color}`} />
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
                <p className="mb-1 text-[10px] font-medium text-gray-500">
                  After Year 13 (16-18)
                </p>
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
                  {items.map((d) => (
                    <div
                      key={d.label}
                      className={`${d.color} h-full`}
                      style={{ width: `${((d.value ?? 0) / Math.max(total, 1)) * 100}%` }}
                      title={`${d.label}: ${d.value}%`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-600">
                  {items.map((d) => (
                    <span key={d.label} className="flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${d.color}`} />
                      {d.label} {d.value}%
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {hasKs5HeDest && (
            <div className="mt-2 rounded-md bg-indigo-50 p-2.5">
              <p className="mb-1.5 text-[10px] font-medium text-indigo-700">
                Higher Education Breakdown (16-18 leavers)
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {school.ks5_dest_oxbridge != null && (
                  <div>
                    <p className="text-base font-bold text-indigo-800">
                      {school.ks5_dest_oxbridge}%
                    </p>
                    <p className="text-[10px] text-indigo-600">Oxbridge</p>
                  </div>
                )}
                {school.ks5_dest_russell_group != null && (
                  <div>
                    <p className="text-base font-bold text-indigo-700">
                      {school.ks5_dest_russell_group}%
                    </p>
                    <p className="text-[10px] text-indigo-600">Russell Group</p>
                  </div>
                )}
                {school.ks5_dest_top_third != null && (
                  <div>
                    <p className="text-base font-bold text-indigo-600">
                      {school.ks5_dest_top_third}%
                    </p>
                    <p className="text-[10px] text-indigo-600">Top Third</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="mt-1.5 text-[10px] text-gray-400">
            % of leavers in sustained destinations (DfE destination measures).
          </p>
        </div>
      )}

      {/* Pupil Demographics */}
      {(school.fsm_percent != null || hasEthnicity) && (
        <div className="rounded-lg border border-gray-200 p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Pupil Demographics
          </h2>

          {school.fsm_percent != null && (
            <div className="mb-3">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-medium text-gray-500">
                  Free School Meals
                </p>
                <span className="text-xs font-semibold text-gray-900">
                  {school.fsm_percent}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
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
                <p className="mb-1 text-[10px] font-medium text-gray-500">
                  Ethnicity
                </p>
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
                  {items.map((d) => (
                    <div
                      key={d.label}
                      className={`${d.color} h-full`}
                      style={{ width: `${((d.value ?? 0) / Math.max(total, 1)) * 100}%` }}
                      title={`${d.label}: ${d.value}%`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-600">
                  {items.map((d) => (
                    <span key={d.label} className="flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${d.color}`} />
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
                    <div key={bd.group} className="mt-2">
                      <p className="mb-0.5 text-[10px] font-medium text-gray-400">
                        {bd.group} breakdown
                      </p>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
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
                      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500">
                        {detail.map((d) => (
                          <span
                            key={d.label}
                            className="flex items-center gap-1"
                          >
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${d.color}`}
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
  );
}
