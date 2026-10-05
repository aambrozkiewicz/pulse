import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    days: { type: "string", default: "180" },
    sessions: { type: "string", default: "12000" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`Dane do testowania dashboardu:
  npm run demo -- [--days 180] [--sessions 12000] [--dry-run]

Tworzy stronę „Demo — sklep internetowy” (klucz: pulse-demo).
Kolejne uruchomienia dodają dane. Nie zmienia innych stron.
--days: 1–365, --sessions: 1–100000. --dry-run: bez zapisu do bazy.`);
  process.exit(0);
}

const days = Number(values.days);
const sessions = Number(values.sessions);
if (!Number.isInteger(days) || days < 1 || days > 365 ||
    !Number.isInteger(sessions) || sessions < 1 || sessions > 100000) {
  console.error("Nieprawidłowe parametry. Dni: 1–365, sesje: 1–100000.");
  process.exit(1);
}

const siteKey = "pulse-demo";
const origin = "https://demo.pulse.invalid";
const paths = ["/", "/produkty", "/produkty/kawa", "/produkty/herbata", "/o-nas", "/blog", "/blog/jak-parzyc-kawe", "/kontakt"];
const sources = [
  {}, {}, {},
  { referrer: "google.com" }, { referrer: "google.com" },
  { referrer: "bing.com" },
  { referrer: "instagram.com", utmSource: "instagram", utmMedium: "social", utmCampaign: "jesienna-kolekcja" },
  { utmSource: "newsletter", utmMedium: "email", utmCampaign: "nowosci" },
  { referrer: "facebook.com", utmSource: "facebook", utmMedium: "cpc", utmCampaign: "promocja" },
  { referrer: "youtube.com" },
];
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const visitors = Array.from({ length: Math.max(1, Math.floor(sessions * 0.65)) }, () => randomUUID());
const now = Date.now();
const start = new Date(now);
start.setUTCHours(0, 0, 0, 0);
start.setUTCDate(start.getUTCDate() - days + 1);
const span = now - start.getTime();
let totalEvents = 0;
let conversions = 0;
const db = new PrismaClient();

try {
  let siteId = "dry-run";
  if (!values["dry-run"]) {
    const site = await db.site.upsert({
      where: { key: siteKey },
      update: {},
      create: {
        key: siteKey,
        name: "Demo — sklep internetowy",
        origins: [origin],
        conversionEvent: "purchase",
        funnelSteps: ["page_view", "product_view", "add_to_cart", "checkout_started", "purchase"],
      },
    });
    if (site.origins.length !== 1 || site.origins[0] !== origin || site.conversionEvent !== "purchase")
      throw new Error("Klucz pulse-demo jest zajęty przez inną konfigurację strony.");
    siteId = site.id;
  }

  let batch: Prisma.EventCreateManyInput[] = [];
  for (let i = 0; i < sessions; i++) {
    const sessionId = randomUUID();
    const visitorId = pick(visitors);
    const attribution = pick(sources);
    // Więcej ruchu w nowszych dniach, z naturalnymi wahaniami.
    const sessionStart = start.getTime() + span * Math.sqrt(Math.random());
    let offset = 0;
    const add = (name: string, path: string) => {
      batch.push({
        id: randomUUID(), siteId, visitorId, sessionId, name, path,
        ...attribution,
        properties: { demo: true },
        createdAt: new Date(Math.min(now, sessionStart + offset)),
      });
      offset += 5000 + Math.floor(Math.random() * 55000);
      totalEvents++;
    };
    add("page_view", pick(["/", "/", "/produkty", "/blog", "/produkty/kawa"]));
    const pageCount = Math.floor(Math.random() * 5);
    for (let page = 0; page < pageCount; page++) add("page_view", pick(paths));
    if (Math.random() < 0.65) {
      add("product_view", "/produkty/kawa");
      if (Math.random() < 0.42) {
        add("add_to_cart", "/produkty/kawa");
        if (Math.random() < 0.65) {
          add("page_view", "/koszyk");
          add("checkout_started", "/zamowienie");
          if (Math.random() < 0.65) {
            add("purchase", "/dziekujemy");
            conversions++;
          }
        }
      }
    }
    if (Math.random() < 0.12) add("newsletter_signup", "/blog");
    if (batch.length >= 1000) {
      if (!values["dry-run"]) await db.event.createMany({ data: batch });
      batch = [];
    }
  }
  if (batch.length && !values["dry-run"]) await db.event.createMany({ data: batch });
  console.log(`${values["dry-run"] ? "Podgląd" : "Zapisano"}: ${totalEvents.toLocaleString("pl-PL")} zdarzeń, ${sessions.toLocaleString("pl-PL")} sesji, ${conversions.toLocaleString("pl-PL")} zakupów z ${days} dni.`);
  if (!values["dry-run"]) console.log("Otwórz /dashboard?site=pulse-demo&days=30 (po zalogowaniu).");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Nie udało się wygenerować danych demo.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
