/**
 * Provision (create or repair) named accounts with a specific role.
 *
 * Credentials are NEVER stored in the repository. They are read from a
 * git-ignored JSON file (default: ./accounts.local.json) shaped like:
 *
 *   [
 *     { "email": "owner@example.com", "password": "…", "role": "SUPERADMIN", "name": "Super Admin" },
 *     { "email": "staff@example.com", "password": "…", "role": "ADMIN" },
 *     { "email": "user@example.com",  "password": "…", "role": "USER" }
 *   ]
 *
 * Run against the target database (same ENCRYPTION_KEY / HASH_PEPPER as the app):
 *   npm run accounts:provision                 # uses ./accounts.local.json
 *   npm run accounts:provision -- path/to.json
 *
 * Behaviour per account:
 *   - missing  → created, email marked verified
 *   - existing → role and password set to the given values, email marked verified
 * Encrypted profile data of existing accounts is left untouched.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import argon2 from "argon2";
import { PrismaClient, Role } from "@prisma/client";
import { encrypt, hashForLookup } from "../lib/encryption";
import { validatePasswordStrength } from "../lib/validators";

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

interface AccountSpec {
  email: string;
  password: string;
  role: Role;
  name?: string;
}

const ROLES = new Set<string>(Object.values(Role));

function loadSpecs(file: string): AccountSpec[] {
  const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${file} must contain a JSON array`);
  return raw.map((entry, i) => {
    const e = entry as Partial<AccountSpec>;
    const email = String(e.email ?? "").trim().toLowerCase();
    const password = String(e.password ?? "");
    const role = String(e.role ?? "").toUpperCase();
    if (!email.includes("@")) throw new Error(`Entry ${i}: invalid email`);
    if (!ROLES.has(role)) throw new Error(`Entry ${i} (${email}): role must be one of ${[...ROLES].join(", ")}`);
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw new Error(`Entry ${i} (${email}): weak password — ${strength.errors.join("; ")}`);
    }
    return { email, password, role: role as Role, name: e.name?.trim() || undefined };
  });
}

function defaultName(role: Role): string {
  switch (role) {
    case "SUPERADMIN": return "Super Admin";
    case "ADMIN":      return "Administrator";
    case "MODERATOR":  return "Moderator";
    default:           return "Platform User";
  }
}

async function main() {
  const file = resolve(process.argv[2] ?? "accounts.local.json");
  const specs = loadSpecs(file);
  const db = new PrismaClient();

  try {
    for (const spec of specs) {
      const emailHash = hashForLookup(spec.email);
      const hashedPassword = await argon2.hash(spec.password, ARGON2_OPTS);
      const now = new Date();

      const existing = await db.user.findUnique({
        where: { emailHash },
        select: { id: true, role: true },
      });

      if (existing) {
        await db.user.update({
          where: { id: existing.id },
          data: { role: spec.role, hashedPassword, emailVerified: true, emailVerifiedAt: now },
        });
        // Force re-login with the new credentials/role.
        await db.session.deleteMany({ where: { userId: existing.id } });
        console.log(`  updated  ${spec.role.padEnd(10)} ${spec.email} (was ${existing.role})`);
        continue;
      }

      const encEmail = encrypt(spec.email);
      const encPhone = encrypt("+00000000000");
      const isStaff = spec.role !== "USER";

      await db.user.create({
        data: {
          name: spec.name ?? defaultName(spec.role),
          encryptedEmail: encEmail.ciphertext,
          emailIV: encEmail.iv,
          emailTag: encEmail.tag,
          emailHash,
          encryptedPhone: encPhone.ciphertext,
          phoneIV: encPhone.iv,
          phoneTag: encPhone.tag,
          hashedPassword,
          role: spec.role,
          teacherOrStudent: "TEACHER",
          division: "N/A",
          district: "N/A",
          upazila: "N/A",
          institutionType: "UNIVERSITY",
          universityType: "PUBLIC",
          institutionName: isStaff ? "Platform Administration" : "Not specified",
          department: isStaff ? "Administration" : null,
          emailVerified: true,
          emailVerifiedAt: now,
        },
      });
      console.log(`  created  ${spec.role.padEnd(10)} ${spec.email}`);
    }
    console.log("\nDone.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Provisioning failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
