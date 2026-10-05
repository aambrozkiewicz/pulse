import { test } from "node:test";
import assert from "node:assert/strict";
import { metricChange, metricPeriods } from "../lib/metrics";

test("comparison periods are adjacent, equal UTC calendar ranges across month boundaries", () => {
  for (const days of [7, 30, 90]) {
    const { start, end, previousStart } = metricPeriods(days, new Date("2026-03-01T23:59:00Z"));
    assert.equal(end.toISOString(), "2026-03-02T00:00:00.000Z");
    assert.equal(end.getTime() - start.getTime(), days * 86400000);
    assert.equal(start.getTime() - previousStart.getTime(), days * 86400000);
  }
});

test("metric comparisons distinguish growth, decline, no change and a zero baseline", () => {
  assert.deepEqual(metricChange(120, 100), { direction: "up", label: "+20%" });
  assert.deepEqual(metricChange(0, 100), { direction: "down", label: "−100%" });
  assert.deepEqual(metricChange(0, 0), { direction: "flat", label: "0%" });
  assert.deepEqual(metricChange(5, 0), { direction: "up", label: "Nowy ruch" });
  assert.deepEqual(metricChange(100, 100), { direction: "flat", label: "0%" });
  assert.deepEqual(metricChange(4.5, 3, true), { direction: "up", label: "+1,5 p.p." });
  assert.deepEqual(metricChange(3, 4.5, true), { direction: "down", label: "−1,5 p.p." });
  assert.deepEqual(metricChange(3, 0, true), { direction: "up", label: "+3 p.p." });
  assert.deepEqual(metricChange(3.01, 3, true), { direction: "up", label: "+<0,1 p.p." });
});
