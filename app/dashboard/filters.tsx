"use client";

import { useId, useState, useTransition, type SelectHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { customRangeError, type DashboardTimeZone, type RangeKind } from "@/lib/dashboard-range";
import { updateDashboardParams } from "@/lib/dashboard-url";

function FilterSelect({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-500">
    {label}
    <div className="relative">
      <select {...props} id={id} className="h-11 w-full cursor-pointer appearance-none truncate rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-[#1664d8]/20 disabled:cursor-wait disabled:opacity-65">
        {children}
      </select>
      <svg aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  </label>;
}

type Props = {
  sites: { key: string; name: string }[];
  siteKey: string;
  domains: { value: string; label: string }[];
  domain: string;
  range: RangeKind;
  timeZone: DashboardTimeZone;
  from: string;
  to: string;
  today: string;
  query: string;
};

export default function DashboardFilters({ sites, siteKey, domains, domain, range, timeZone, from, to, today, query }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [error, setError] = useState<string>();
  const errorId = useId();
  function apply(changes: Record<string, string>) {
    const params = updateDashboardParams(query, changes);
    startTransition(() => router.push(`/dashboard?${params.toString()}`, { scroll: false }));
  }
  return <section aria-label="Filtry dashboardu" aria-busy={pending} className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
    <div className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-2 lg:grid-cols-4">
      <FilterSelect label="Strona" name="site" value={siteKey} disabled={pending} onChange={event => apply({ site: event.target.value })}>
        {sites.map(site => <option key={site.key} value={site.key}>{site.name}</option>)}
      </FilterSelect>
      <FilterSelect label="Zakres czasu" name="range" value={range} disabled={pending} onChange={event => apply(event.target.value === "custom" ? { range: "custom", from, to } : { range: event.target.value })}>
        <option value="today">Dzisiaj</option><option value="yesterday">Wczoraj</option><option value="7">7 dni</option><option value="30">30 dni</option><option value="90">90 dni</option><option value="month">Ten miesiąc</option><option value="custom">Własny zakres</option>
      </FilterSelect>
      <FilterSelect label="Strefa czasowa" name="tz" value={timeZone} disabled={pending} onChange={event => apply({ tz: event.target.value })}>
        <option value="UTC">UTC</option><option value="Europe/Warsaw">Czas polski (Warszawa)</option>
      </FilterSelect>
      <FilterSelect label="Domena" name="domain" value={domain} disabled={pending} onChange={event => apply({ domain: event.target.value })}>
        <option value="">Wszystkie domeny</option>
        {domains.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </FilterSelect>
    </div>
    {range === "custom" && <form className="mt-4 border-t border-slate-100 pt-4" onSubmit={event => {
      event.preventDefault();
      const message = customRangeError(draftFrom, draftTo, today);
      setError(message);
      if (!message) apply({ range: "custom", from: draftFrom, to: draftTo });
    }}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-500">Od
          <input type="date" name="from" required min="2000-01-01" max={today} value={draftFrom} disabled={pending} aria-describedby={error ? errorId : undefined} aria-invalid={!!error} onChange={event => { setDraftFrom(event.target.value); setError(undefined); }} className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus-visible:ring-2 focus-visible:ring-[#1664d8]/20" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-500">Do
          <input type="date" name="to" required min="2000-01-01" max={today} value={draftTo} disabled={pending} aria-describedby={error ? errorId : undefined} aria-invalid={!!error} onChange={event => { setDraftTo(event.target.value); setError(undefined); }} className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus-visible:ring-2 focus-visible:ring-[#1664d8]/20" />
        </label>
        <button disabled={pending} className="h-11 rounded-lg bg-[#1664d8] px-4 text-sm font-semibold text-white hover:bg-[#1664d8]/90 disabled:opacity-65">Zastosuj zakres</button>
        <span className="pb-3 text-xs text-slate-500">Do 366 dni, obie daty włącznie.</span>
      </div>
      {error && <p id={errorId} role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    </form>}
    <span className="sr-only" role="status">{pending ? "Aktualizowanie danych…" : ""}</span>
  </section>;
}
