import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboardRange, customRangeError, formatDateRange } from "../lib/dashboard-range";
import { updateDashboardParams } from "../lib/dashboard-url";

const now = new Date("2026-10-05T22:30:00Z");

test("today, yesterday and month use the selected time zone, not the server zone", () => {
  assert.equal(dashboardRange({ range: "today" }, now).from, "2026-10-05");
  const today = dashboardRange({ range: "today", tz: "Europe/Warsaw" }, now);
  assert.equal(today.from, "2026-10-06");
  assert.equal(today.start.toISOString(), "2026-10-05T22:00:00.000Z");
  assert.equal(today.end.toISOString(), "2026-10-06T22:00:00.000Z");
  assert.equal(today.days, 1);
  assert.deepEqual(today.labels, ["2026-10-06"]);
  assert.equal(dashboardRange({ range: "yesterday", tz: "Europe/Warsaw" }, now).from, "2026-10-05");
  const month = dashboardRange({ range: "month", tz: "Europe/Warsaw" }, now);
  assert.equal(month.from, "2026-10-01");
  assert.equal(month.to, "2026-10-06");
  assert.equal(month.days, 6);
});

test("legacy 7/30/90 day links still resolve with adjacent comparison periods", () => {
  for (const days of [7, 30, 90]) {
    const range = dashboardRange({ days: String(days) }, now);
    assert.equal(range.days, days);
    assert.equal(range.end.getTime() - range.start.getTime(), days * 86400000);
    assert.equal(range.start.getTime() - range.previousStart.getTime(), days * 86400000);
    assert.equal(range.labels.length, days);
  }
  assert.equal(dashboardRange({ days: "999999", tz: "invalid" }, now).timeZone, "UTC");
  assert.equal(dashboardRange({ range: "invalid" }, now).days, 30);
});

test("Warsaw spring and autumn DST days have 23 and 25 hours with no missing calendar dates", () => {
  for (const [day, hours] of [["2026-03-29", 23], ["2026-10-25", 25]] as const) {
    const range = dashboardRange({ range: "custom", from: day, to: day, tz: "Europe/Warsaw" }, new Date("2026-12-01T00:00:00Z"));
    assert.equal((range.end.getTime() - range.start.getTime()) / 3600000, hours);
    assert.equal(range.days, 1);
    assert.deepEqual(range.labels, [day]);
    assert.equal(range.start.getTime() - range.previousStart.getTime(), 86400000);
  }
  const range = dashboardRange({ range: "custom", from: "2026-03-28", to: "2026-03-30", tz: "Europe/Warsaw" }, now);
  assert.deepEqual(range.labels, ["2026-03-28", "2026-03-29", "2026-03-30"]);
  assert.equal(range.end.getTime() - range.start.getTime(), 71 * 3600000);
  assert.equal(range.previousFrom, "2026-03-25");
  assert.equal(range.previousTo, "2026-03-27");
});

test("custom ranges include both dates and validate leap days, ordering, future dates and size", () => {
  assert.equal(customRangeError("2024-02-29", "2024-02-29", "2026-10-05"), undefined);
  for (const [from, to] of [["2026-02-29", "2026-03-01"], ["garbage", "2026-03-01"], ["2026-10-05", "2026-10-01"], ["2026-10-01", "2026-10-06"], ["2024-01-01", "2026-10-05"]]) {
    assert.ok(customRangeError(from, to, "2026-10-05"));
    const range = dashboardRange({ range: "custom", from, to }, now);
    assert.equal(range.kind, "30");
    assert.ok(range.error);
  }
  const range = dashboardRange({ range: "custom", from: "2024-01-01", to: "2024-12-31" }, now);
  assert.equal(range.days, 366);
  assert.equal(range.previousTo, "2023-12-31");
  assert.equal(formatDateRange("2026-10-05", "2026-10-05"), "5.10.2026");
});

test("detail links retain range, timezone and other filters; site changes clear all details", () => {
  const query = "site=one&range=custom&from=2026-03-28&to=2026-03-30&tz=Europe%2FWarsaw&domain=example.com&source=Google";
  const link = updateDashboardParams(query, { path: "/pricing?a=b&c=d", event: "cta_clicked" });
  assert.equal(link.get("path"), "/pricing?a=b&c=d");
  assert.equal(link.get("source"), "Google");
  assert.equal(link.get("tz"), "Europe/Warsaw");
  assert.equal(link.get("from"), "2026-03-28");
  assert.equal(updateDashboardParams(link.toString(), { source: "" }).has("source"), false);
  const changed = updateDashboardParams(link.toString(), { site: "two" });
  for (const key of ["domain", "source", "path", "event"]) assert.equal(changed.has(key), false);
  assert.equal(changed.get("range"), "custom");
  assert.equal(changed.get("tz"), "Europe/Warsaw");
  const preset = updateDashboardParams(query, { range: "today" });
  for (const key of ["days", "from", "to"]) assert.equal(preset.has(key), false);
  assert.equal(preset.get("source"), "Google");
});
