import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const days = Number(process.env.RETENTION_DAYS || 365);
if (!Number.isInteger(days) || days < 1) throw Error("Invalid retention");
try {
  console.log(
    await db.event.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - days * 86400000) } },
    }),
  );
  await db.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
} finally {
  await db.$disconnect();
}
