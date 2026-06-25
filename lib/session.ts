/**
 * Session validation — no argon2 dependency.
 * Safe to import in Next.js middleware (nodejs runtime).
 */

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import type {
  InstitutionType,
  Role,
  Session,
  TeacherOrStudent,
  UniversityType,
} from "@prisma/client";

export const AUTH_COOKIE_NAME = "sip_session";

const SESSION_DURATION_MS = 30 * 60 * 1000;

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  teacherOrStudent: TeacherOrStudent;
  division: string;
  district: string;
  upazila: string;
  specificAddress: string | null;
  institutionType: InstitutionType | null;
  universityType: UniversityType | null;
  institutionName: string | null;
  department: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionData {
  session: Session;
  user: SafeUser;
}

const USER_SELECT = {
  id: true,
  name: true,
  encryptedEmail: true,
  emailIV: true,
  emailTag: true,
  emailVerified: true,
  role: true,
  teacherOrStudent: true,
  division: true,
  district: true,
  upazila: true,
  specificAddress: true,
  institutionType: true,
  universityType: true,
  institutionName: true,
  department: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toSafeUser(row: {
  id: string;
  name: string;
  encryptedEmail: string;
  emailIV: string;
  emailTag: string;
  emailVerified: boolean;
  role: Role;
  teacherOrStudent: TeacherOrStudent;
  division: string;
  district: string;
  upazila: string;
  specificAddress: string | null;
  institutionType: InstitutionType | null;
  universityType: UniversityType | null;
  institutionName: string | null;
  department: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: row.id,
    name: row.name,
    email: decrypt(row.encryptedEmail, row.emailIV, row.emailTag),
    emailVerified: row.emailVerified,
    role: row.role,
    teacherOrStudent: row.teacherOrStudent,
    division: row.division,
    district: row.district,
    upazila: row.upazila,
    specificAddress: row.specificAddress,
    institutionType: row.institutionType,
    universityType: row.universityType,
    institutionName: row.institutionName,
    department: row.department,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function extractSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const pattern = new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`);
  const match = cookieHeader.match(pattern);
  return match ? decodeURIComponent(match[1]!) : null;
}

export async function validateSession(token: string): Promise<SessionData | null> {
  const row = await db.session.findUnique({
    where: { token },
    include: { user: { select: USER_SELECT } },
  });

  if (!row) return null;

  if (row.expiresAt < new Date()) {
    await db.session.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }

  const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
  await db.session
    .update({ where: { id: row.id }, data: { expiresAt: newExpiry } })
    .catch(() => undefined);

  return {
    session: { ...row, expiresAt: newExpiry },
    user: toSafeUser(row.user),
  };
}

export async function getSession(headers: Headers): Promise<SessionData | null> {
  const token = extractSessionToken(headers.get("cookie"));
  if (!token) return null;
  return validateSession(token);
}

export const auth = {
  api: {
    getSession: ({ headers }: { headers: Headers }) => getSession(headers),
  },
} as const;
