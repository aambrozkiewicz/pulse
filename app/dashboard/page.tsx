import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import DashboardFilters from "./filters";
import DashboardHeader from "./dashboard-header";
import TrafficChart from "./traffic-chart";
import MetricCards from "./metric-cards";
import { dashboardRange, formatDateRange } from "@/lib/dashboard-range";
import { dashboardScope } from "@/lib/dashboard-query";
import { detailKeys, updateDashboardParams, type DetailKey } from "@/lib/dashboard-url";
import { unknownDomain } from "@/lib/domain-filter";
export const dynamic = "force-dynamic";
type Row = { label: string; count: bigint };
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const rawParams = await searchParams;
  const params = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const range = dashboardRange(params);
  const { start, end, previousStart, days, timeZone } = range;
  const timeZoneLabel = timeZone === "Europe/Warsaw" ? "Czas polski (Warszawa)" : "UTC";
  const periodLabel = formatDateRange(range.from, range.to);
  const sites = await db.site.findMany({ orderBy: { name: "asc" } });
  const site = sites.find((s) => s.key === params.site) || sites[0];
  if (!site)
    return (
      <main className="mx-auto w-full max-w-[1180px] p-5 md:p-8">
        <DashboardHeader email={user.email} />
        <section className="mx-auto my-8 max-w-[720px] rounded-2xl border border-slate-200 border-t-4 border-t-sky-400 bg-white p-7 md:my-12 md:p-12 [&_p]:max-w-[540px] [&_a]:my-3">
          <small className="text-xs leading-relaxed text-slate-500">
            TWÓJ PIERWSZY KROK
          </small>
          <h1 className="my-3 text-3xl font-bold tracking-tight text-slate-900 md:text-[38px]">
            Dodaj swoją pierwszą stronę
          </h1>
          <p className="my-3 leading-relaxed text-slate-500">
            Nie masz jeszcze żadnych stron w Pulse. Dodaj stronę, którą chcesz
            monitorować, a potem umieść na niej tracker według gotowej
            instrukcji.
          </p>
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-transparent px-5 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none disabled:cursor-wait disabled:opacity-65 bg-[#1664d8] text-white hover:bg-[#1664d8]/90"
            href="/dashboard/sites/new"
          >
            Dodaj stronę
          </Link>
          <p className="my-3 text-sm leading-relaxed text-slate-500">
            Po podłączeniu strony pojawią się tu odwiedzający, odsłony i
            zdarzenia.
          </p>
        </section>
      </main>
    );
  const storedDomains = await db.$queryRaw<{ domain: string | null }[]>(
    Prisma.sql`SELECT DISTINCT "domain" FROM "Event" WHERE "siteId"=${site.id} ORDER BY "domain" ASC`,
  );
  const domains = storedDomains.map(({ domain }) => ({
    value: domain ?? unknownDomain,
    label: domain ?? "Brak danych o domenie",
  }));
  const domain = params.domain ?? "";
  if (domain && !domains.some((item) => item.value === domain))
    domains.push({
      value: domain,
      label: domain === unknownDomain ? "Brak danych o domenie" : domain,
    });
  const details = { domain, source: params.source ?? "", path: params.path ?? "", event: params.event ?? "" };
  const queryParams = new URLSearchParams({ site: site.key, range: range.kind, tz: timeZone });
  if (range.kind === "custom") { queryParams.set("from", range.from); queryParams.set("to", range.to); }
  for (const key of detailKeys) if (details[key]) queryParams.set(key, details[key]);
  const query = queryParams.toString();
  const detailLink = (changes: Record<string, string>) => `/dashboard?${updateDashboardParams(query, changes)}`;
  const activeDetails = detailKeys.filter(key => details[key]);
  const detailNames = { domain: "Domena", source: "Źródło", path: "Strona", event: "Zdarzenie" };
  let domainRows: {
    domain: string | null;
    visitors: bigint;
    views: bigint;
    leads: bigint;
  }[] = [];
  let totals = {
      visitors: 0n,
      sessions: 0n,
      views: 0n,
      leads: 0n,
      converted: 0n,
    },
    sources: Row[] = [],
    pages: Row[] = [],
    events: Row[] = [],
    daily: Row[] = [];
  let previousTotals = { ...totals };
  if (site) {
    const scope = dashboardScope(site.id, start, end, details);
    const previousScope = dashboardScope(site.id, previousStart, start, details);
    const [summary, previousSummary, s, p, e, d, hosts] = await Promise.all([
      db.$queryRaw<(typeof totals)[]>(
        Prisma.sql`${scope} SELECT COUNT(DISTINCT "visitorId") AS visitors,COUNT(DISTINCT "sessionId") AS sessions,COUNT(*) FILTER(WHERE name='page_view') AS views,COUNT(*) FILTER(WHERE name=${site.conversionEvent}) AS leads,COUNT(DISTINCT "visitorId") FILTER(WHERE name=${site.conversionEvent}) AS converted FROM filtered`,
      ),
      db.$queryRaw<(typeof totals)[]>(
        Prisma.sql`${previousScope} SELECT COUNT(DISTINCT "visitorId") AS visitors,COUNT(DISTINCT "sessionId") AS sessions,COUNT(*) FILTER(WHERE name='page_view') AS views,COUNT(*) FILTER(WHERE name=${site.conversionEvent}) AS leads,COUNT(DISTINCT "visitorId") FILTER(WHERE name=${site.conversionEvent}) AS converted FROM filtered`,
      ),
      db.$queryRaw<Row[]>(
        Prisma.sql`${scope} SELECT source AS label,COUNT(DISTINCT filtered."sessionId") AS count FROM filtered JOIN session_sources USING ("sessionId") GROUP BY source ORDER BY count DESC, source ASC LIMIT 10`,
      ),
      db.$queryRaw<Row[]>(
        Prisma.sql`${scope} SELECT path AS label,COUNT(*) AS count FROM filtered WHERE name='page_view' GROUP BY path ORDER BY count DESC LIMIT 10`,
      ),
      db.$queryRaw<Row[]>(
        Prisma.sql`${scope} SELECT name AS label,COUNT(DISTINCT "visitorId") AS count FROM filtered GROUP BY name ORDER BY count DESC`,
      ),
      db.$queryRaw<Row[]>(
        Prisma.sql`${scope} SELECT TO_CHAR("createdAt" AT TIME ZONE ${timeZone},'YYYY-MM-DD') AS label,COUNT(*) AS count FROM filtered WHERE name='page_view' GROUP BY 1 ORDER BY 1`,
      ),
      db.$queryRaw<typeof domainRows>(
        Prisma.sql`${scope} SELECT "domain",COUNT(DISTINCT "visitorId") AS visitors,COUNT(*) FILTER(WHERE name='page_view') AS views,COUNT(*) FILTER(WHERE name=${site.conversionEvent}) AS leads FROM filtered GROUP BY "domain" ORDER BY views DESC, "domain" ASC`,
      ),
    ]);
    totals = summary[0];
    previousTotals = previousSummary[0];
    sources = s;
    pages = p;
    events = e;
    daily = d;
    domainRows = hosts;
  }
  const dailyCounts = new Map(daily.map(row => [row.label, Number(row.count)]));
  const series = range.labels.map(label => ({ label, count: dailyCounts.get(label) ?? 0 }));
  function table(title: string, rows: Row[], unit: string, key: DetailKey, denominator: bigint, shareLabel: string) {
    return (
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mb-2 text-xs leading-relaxed text-slate-500">{unit} · {shareLabel}</p>
        {rows.length ? rows.map(row => {
          const share = denominator ? Number(row.count) / Number(denominator) * 100 : 0;
          return <Link key={row.label} href={detailLink({ [key]: row.label })} scroll={false} prefetch={false}
            className="group block rounded-lg border-b border-slate-100 px-2 py-3 transition-colors last:border-0 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#1664d8]">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 break-words text-sm text-slate-700 group-hover:text-[#1664d8] [overflow-wrap:anywhere]">{row.label}</span>
              <span className="flex shrink-0 items-baseline gap-3 tabular-nums"><strong className="text-sm text-slate-900">{Number(row.count).toLocaleString("pl")}</strong><span className="w-14 text-right text-xs text-slate-500">{share.toLocaleString("pl", { maximumFractionDigits: 1 })}%</span></span>
            </div>
            <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1664d8]/50" style={{ width: `${Math.min(100, share)}%` }} /></div>
            <span className="sr-only">Filtruj sesje: {detailNames[key]} — {row.label}</span>
          </Link>;
        }) : <p className="my-3 leading-relaxed text-slate-500">Brak danych w tym okresie.</p>}
      </section>
    );
  }
  return (
    <main className="mx-auto w-full max-w-[1180px] p-5 md:p-8">
      <DashboardHeader email={user.email} />
      <div className="flex flex-col items-start justify-between gap-2 py-8 md:flex-row md:items-end">
        <div>
          <small className="text-xs leading-relaxed text-slate-500">
            OVERVIEW
          </small>
          <div className="flex flex-col gap-x-6 gap-y-2">
            <h1 className="min-w-0 break-words text-3xl font-bold tracking-tight text-slate-900 md:text-[38px]">
              {site?.name || "Twoje strony"}
            </h1>

            <nav
              className="flex flex-wrap items-center gap-3"
              aria-label="Ustawienia wybranej strony"
            >
              <Link
                className="inline-flex items-center justify-center rounded-lg border border-transparent px-5 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none disabled:cursor-wait disabled:opacity-65 bg-[#1664d8]/5 text-[#1664d8] hover:border-[#1664d8]/25 hover:bg-[#1664d8]/10"
                href={`/dashboard/sites/${site.id}/edit`}
              >
                Edytuj stronę
              </Link>
              <Link
                className="text-[#1664d8] underline underline-offset-4 hover:text-[#1664d8]/80"
                href={`/dashboard/docs?site=${site.key}`}
              >
                Instrukcja integracji
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <DashboardFilters
        key={`${site.key}-${range.kind}-${timeZone}-${range.from}-${range.to}`}
        sites={sites.map(({ key, name }) => ({ key, name }))}
        siteKey={site.key} domains={domains} domain={domain}
        range={range.kind} timeZone={timeZone} from={range.from} to={range.to} today={range.today} query={query}
      />
      {range.error && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{range.error} Wyświetlono ostatnie 30 dni.</p>}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
        <span className="font-medium text-slate-700">{periodLabel}</span><span>· {timeZoneLabel}</span>
        {range.to === range.today && <span className="text-xs">· Bieżący dzień jest niepełny.</span>}
      </div>
      {!!activeDetails.length && <section aria-label="Aktywne filtry" className="mb-5 rounded-xl border border-[#1664d8]/15 bg-[#1664d8]/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-slate-500">Aktywne filtry</span>
          {activeDetails.map(key => <Link key={key} href={detailLink({ [key]: "" })} scroll={false} prefetch={false} aria-label={`Usuń filtr ${detailNames[key]}: ${details[key]}`}
            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#1664d8]/15 bg-white px-3 py-2 text-xs font-medium text-[#1664d8] hover:bg-slate-50">
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{detailNames[key]}: {key === "domain" && details[key] === unknownDomain ? "Brak danych o domenie" : details[key]}</span><span aria-hidden="true">×</span>
          </Link>)}
          <Link href={detailLink(Object.fromEntries(detailKeys.map(key => [key, ""])))} scroll={false} prefetch={false} className="px-2 py-2 text-xs text-[#1664d8] underline underline-offset-4">Wyczyść filtry</Link>
        </div>
        {(details.source || details.path || details.event) && <p className="mt-2 text-xs leading-relaxed text-slate-500">Wszystkie dane dotyczą sesji spełniających wybrane warunki w tym okresie. Filtry strony i zdarzenia obejmują również pozostałe zdarzenia tych sesji.</p>}
      </section>}
      <MetricCards
        days={days}
        previousPeriod={formatDateRange(range.previousFrom, range.previousTo)}
        timeZoneLabel={timeZoneLabel}
        metrics={[
          {
            name: "Odwiedzający",
            current: Number(totals.visitors),
            previous: Number(previousTotals.visitors),
            icon: "visitors",
          },
          {
            name: "Sesje",
            current: Number(totals.sessions),
            previous: Number(previousTotals.sessions),
            icon: "sessions",
          },
          {
            name: "Odsłony",
            current: Number(totals.views),
            previous: Number(previousTotals.views),
            icon: "views",
          },
          {
            name: "Konwersja",
            current: totals.visitors
              ? (Number(totals.converted) / Number(totals.visitors)) * 100
              : 0,
            previous: previousTotals.visitors
              ? (Number(previousTotals.converted) /
                  Number(previousTotals.visitors)) *
                100
              : 0,
            icon: "conversion",
            percentagePoints: true,
          },
        ]}
      />
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Ruch w czasie
        </h2>
        <p className="my-3 leading-relaxed text-slate-500">
          Odsłony dziennie · {timeZoneLabel} · {periodLabel}
        </p>
        <TrafficChart key={query} series={series} />
      </section>
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Domeny</h2>
        {domainRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th scope="col" className="py-3 pr-4">
                    Domena
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Odwiedzający
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Odsłony
                  </th>
                  <th scope="col" className="pl-3 py-3 text-right">
                    Konwersje
                  </th>
                </tr>
              </thead>
              <tbody>
                {domainRows.map((row) => (
                  <tr
                    key={row.domain ?? unknownDomain}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <th
                      scope="row"
                      className="py-4 pr-4 font-normal [overflow-wrap:anywhere]"
                    >
                      <Link
                        className="text-[#1664d8] underline underline-offset-4"
                        href={detailLink({ domain: row.domain ?? unknownDomain })}
                        scroll={false} prefetch={false}
                      >
                        {row.domain ?? "Brak danych o domenie"}
                      </Link>
                      <div className="mt-2 flex items-center gap-2">
                        <div aria-hidden="true" className="h-1 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1664d8]/50" style={{ width: `${totals.views ? Number(row.views) / Number(totals.views) * 100 : 0}%` }} /></div>
                        <span className="text-xs text-slate-500">{(totals.views ? Number(row.views) / Number(totals.views) * 100 : 0).toLocaleString("pl", { maximumFractionDigits: 1 })}% odsłon</span>
                      </div>
                    </th>
                    <td className="px-3 py-4 text-right tabular-nums">
                      {Number(row.visitors).toLocaleString("pl")}
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums">
                      {Number(row.views).toLocaleString("pl")}
                    </td>
                    <td className="pl-3 py-4 text-right tabular-nums">
                      {Number(row.leads).toLocaleString("pl")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="my-3 leading-relaxed text-slate-500">
            Brak danych w tym okresie.
          </p>
        )}
      </section>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {table("Źródła ruchu", sources, "Sesje wg źródła", "source", totals.sessions, "udział sesji")}
        {table("Najczęściej odwiedzane", pages, "Odsłony", "path", totals.views, "udział odsłon")}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {table(
          "Zdarzenia",
          events.slice(0, 20),
          "Unikalni odwiedzający na zdarzenie", "event", totals.visitors,
          "udział odwiedzających; udziały mogą się nakładać",
        )}
        {!!site?.funnelSteps.length && (
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Kroki na stronie
            </h2>
            <small className="text-xs leading-relaxed text-slate-500">
              Odwiedzający wykonujący każdy krok; kolejność nie jest
              weryfikowana.
            </small>
            {(site?.funnelSteps || []).map((name) => (
              <div
                className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0 [&>span]:min-w-0 [&>span]:break-words [&>strong]:shrink-0 [&>strong]:tabular-nums"
                key={name}
              >
                <Link href={detailLink({ event: name })} scroll={false} prefetch={false} className="min-w-0 break-words text-[#1664d8] underline underline-offset-4">{name}</Link>
                <strong>
                  {Number(events.find((e) => e.label === name)?.count || 0)}
                </strong>
              </div>
            ))}
            <p className="my-3 leading-relaxed text-slate-500">
              Konwersja:{" "}
              <code className="font-mono text-[0.9em] text-[#1664d8]">
                {site?.conversionEvent}
              </code>{" "}
              · Wysłane zdarzenia: {Number(totals.leads)}
            </p>
          </section>
        )}
      </div>
      <footer className="py-2 text-xs text-slate-500 text-center">
        Pulse · First-party analytics · {periodLabel} · {timeZoneLabel} · Dane pozostają w Twojej
        bazie
      </footer>
    </main>
  );
}
