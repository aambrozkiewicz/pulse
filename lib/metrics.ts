export function metricPeriods(days: number, now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  return { start, end, previousStart };
}

export function metricChange(current: number, previous: number, percentagePoints = false) {
  const difference = current - previous;
  const direction = difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  if (!percentagePoints && previous === 0 && current > 0)
    return { direction, label: "Nowy ruch" };
  const change = percentagePoints ? difference : previous ? difference / previous * 100 : 0;
  const magnitude = Math.abs(change).toLocaleString("pl-PL", { maximumFractionDigits: 1 });
  const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
  const label = change !== 0 && Math.abs(change) < 0.1
    ? `${sign}<0,1`
    : `${sign}${magnitude}`;
  return { direction, label: `${label}${percentagePoints ? " p.p." : "%"}` };
}
