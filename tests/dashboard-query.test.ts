import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma, PrismaClient } from "@prisma/client";
import { dashboardScope, type DetailFilters } from "../lib/dashboard-query";
import { dashboardRange } from "../lib/dashboard-range";

const empty: DetailFilters = { domain: "", source: "", path: "", event: "" };

test("detail filter input is parameterized, including hostile source/path/event values", () => {
  const hostile = "x' OR 1=1 --";
  const scope = dashboardScope("site", new Date("2026-10-01"), new Date("2026-10-02"), { domain: hostile, source: hostile, path: hostile, event: hostile });
  assert.equal(scope.text.includes(hostile), false);
  assert.equal(scope.values.filter(value => value === hostile).length, 4);
});

test("SQL filters intersect sessions, retain conversions and isolate domain, site and period", { skip: !process.env.PULSE_TEST_DATABASE_URL }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.PULSE_TEST_DATABASE_URL! } } });
  try {
    await db.$transaction(async tx => {
      // A temporary table shadows Event without touching application data.
      await tx.$executeRaw`CREATE TEMP TABLE "Event" (id text, "siteId" text, "sessionId" text, "visitorId" text, name text, path text, domain text, "utmSource" text, referrer text, "createdAt" timestamptz) ON COMMIT DROP`;
      const records = [
        ["a1", "one", "a", "v1", "page_view", "/pricing", "one.com", "Google", "2026-03-28T23:30:00Z"],
        ["a2", "one", "a", "v1", "cta", "/pricing", "one.com", "Google", "2026-03-29T01:00:00Z"],
        ["a3", "one", "a", "v1", "conversion", "/thanks", "one.com", "Different", "2026-03-29T02:00:00Z"],
        ["b1", "one", "b", "v2", "page_view", "/pricing", "one.com", "Google", "2026-03-29T03:00:00Z"],
        ["b2", "one", "b", "v2", "conversion", "/thanks", "one.com", "Google", "2026-03-29T04:00:00Z"],
        ["c1", "one", "c", "v3", "page_view", "/other", "one.com", "Google", "2026-03-29T03:00:00Z"],
        ["c2", "one", "c", "v3", "cta", "/other", "one.com", "Google", "2026-03-29T04:00:00Z"],
        ["d1", "one", "d", "v4", "page_view", "/pricing", "two.com", "Google", "2026-03-29T03:00:00Z"],
        ["d2", "one", "d", "v4", "cta", "/pricing", "two.com", "Google", "2026-03-29T04:00:00Z"],
        ["x1", "other", "a", "v1", "conversion", "/thanks", "one.com", "Google", "2026-03-29T03:00:00Z"],
        ["old", "one", "a", "v1", "conversion", "/thanks", "one.com", "Google", "2026-03-28T20:00:00Z"],
        ["end", "one", "a", "v1", "conversion", "/thanks", "one.com", "Google", "2026-03-29T22:00:00Z"],
        ["unknown", "one", "u", "v5", "page_view", "/", null, null, "2026-03-29T12:00:00Z"],
      ];
      for (const [id, site, session, visitor, name, path, domain, source, at] of records) {
        await tx.$executeRaw`INSERT INTO "Event" VALUES (${id}, ${site}, ${session}, ${visitor}, ${name}, ${path}, ${domain}, ${source}, NULL, ${new Date(at!)})`;
      }
      const range = dashboardRange({ range: "custom", from: "2026-03-29", to: "2026-03-29", tz: "Europe/Warsaw" }, new Date("2026-10-05"));
      const scope = dashboardScope("one", range.start, range.end, { domain: "one.com", source: "Google", path: "/pricing", event: "cta" });
      const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`${scope} SELECT id FROM filtered ORDER BY id`);
      assert.deepEqual(rows.map(row => row.id), ["a1", "a2", "a3"]);
      const sourceRows = await tx.$queryRaw<{ source: string; count: bigint }[]>(Prisma.sql`${scope} SELECT source, COUNT(DISTINCT filtered."sessionId") AS count FROM filtered JOIN session_sources USING ("sessionId") GROUP BY source`);
      assert.deepEqual(sourceRows, [{ source: "Google", count: 1n }]);
      const daily = await tx.$queryRaw<{ label: string; count: bigint }[]>(Prisma.sql`${scope} SELECT TO_CHAR("createdAt" AT TIME ZONE ${range.timeZone}, 'YYYY-MM-DD') AS label, COUNT(*) AS count FROM filtered WHERE name='page_view' GROUP BY 1`);
      assert.deepEqual(daily, [{ label: "2026-03-29", count: 1n }]);
      const unknownScope = dashboardScope("one", range.start, range.end, { ...empty, domain: "__unknown__" });
      assert.deepEqual(await tx.$queryRaw(Prisma.sql`${unknownScope} SELECT id FROM filtered`), [{ id: "unknown" }]);
      const previousScope = dashboardScope("one", range.previousStart, range.start, { ...empty, domain: "one.com", event: "cta" });
      assert.deepEqual(await tx.$queryRaw(Prisma.sql`${previousScope} SELECT id FROM filtered`), []);
      const noResults = dashboardScope("one", range.start, range.end, { ...empty, source: "Absent" });
      assert.deepEqual(await tx.$queryRaw(Prisma.sql`${noResults} SELECT COUNT(*) AS count FROM filtered`), [{ count: 0n }]);
    });
  } finally { await db.$disconnect(); }
});
