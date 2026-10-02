'use client';

import { useTransition, type SelectHTMLAttributes } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function FilterSelect({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
 return <div className="relative min-w-28 max-w-full">
  <select {...props} className="h-11 w-full cursor-pointer appearance-none truncate rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:border-[#1664d8] focus-visible:ring-2 focus-visible:ring-[#1664d8]/15 disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none md:max-w-60">
   {children}
  </select>
  <svg aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 16 16" fill="none">
   <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
 </div>;
}

type SiteOption = {key: string; name: string};
export default function DashboardFilters({sites, siteKey, days}: {sites: SiteOption[]; siteKey: string; days: number}) {
 const router = useRouter();
 const searchParams = useSearchParams();
 const [pending, startTransition] = useTransition();
 function apply(name: string, value: string) {
  const params = new URLSearchParams(searchParams.toString());
  params.set('site', siteKey);
  params.set('days', String(days));
  params.set(name, value);
  startTransition(() => router.replace(`/dashboard?${params.toString()}`, {scroll: false}));
 }
 return <div className="flex shrink-0 flex-wrap items-center gap-3" aria-busy={pending}>
  <FilterSelect name="site" aria-label="Strona" value={siteKey} disabled={pending} onChange={event => apply('site', event.target.value)}>
   {sites.map(site => <option key={site.key} value={site.key}>{site.name}</option>)}
  </FilterSelect>
  <FilterSelect name="days" aria-label="Zakres czasu" value={days} disabled={pending} onChange={event => apply('days', event.target.value)}>
   <option value="7">7 dni</option><option value="30">30 dni</option><option value="90">90 dni</option>
  </FilterSelect>
  <span className="sr-only" role="status">{pending ? 'Aktualizowanie danych…' : ''}</span>
 </div>;
}
