export const detailKeys = ["domain", "source", "path", "event"] as const;
export type DetailKey = typeof detailKeys[number];

export function updateDashboardParams(current: string, changes: Record<string, string>) {
  const params = new URLSearchParams(current);
  if (changes.site !== undefined && changes.site !== params.get("site")) {
    for (const key of detailKeys) params.delete(key);
  }
  if (changes.range !== undefined) {
    for (const key of ["days", "from", "to"]) params.delete(key);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return params;
}
