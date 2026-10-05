// Wildcards match subdomains only; protocol and port must still match.
export function isOriginPattern(value: string): boolean {
 try {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) return false;
  if (!value.includes('*')) return true;
  return url.hostname.startsWith('*.') &&
   !url.hostname.slice(2).includes('*') &&
   /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(url.hostname.slice(2));
 } catch { return false; }
}

export function allowedOrigin(origin: string, patterns: string[]): boolean {
 if (!isOriginPattern(origin) || origin.includes('*')) return false;
 const actual = new URL(origin);
 return patterns.some(pattern => {
  if (!isOriginPattern(pattern)) return false;
  if (!pattern.includes('*')) return pattern === origin;
  const allowed = new URL(pattern);
  return actual.protocol === allowed.protocol && actual.port === allowed.port &&
   actual.hostname.endsWith(allowed.hostname.slice(1)) &&
   actual.hostname.length > allowed.hostname.length - 1;
 });
}
