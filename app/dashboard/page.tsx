import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import DashboardFilters from "./filters";
import DashboardHeader from "./dashboard-header";
import TrafficChart from "./traffic-chart";
import MetricCards from "./metric-cards";
import { metricPeriods } from "@/lib/metrics";
import { domainFilter, unknownDomain } from "@/lib/domain-filter";
export const dynamic = "force-dynamic";
type Row = { label: string; count: bigint };
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; days?: string; domain?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params.days))
    ? Number(params.days)
    : 30;
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
  const { start, end, previousStart } = metricPeriods(days);
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
  const domainClause = domainFilter(domain);
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
    const filter = Prisma.sql`"siteId"=${site.id} AND "createdAt">=${start} AND "createdAt"<${end} ${domainClause}`;
    const [summary, previousSummary, s, p, e, d, hosts] = await Promise.all([
      db.$queryRaw<(typeof totals)[]>(
        Prisma.sql`SELECT COUNT(DISTINCT "visitorId") AS visitors,COUNT(DISTINCT "sessionId") AS sessions,COUNT(*) FILTER(WHERE name='page_view') AS views,COUNT(*) FILTER(WHERE name=${site.conversionEvent}) AS leads,COUNT(DISTINCT "visitorId") FILTER(WHERE name=${site.conversionEvent}) AS converted FROM "Event" WHERE ${filter}`,
      ),
      db.$queryRaw<(typeof totals)[]>(
        Prisma.sql`SELECT COUNT(DISTINCT "visitorId") AS visitors,COUNT(DISTINCT "sessionId") AS sessions,COUNT(*) FILTER(WHERE name='page_view') AS views,COUNT(*) FILTER(WHERE name=${site.conversionEvent}) AS leads,COUNT(DISTINCT "visitorId") FILTER(WHERE name=${site.conversionEvent}) AS converted FROM "Event" WHERE "siteId"=${site.id} AND "createdAt">=${previousStart} AND "createdAt"<${start} ${domainClause}`,
      ),
      db.$queryRaw<Row[]>(
        Prisma.sql`SELECT COALESCE(NULLIF("utmSource",''),NULLIF(referrer,''),'Direct') AS label,COUNT(DISTINCT "sessionId") AS count FROM "Event" WHERE ${filter} GROUP BY 1 ORDER BY count DESC LIMIT 10`,
      ),
      db.$queryRaw<Row[]>(
        Prisma.sql`SELECT path AS label,COUNT(*) AS count FROM "Event" WHERE ${filter} AND name='page_view' GROUP BY path ORDER BY count DESC LIMIT 10`,
      ),
      db.$queryRaw<Row[]>(
        Prisma.sql`SELECT name AS label,COUNT(DISTINCT "visitorId") AS count FROM "Event" WHERE ${filter} GROUP BY name ORDER BY count DESC`,
      ),
      db.$queryRaw<Row[]>(
        Prisma.sql`SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC','YYYY-MM-DD') AS label,COUNT(*) AS count FROM "Event" WHERE ${filter} AND name='page_view' GROUP BY 1 ORDER BY 1`,
      ),
      db.$queryRaw<typeof domainRows>(
        Prisma.sql`SELECT "domain",COUNT(DISTINCT "visitorId") AS visitors,COUNT(*) FILTER(WHERE name='page_view') AS views,COUNT(*) FILTER(WHERE name=${site.conversionEvent}) AS leads FROM "Event" WHERE ${filter} GROUP BY "domain" ORDER BY views DESC, "domain" ASC`,
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
  const series = Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    const label = date.toISOString().slice(0, 10);
    return {
      label,
      count: Number(daily.find((d) => d.label === label)?.count || 0),
    };
  });
  function table(title: string, rows: Row[], unit: string) {
    return (
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
        <small className="text-xs leading-relaxed text-slate-500">{unit}</small>
        {rows.length ? (
          rows.map((r) => (
            <div
              className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0 [&>span]:min-w-0 [&>span]:break-words [&>strong]:shrink-0 [&>strong]:tabular-nums"
              key={r.label}
            >
              <span>{r.label}</span>
              <strong>{Number(r.count).toLocaleString("pl")}</strong>
            </div>
          ))
        ) : (
          <p className="my-3 leading-relaxed text-slate-500">
            Brak danych w tym okresie.
          </p>
        )}
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
        <DashboardFilters
          sites={sites.map(({ key, name }) => ({ key, name }))}
          siteKey={site.key}
          days={days}
          domains={domains}
          domain={domain}
        />
      </div>
      <MetricCards
        days={days}
        previousPeriod={`${previousStart.toLocaleDateString("pl-PL", { timeZone: "UTC" })} – ${new Date(start.getTime() - 1).toLocaleDateString("pl-PL", { timeZone: "UTC" })}`}
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
          Odsłony dziennie · UTC · {days} dni
        </p>
        <TrafficChart key={`${site.id}-${days}-${domain}`} series={series} />
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
                        href={`/dashboard?${new URLSearchParams({ site: site.key, days: String(days), domain: row.domain ?? unknownDomain })}`}
                      >
                        {row.domain ?? "Brak danych o domenie"}
                      </Link>
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
        {table("Źródła ruchu", sources, "Sesje wg źródła")}
        {table("Najczęściej odwiedzane", pages, "Odsłony")}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {table(
          "Zdarzenia",
          events.slice(0, 20),
          "Unikalni odwiedzający na zdarzenie",
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
                <span>{name}</span>
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
        Pulse · First-party analytics · {days} dni · Dane pozostają w Twojej
        bazie
      </footer>
    </main>
  );
}
