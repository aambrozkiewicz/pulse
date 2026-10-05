export type DashboardTimeZone = "UTC" | "Europe/Warsaw";
export type RangeKind = "7" | "30" | "90" | "today" | "yesterday" | "month" | "custom";
export const maxRangeDays = 366;
const dayMs = 86400000;

export function dateInZone(date: Date, timeZone: DashboardTimeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= "2000-01-01" && value <= "9999-12-31"
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function addCalendarDays(value: string, days: number) {
  return new Date(Date.parse(`${value}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);
}

// Find local midnight using the offset at that instant, including DST changes.
export function midnightInZone(value: string, timeZone: DashboardTimeZone) {
  const wallTime = Date.parse(`${value}T00:00:00Z`);
  let instant = wallTime;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => parts.find(item => item.type === type)!.value;
    const local = Date.parse(`${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`);
    instant = wallTime - (local - instant);
  }
  return new Date(instant);
}

export function customRangeError(from: string, to: string, today: string) {
  if (!validDate(from) || !validDate(to)) return "Wybierz poprawną datę początkową i końcową.";
  if (from > to) return "Data początkowa nie może być późniejsza niż końcowa.";
  if (to > today) return "Zakres nie może obejmować przyszłych dni.";
  if ((Date.parse(to) - Date.parse(from)) / dayMs + 1 > maxRangeDays)
    return `Wybierz zakres nie dłuższy niż ${maxRangeDays} dni.`;
  return undefined;
}

export function dashboardRange(params: { range?: string; days?: string; from?: string; to?: string; tz?: string }, now = new Date()) {
  const timeZone: DashboardTimeZone = params.tz === "Europe/Warsaw" ? "Europe/Warsaw" : "UTC";
  const today = dateInZone(now, timeZone);
  const requested = params.range ?? params.days ?? "30";
  let kind: RangeKind = (["7", "30", "90", "today", "yesterday", "month", "custom"].includes(requested) ? requested : "30") as RangeKind;
  let error: string | undefined;
  let to = kind === "yesterday" ? addCalendarDays(today, -1) : today;
  let from = to;
  if (kind === "custom") {
    error = customRangeError(params.from ?? "", params.to ?? "", today);
    if (error) kind = "30";
    else { from = params.from!; to = params.to!; }
  }
  if (kind === "month") from = `${today.slice(0, 7)}-01`;
  if (["7", "30", "90"].includes(kind)) from = addCalendarDays(to, 1 - Number(kind));
  const days = Math.round((Date.parse(to) - Date.parse(from)) / dayMs) + 1;
  const previousFrom = addCalendarDays(from, -days);
  const previousTo = addCalendarDays(from, -1);
  return {
    kind, timeZone, today, from, to, days, previousFrom, previousTo, error,
    start: midnightInZone(from, timeZone),
    end: midnightInZone(addCalendarDays(to, 1), timeZone),
    previousStart: midnightInZone(previousFrom, timeZone),
    labels: Array.from({ length: days }, (_, i) => addCalendarDays(from, i)),
  };
}

export function formatDateRange(from: string, to: string) {
  const format = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("pl-PL", { timeZone: "UTC" });
  return from === to ? format(from) : `${format(from)} – ${format(to)}`;
}
