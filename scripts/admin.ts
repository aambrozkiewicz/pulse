import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createInterface } from "node:readline/promises";
const db = new PrismaClient();
const rl = createInterface({ input: process.stdin, output: process.stdout });
try {
  const email = (
    process.env.ADMIN_EMAIL || (await rl.question("E-mail administratora: "))
  )
    .trim()
    .toLowerCase();
  const password =
    process.env.ADMIN_PASSWORD ||
    (await rl.question("Hasło (widoczne w terminalu; min. 12 znaków): "));
  if (
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    password.length < 12 ||
    password.length > 128
  )
    throw new Error("Nieprawidłowy e-mail lub hasło (12–128 znaków).");
  const user = await db.user.upsert({
    where: { email },
    create: { email, passwordHash: await hash(password, 12) },
    update: { passwordHash: await hash(password, 12) },
  });
  await db.authSession.deleteMany({ where: { userId: user.id } });
  console.log("Konto zapisane. Poprzednie sesje unieważniono.");
} finally {
  rl.close();
  await db.$disconnect();
}
