import { db } from "@/lib/db";
import { eventSchema, cleanReferrer } from "@/lib/event";
import { limit } from "@/lib/auth";
import { allowedOrigin } from "@/lib/origins";
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return new Response(null, { status: 403 });
  const raw = await req.text();
  if (raw.length > 8192) return new Response(null, { status: 413 });
  let parsed;
  try {
    parsed = eventSchema.safeParse(JSON.parse(raw));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!parsed.success) return new Response(null, { status: 400 });
  const { site, ...data } = parsed.data;
  const target = await db.site.findUnique({ where: { key: site } });
  if (!target || !allowedOrigin(origin, target.origins))
    return new Response(null, { status: 403 });
  const headers = { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
  if (
    !(await limit("events:" + target.id, 3000, 60)) ||
    !(await limit("visitor:" + target.id + data.visitorId, 120, 60))
  )
    return new Response(null, { status: 429, headers });
  await db.event.createMany({
    data: [
      {
        ...data,
        siteId: target.id,
        domain: new URL(origin).hostname,
        referrer: cleanReferrer(data.referrer),
      },
    ],
    skipDuplicates: true,
  });
  return new Response(null, { status: 204, headers });
}
