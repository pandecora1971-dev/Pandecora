/**
 * Seed 15 realistic test users.
 * Run:  npx tsx scripts/seed-users.ts
 *
 * Uses the project's own encrypt/hashForLookup so encoding matches exactly.
 */

import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { encrypt, hashForLookup } from "../lib/encryption";

const db = new PrismaClient();

const ARGON_OPTS: argon2.Options = {
  type:        argon2.argon2id,
  memoryCost:  65536,
  timeCost:    3,
  parallelism: 4,
};

const PASSWORD = "Test@1234!";

const MODERATOR = {
  name:             "Test Moderator",
  email:            "moderator@test.bd",
  phone:            "01711999000",
  teacherOrStudent: "TEACHER" as const,
  division:         "Dhaka",
  district:         "Dhaka",
  upazila:          "Dhanmondi",
  specificAddress:  null,
  institutionType:  "UNIVERSITY" as const,
  universityType:   "PUBLIC" as const,
  institutionName:  "Platform Administration",
  department:       "Moderation",
};

const USERS = [
  {
    name: "Arif Hossain",
    email: "arif.hossain@test.bd",
    phone: "01711000001",
    teacherOrStudent: "STUDENT" as const,
    division: "Dhaka",      district: "Dhaka",         upazila: "Dhanmondi",
    specificAddress: "Road 7, House 12, Dhanmondi",
    institutionType: "UNIVERSITY" as const,  universityType: "PUBLIC" as const,
    institutionName: "University of Dhaka",
    department: "Computer Science and Engineering",
  },
  {
    name: "Nusrat Jahan",
    email: "nusrat.jahan@test.bd",
    phone: "01811000002",
    teacherOrStudent: "STUDENT" as const,
    division: "Dhaka",      district: "Narayanganj",   upazila: "Narayanganj Sadar",
    specificAddress: null,
    institutionType: "UNIVERSITY" as const,  universityType: "PRIVATE" as const,
    institutionName: "North South University",
    department: "Business Administration",
  },
  {
    name: "Md. Rakibul Islam",
    email: "rakib.islam@test.bd",
    phone: "01911000003",
    teacherOrStudent: "TEACHER" as const,
    division: "Chittagong",  district: "Chittagong",    upazila: "Pahartali",
    specificAddress: "Block B, Flat 3A, Agrabad",
    institutionType: "UNIVERSITY" as const,  universityType: "PUBLIC" as const,
    institutionName: "University of Chittagong",
    department: "Economics",
  },
  {
    name: "Fatema Akter",
    email: "fatema.akter@test.bd",
    phone: "01611000004",
    teacherOrStudent: "STUDENT" as const,
    division: "Rajshahi",   district: "Rajshahi",      upazila: "Boalia",
    specificAddress: null,
    institutionType: "UNIVERSITY" as const,  universityType: "PUBLIC" as const,
    institutionName: "University of Rajshahi",
    department: "Physics",
  },
  {
    name: "Tanvir Ahmed",
    email: "tanvir.ahmed@test.bd",
    phone: "01511000005",
    teacherOrStudent: "STUDENT" as const,
    division: "Dhaka",      district: "Gazipur",       upazila: "Gazipur Sadar",
    specificAddress: "Tongi Industrial Area, Road 3",
    institutionType: "UNIVERSITY" as const,  universityType: "PUBLIC" as const,
    institutionName: "Bangladesh University of Engineering and Technology (BUET)",
    department: "Electrical and Electronic Engineering",
  },
  {
    name: "Sadia Rahman",
    email: "sadia.rahman@test.bd",
    phone: "01711000006",
    teacherOrStudent: "TEACHER" as const,
    division: "Sylhet",     district: "Sylhet",        upazila: "Sylhet Sadar",
    specificAddress: "Zindabazar, Sylhet",
    institutionType: "UNIVERSITY" as const,  universityType: "PUBLIC" as const,
    institutionName: "Shahjalal University of Science and Technology",
    department: "Chemistry",
  },
  {
    name: "Imran Khan",
    email: "imran.khan@test.bd",
    phone: "01811000007",
    teacherOrStudent: "STUDENT" as const,
    division: "Khulna",     district: "Khulna",        upazila: "Khulna Sadar",
    specificAddress: null,
    institutionType: "UNIVERSITY" as const,  universityType: "PRIVATE" as const,
    institutionName: "BRAC University",
    department: "Architecture",
  },
  {
    name: "Riya Begum",
    email: "riya.begum@test.bd",
    phone: "01911000008",
    teacherOrStudent: "STUDENT" as const,
    division: "Dhaka",      district: "Munshiganj",    upazila: "Munshiganj Sadar",
    specificAddress: null,
    institutionType: "COLLEGE" as const,     universityType: undefined,
    institutionName: "Dhaka College",
    department: "Science",
  },
  {
    name: "Saiful Haque",
    email: "saiful.haque@test.bd",
    phone: "01611000009",
    teacherOrStudent: "TEACHER" as const,
    division: "Dhaka",      district: "Dhaka",         upazila: "Mirpur",
    specificAddress: "Section 10, Block C, Mirpur",
    institutionType: "SCHOOL" as const,      universityType: undefined,
    institutionName: "Government Laboratory High School",
    department: "Mathematics",
  },
  {
    name: "Meherun Nessa",
    email: "meherun.nessa@test.bd",
    phone: "01511000010",
    teacherOrStudent: "STUDENT" as const,
    division: "Barishal",   district: "Barishal",      upazila: "Barishal Sadar",
    specificAddress: "Sadar Road, Barishal",
    institutionType: "COLLEGE" as const,     universityType: undefined,
    institutionName: "Barishal Government College",
    department: "Humanities",
  },
  {
    name: "Kamal Uddin",
    email: "kamal.uddin@test.bd",
    phone: "01711000011",
    teacherOrStudent: "TEACHER" as const,
    division: "Mymensingh", district: "Mymensingh",    upazila: "Mymensingh Sadar",
    specificAddress: null,
    institutionType: "UNIVERSITY" as const,  universityType: "PUBLIC" as const,
    institutionName: "Bangladesh Agricultural University",
    department: "Agriculture",
  },
  {
    name: "Sharmin Akter",
    email: "sharmin.akter@test.bd",
    phone: "01811000012",
    teacherOrStudent: "STUDENT" as const,
    division: "Rangpur",    district: "Rangpur",       upazila: "Rangpur Sadar",
    specificAddress: "Shapla Chottor, Rangpur",
    institutionType: "UNIVERSITY" as const,  universityType: "PUBLIC" as const,
    institutionName: "Begum Rokeya University",
    department: "Sociology",
  },
  {
    name: "Nur Mohammad",
    email: "nur.mohammad@test.bd",
    phone: "01911000013",
    teacherOrStudent: "STUDENT" as const,
    division: "Dhaka",      district: "Dhaka",         upazila: "Lalbagh",
    specificAddress: "Old Dhaka, Nazimuddin Road",
    institutionType: "MADRASA" as const,     universityType: undefined,
    institutionName: "Darul Ulum Madrasa Dhaka",
    department: null,
  },
  {
    name: "Priya Das",
    email: "priya.das@test.bd",
    phone: "01611000014",
    teacherOrStudent: "STUDENT" as const,
    division: "Chittagong",  district: "Cox's Bazar",  upazila: "Cox's Bazar Sadar",
    specificAddress: "Marine Drive Road",
    institutionType: "UNIVERSITY" as const,  universityType: "PRIVATE" as const,
    institutionName: "Daffodil International University",
    department: "Software Engineering",
  },
  {
    name: "Abdullah Al Mamun",
    email: "mamun.al@test.bd",
    phone: "01511000015",
    teacherOrStudent: "TEACHER" as const,
    division: "Dhaka",      district: "Dhaka",         upazila: "Uttara",
    specificAddress: "Sector 7, Uttara Model Town",
    institutionType: "UNIVERSITY" as const,  universityType: "PRIVATE" as const,
    institutionName: "American International University Bangladesh (AIUB)",
    department: "Computer Science",
  },
];

