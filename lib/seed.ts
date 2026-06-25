/**
 * Database seed — creates the initial ADMIN user.
 *
 * Usage:
 *   npm run seed
 *
 * Reads credentials from the .env file via dotenv.
 * Requires ENCRYPTION_KEY, HASH_PEPPER, ADMIN_EMAIL, and ADMIN_PASSWORD.
 */

import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient, Role, TeacherOrStudent, InstitutionType, UniversityType } from "@prisma/client";
import { encrypt, hashForLookup } from "./encryption";

const db = new PrismaClient();

// ─── Argon2id parameters (OWASP recommended minimums) ────────────────────────
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email) throw new Error("ADMIN_EMAIL is not set in environment");
  if (!password) throw new Error("ADMIN_PASSWORD is not set in environment");
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }

  console.log("Seeding database…");

  // ── Hash the password ───────────────────────────────────────────────────────
  console.log("  Hashing password with argon2id…");
  const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS);

  // ── Hash email for unique lookup ────────────────────────────────────────────
  const emailHash = hashForLookup(email);

  // ── Encrypt PII fields ──────────────────────────────────────────────────────
  const encEmail = encrypt(email);
  const encPhone = encrypt("+00000000000"); // placeholder — admin has no personal phone

  // ── Upsert admin user ───────────────────────────────────────────────────────
  const existing = await db.user.findUnique({ where: { emailHash }, select: { id: true, emailVerified: true } });

  if (existing) {
    if (!existing.emailVerified) {
      await db.user.update({
        where: { id: existing.id },
        data:  { emailVerified: true, emailVerifiedAt: new Date() },
      });
      console.log(`  Admin user already exists — marked as email-verified.`);
    } else {
      console.log(`  Admin user already exists (id: ${existing.id}). Skipping creation.`);
    }
    return;
  }

  const admin = await db.user.create({
    data: {
      name: "Platform Admin",

      // Encrypted email
      encryptedEmail: encEmail.ciphertext,
      emailIV:        encEmail.iv,
      emailTag:       encEmail.tag,
      emailHash,

      // Encrypted placeholder phone
      encryptedPhone: encPhone.ciphertext,
      phoneIV:        encPhone.iv,
      phoneTag:       encPhone.tag,

      hashedPassword,
      role:             Role.ADMIN,
      teacherOrStudent: TeacherOrStudent.TEACHER,

      // Location placeholders — admins are not required to provide real addresses
      division: "N/A",
      district: "N/A",
      upazila:  "N/A",
      specificAddress: null,

      // Institution placeholders
      institutionType: InstitutionType.UNIVERSITY,
      universityType:  UniversityType.PUBLIC,
      institutionName: "Platform Administration",
      department:      "Administration",

      emailVerified:   true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`  Admin user created:`);
  console.log(`    id:    ${admin.id}`);
  console.log(`    name:  ${admin.name}`);
  console.log(`    email: ${email}`);
  console.log(`    role:  ${admin.role}`);
  console.log("");
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
