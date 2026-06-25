/**
 * Deletes users whose email cannot be decrypted (broken seed data).
 * Run:  npx tsx scripts/cleanup-broken-users.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../lib/encryption";

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true, encryptedEmail: true, emailIV: true, emailTag: true },
  });

  const broken: string[] = [];
  for (const u of users) {
    try {
      decrypt(u.encryptedEmail, u.emailIV, u.emailTag);
    } catch {
      console.log(`  broken: ${u.name} (${u.id.slice(0, 8)})`);
      broken.push(u.id);
    }
  }

  if (broken.length === 0) {
    console.log("No broken users found.");
    return;
  }

  const { count } = await db.user.deleteMany({ where: { id: { in: broken } } });
  console.log(`\nDeleted ${count} broken user(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
