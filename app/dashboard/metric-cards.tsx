import { metricChange } from "@/lib/metrics";

type Metric = {
  name: string;
  current: number;
  previous: number;
  icon: string;
  percentagePoints?: boolean;
};
const icons = {
  visitors:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  sessions: "m13 2-3 8H4l7 12 3-8h6L13 2Z",
  views: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z",
  conversion: "m8 12 3 3 5-6",
};

export default function MetricCards({
  metrics,
  days,
  previousPeriod,
  timeZoneLabel = "UTC",
}: {
  metrics: Metric[];
  days: number;
  previousPeriod: string;
  timeZoneLabel?: string;
}) {
  function format(value: number, rate = false) {
    return (
      value.toLocaleString("pl-PL", {
        minimumFractionDigits: rate ? 1 : 0,
        maximumFractionDigits: rate ? 1 : 0,
      }) + (rate ? "%" : "")
    );
  }
  return (
    <section aria-label="Podsumowanie ruchu" className="mb-6">
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const change = metricChange(
            metric.current,
            metric.previous,
            metric.percentagePoints,
          );
          const color =
            change.direction === "up"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
              : change.direction === "down"
                ? "bg-rose-50 text-rose-700 ring-rose-600/10"
                : "bg-slate-100 text-slate-600 ring-slate-500/10";
          return (
            <article
              key={metric.name}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_-4px_rgba(15,23,42,0.12)] hover:-translate-y-1 hover:shadow-xl transition-all duration-400"
            >
              <div className="p-5 pb-5 xl:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium text-slate-500">
                    {metric.name}
                  </h2>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1664d8]/[0.07] text-[#1664d8]">
                    <svg
                      aria-hidden="true"
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={icons[metric.icon as keyof typeof icons]} />
                      {metric.icon === "visitors" && (
                        <circle cx="9" cy="7" r="4" />
                      )}
                      {metric.icon === "views" && (
                        <circle cx="12" cy="12" r="3" />
                      )}
                      {metric.icon === "conversion" && (
                        <circle cx="12" cy="12" r="9" />
                      )}
                    </svg>
                  </span>
                </div>
                <p className="mt-5 break-words text-[clamp(1.75rem,3vw,2.5rem)] leading-none font-semibold tracking-tight text-slate-900 tabular-nums">
                  {format(metric.current, metric.percentagePoints)}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ring-1 ring-inset ${color}`}
                  >
                    <span className="sr-only">
                      {change.direction === "up"
                        ? "Wzrost:"
                        : change.direction === "down"
                          ? "Spadek:"
                          : "Bez zmian:"}{" "}
                    </span>
                    <svg
                      aria-hidden="true"
                      width="13"
                      height="13"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path
                        d={
                          change.direction === "up"
                            ? "M4 11 11 4M4 4h7v7"
                            : change.direction === "down"
                              ? "m4 4 7 7M4 11h7V4"
                              : "M3 8h10"
                        }
                      />
                    </svg>
                    {change.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    vs poprzedni okres
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs xl:px-6">
                <span className="text-slate-500">Poprzedni okres · {days} {days === 1 ? "dzień" : "dni"}</span>
                <span className="font-medium text-slate-700 tabular-nums">
                  {format(metric.previous, metric.percentagePoints)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Porównanie z okresem {previousPeriod} · {timeZoneLabel}
      </p>
    </section>
  );
}