async function main() {
  console.log(`\nSeeding ${USERS.length} test users + 1 moderator…\n`);

  // Delete any previously seeded test accounts (emails end in @test.bd)
  const allEmails = [...USERS, MODERATOR].map((u) => hashForLookup(u.email));
  const deleted = await db.user.deleteMany({
    where: { emailHash: { in: allEmails } },
  });
  if (deleted.count > 0) {
    console.log(`  Removed ${deleted.count} stale test account(s) before re-seeding.\n`);
  }

  const hashedPassword = await argon2.hash(PASSWORD, ARGON_OPTS);
  const verifiedAt = new Date();
  let created = 0;

  // ── Test users (role: USER) ────────────────────────────────────────────────
  for (const u of USERS) {
    const emailHash = hashForLookup(u.email);
    const encEmail  = encrypt(u.email);
    const encPhone  = encrypt(u.phone);

    await db.user.create({
      data: {
        name:             u.name,
        encryptedEmail:   encEmail.ciphertext,
        emailIV:          encEmail.iv,
        emailTag:         encEmail.tag,
        emailHash,
        encryptedPhone:   encPhone.ciphertext,
        phoneIV:          encPhone.iv,
        phoneTag:         encPhone.tag,
        hashedPassword,
        role:             "USER",
        teacherOrStudent: u.teacherOrStudent,
        division:         u.division,
        district:         u.district,
        upazila:          u.upazila,
        specificAddress:  u.specificAddress ?? null,
        institutionType:  u.institutionType,
        universityType:   u.universityType ?? null,
        institutionName:  u.institutionName,
        department:       u.department ?? null,
        emailVerified:    true,
        emailVerifiedAt:  verifiedAt,
      },
    });

    console.log(`  ✓  USER       ${u.name.padEnd(22)} ${u.email}`);
    created++;
  }

  // ── Test moderator (role: MODERATOR) ──────────────────────────────────────
  {
    const m = MODERATOR;
    const emailHash = hashForLookup(m.email);
    const encEmail  = encrypt(m.email);
    const encPhone  = encrypt(m.phone);

    await db.user.create({
      data: {
        name:             m.name,
        encryptedEmail:   encEmail.ciphertext,
        emailIV:          encEmail.iv,
        emailTag:         encEmail.tag,
        emailHash,
        encryptedPhone:   encPhone.ciphertext,
        phoneIV:          encPhone.iv,
        phoneTag:         encPhone.tag,
        hashedPassword,
        role:             "MODERATOR",
        teacherOrStudent: m.teacherOrStudent,
        division:         m.division,
        district:         m.district,
        upazila:          m.upazila,
        specificAddress:  m.specificAddress ?? null,
        institutionType:  m.institutionType,
        universityType:   m.universityType ?? null,
        institutionName:  m.institutionName,
        department:       m.department ?? null,
        emailVerified:    true,
        emailVerifiedAt:  verifiedAt,
      },
    });

    console.log(`  ✓  MODERATOR  ${m.name.padEnd(22)} ${m.email}`);
    created++;
  }

  console.log(`\nDone. Created ${created} accounts.`);
  console.log(`Password for all: ${PASSWORD}\n`);
  console.log("Test accounts:");
  console.log(`  USER:      arif.hossain@test.bd  (password: ${PASSWORD})`);
  console.log(`  MODERATOR: moderator@test.bd      (password: ${PASSWORD})`);
  console.log(`  ADMIN:     run 'npm run seed' for the admin account\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
