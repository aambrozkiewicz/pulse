import { Prisma } from "@prisma/client";
import { domainFilter } from "./domain-filter";

export type DetailFilters = { domain: string; source: string; path: string; event: string };

// Each detail condition selects sessions independently, then intersects them.
// Retain all events in those sessions so conversion and funnel metrics stay useful.
export function dashboardScope(siteId: string, start: Date, end: Date, filters: DetailFilters) {
  const conditions: Prisma.Sql[] = [];
  if (filters.source) conditions.push(Prisma.sql`"sessionId" IN (SELECT "sessionId" FROM session_sources WHERE source=${filters.source})`);
  if (filters.path) conditions.push(Prisma.sql`"sessionId" IN (SELECT "sessionId" FROM scoped WHERE name='page_view' AND path=${filters.path})`);
  if (filters.event) conditions.push(Prisma.sql`"sessionId" IN (SELECT "sessionId" FROM scoped WHERE name=${filters.event})`);
  const details = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
  return Prisma.sql`WITH scoped AS (
    SELECT * FROM "Event" WHERE "siteId"=${siteId} AND "createdAt">=${start} AND "createdAt"<${end} ${domainFilter(filters.domain)}
  ), session_sources AS (
    SELECT DISTINCT ON ("sessionId") "sessionId", COALESCE(NULLIF("utmSource",''),NULLIF(referrer,''),'Direct') AS source
    FROM scoped ORDER BY "sessionId", "createdAt", id
  ), filtered AS (SELECT * FROM scoped ${details})`;
}
