"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { decrypt } from "@/lib/encryption";
import type { Prisma, InstitutionType } from "@prisma/client";

const PAGE_SIZE = 20;

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function getStaffSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await validateSession(token);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) return null;
  return session;
}

async function getAdminSession() {
  const session = await getStaffSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SubmissionRow {
  id:              string;
  shortId:         string;
  createdAt:       string; // ISO 8601 — serializable across server/client boundary
  category:        string;
  urgencyLevel:    string;
  status:          string;
  userName:        string;
  userRole:        string;
  institutionType: string | null;
  division:        string;
}

export interface SubmissionsFilter {
  category?:         string;
  urgencyLevel?:     string;
  status?:           string;
  dateFrom?:         string;
  dateTo?:           string;
  searchId?:         string;
  // submitter filters
  searchName?:       string;
  teacherOrStudent?: string;
  institutionType?:  string;
  division?:         string;
  district?:         string;
}

export type SortField = "createdAt" | "urgencyLevel" | "category";
export type SortDir   = "asc" | "desc";

export type GetSubmissionsResult =
  | { success: true;  rows: SubmissionRow[]; total: number }
  | { success: false; error: string };

export interface Stats {
  total:      number;
  newToday:   number;
  byUrgency:  Record<string, number>;
  byCategory: Record<string, number>;
}

export type GetStatsResult =
  | { success: true;  stats: Stats }
  | { success: false; error: string };

// ─── getStats ──────────────────────────────────────────────────────────────────

export async function getStats(): Promise<GetStatsResult> {
  const session = await getStaffSession();
  if (!session) return { success: false, error: "Unauthorized." };

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const visibleWhere = { status: { notIn: ["DRAFT", "DELETED"] } };

    const [total, newToday, urgencyGroups, categoryGroups] = await Promise.all([
      db.submission.count({ where: visibleWhere }),
      db.submission.count({
        where: { ...visibleWhere, createdAt: { gte: todayStart } },
      }),
      db.submission.groupBy({
        by: ["urgencyLevel"],
        where: visibleWhere,
        _count: { _all: true },
      }),
      db.submission.groupBy({
        by: ["category"],
        where: visibleWhere,
        _count: { _all: true },
      }),
    ]);

    const byUrgency: Record<string, number> = {};
    for (const g of urgencyGroups) byUrgency[g.urgencyLevel] = g._count._all;

    const byCategory: Record<string, number> = {};
    for (const g of categoryGroups) byCategory[g.category] = g._count._all;

    return { success: true, stats: { total, newToday, byUrgency, byCategory } };
  } catch {
    return { success: false, error: "Failed to load stats." };
  }
}

// ─── getSubmissions ────────────────────────────────────────────────────────────

export async function getSubmissions(
  page: number,
  filters: SubmissionsFilter,
  sortField: SortField,
  sortDir: SortDir
): Promise<GetSubmissionsResult> {
  const session = await getStaffSession();
  if (!session) return { success: false, error: "Unauthorized." };

  const safePage = Math.max(1, Math.floor(page));

  // ── Build where clause ──────────────────────────────────────────────────────
  const where: Prisma.SubmissionWhereInput = {};

  if (filters.category)     where.category     = filters.category     as Prisma.EnumIncidentCategoryFilter;
  if (filters.urgencyLevel) where.urgencyLevel = filters.urgencyLevel as Prisma.EnumUrgencyLevelFilter;

  where.status = filters.status
    ? filters.status
    : { notIn: ["DRAFT", "DELETED"] };

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setUTCHours(23, 59, 59, 999);
      createdAt.lte = to;
    }
    where.createdAt = createdAt;
  }

  if (filters.searchId?.trim()) {
    where.id = { startsWith: filters.searchId.trim().toLowerCase(), mode: "insensitive" };
  }

  // ── User-level filters ──────────────────────────────────────────────────────
  const userWhere: Prisma.UserWhereInput = {};
  if (filters.teacherOrStudent)    userWhere.teacherOrStudent = filters.teacherOrStudent as Prisma.EnumTeacherOrStudentFilter;
  if (filters.institutionType)     userWhere.institutionType  = { equals: filters.institutionType as InstitutionType };
  if (filters.division)            userWhere.division         = { equals: filters.division,       mode: "insensitive" };
  if (filters.district?.trim())    userWhere.district         = { contains: filters.district.trim(), mode: "insensitive" };
  if (filters.searchName?.trim())  userWhere.name             = { contains: filters.searchName.trim(), mode: "insensitive" };
  if (Object.keys(userWhere).length > 0) where.user = userWhere;

  // ── Build orderBy ───────────────────────────────────────────────────────────
  const orderBy: Prisma.SubmissionOrderByWithRelationInput =
    sortField === "category"     ? { category:     sortDir } :
    sortField === "urgencyLevel" ? { urgencyLevel: sortDir } :
                                   { createdAt:    sortDir };

  try {
    const [rawRows, total] = await Promise.all([
      db.submission.findMany({
        where,
        select: {
          id:           true,
          category:     true,
          urgencyLevel: true,
          status:       true,
          createdAt:    true,
          user: { select: { name: true, teacherOrStudent: true, institutionType: true, division: true } },
        },
        orderBy,
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.submission.count({ where }),
    ]);

    const rows: SubmissionRow[] = rawRows.map((r) => ({
      id:              r.id,
      shortId:         r.id.slice(0, 8),
      createdAt:       r.createdAt.toISOString(),
      category:        r.category,
      urgencyLevel:    r.urgencyLevel,
      status:          r.status,
      userName:        r.user.name,
      userRole:        r.user.teacherOrStudent,
      institutionType: r.user.institutionType,
      division:        r.user.division,
    }));

    return { success: true, rows, total };
  } catch {
    return { success: false, error: "Failed to load submissions." };
  }
}

// ─── User management types ─────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  name: string;
  email: string;
  teacherOrStudent: string;
  institutionName: string | null;
  institutionType: string | null;
  organizationName: string | null;
  specialization: string | null;
  division: string;
  district: string;
  upazila: string;
  submissionCount: number;
  createdAt: string;
}

export interface UsersFilter {
  search?: string;
  profession?: string;
  institutionType?: string;
  division?: string;
  district?: string;
}

export type GetUsersResult =
  | { success: true; rows: UserRow[]; total: number }
  | { success: false; error: string };

export interface AuditRow {
  id:         string;
  adminId:    string | null;
  adminName:  string | null;
  userId:     string | null;
  userName:   string | null;
  action:     string;
  targetType: string | null;
  targetId:   string | null;
  ipAddress:  string | null;
  userAgent:  string | null;
  details:    string | null;
  createdAt:  string;
}

export interface AuditFilter {
  action?:     string;
  targetType?: string;
  actorType?:  "admin" | "user";
  dateFrom?:   string;
  dateTo?:     string;
}

export type GetAuditLogsResult =
  | { success: true; rows: AuditRow[]; total: number }
  | { success: false; error: string };

export type DeleteUserResult =
  | { success: true }
  | { success: false; error: string };

// ─── getUsers ──────────────────────────────────────────────────────────────────

const USER_PAGE_SIZE = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getUsers(
  page: number,
  filters: UsersFilter = {}
): Promise<GetUsersResult> {
  const session = await getStaffSession();
  if (!session) return { success: false, error: "Unauthorized." };

  const safePage = Math.max(1, Math.floor(page));

  const where: Prisma.UserWhereInput = { role: "USER" };
  if (filters.search?.trim())      where.name             = { contains: filters.search.trim(), mode: "insensitive" };
  if (filters.profession)          where.teacherOrStudent = filters.profession as Prisma.EnumTeacherOrStudentFilter;
  if (filters.institutionType)     where.institutionType  = { equals: filters.institutionType as InstitutionType };
  if (filters.division)            where.division         = { equals: filters.division, mode: "insensitive" };
  if (filters.district?.trim())    where.district         = { contains: filters.district.trim(), mode: "insensitive" };

  try {
    const [rawRows, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          encryptedEmail: true,
          emailIV: true,
          emailTag: true,
          teacherOrStudent: true,
          institutionName: true,
          institutionType: true,
          organizationName: true,
          specialization: true,
          division: true,
          district: true,
          upazila: true,
          createdAt: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * USER_PAGE_SIZE,
        take: USER_PAGE_SIZE,
      }),
      db.user.count({ where }),
    ]);

    const rows: UserRow[] = rawRows.map((r) => {
      let email = "[encrypted]";
      try {
        email = decrypt(r.encryptedEmail, r.emailIV, r.emailTag);
      } catch {
        // keep fallback
      }
      return {
        id: r.id,
        name: r.name,
        email,
        teacherOrStudent: r.teacherOrStudent,
        institutionName: r.institutionName,
        institutionType: r.institutionType,
        organizationName: r.organizationName,
        specialization: r.specialization,
        division: r.division,
        district: r.district,
        upazila: r.upazila,
        submissionCount: r._count.submissions,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return { success: true, rows, total };
  } catch {
    return { success: false, error: "Failed to load users." };
  }
}

// ─── deleteUser ────────────────────────────────────────────────────────────────

export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  if (!UUID_PATTERN.test(userId)) return { success: false, error: "Invalid user ID." };

  try {
    await db.user.delete({ where: { id: userId } });

    await db.auditLog
      .create({
        data: {
          adminId:   session.user.id,
          adminName: session.user.name,
          action:    "DELETE",
          targetId:  userId,
          targetType: "USER",
          details:   `Deleted user account ${userId.slice(0, 8)}`,
        },
      })
      .catch(() => undefined);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete user." };
  }
}

// ─── getUserDetail ─────────────────────────────────────────────────────────────

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  teacherOrStudent: string;
  institutionName: string | null;
  institutionType: string | null;
  universityType: string | null;
  department: string | null;
  division: string;
  district: string;
  upazila: string;
  specificAddress: string | null;
  createdAt: string;
  sessionsCount: number;
  submissions: {
    id: string;
    category: string;
    urgencyLevel: string;
    status: string;
    createdAt: string;
  }[];
}

export type GetUserDetailResult =
  | { success: true; user: UserDetail }
  | { success: false; error: string };

export async function getUserDetail(userId: string): Promise<GetUserDetailResult> {
  const session = await getStaffSession();
  if (!session) return { success: false, error: "Unauthorized." };

  if (!UUID_PATTERN.test(userId)) return { success: false, error: "Invalid user ID." };

  try {
    const raw = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        encryptedEmail: true,
        emailIV: true,
        emailTag: true,
        encryptedPhone: true,
        phoneIV: true,
        phoneTag: true,
        teacherOrStudent: true,
        institutionName: true,
        institutionType: true,
        universityType: true,
        department: true,
        division: true,
        district: true,
        upazila: true,
        specificAddress: true,
        createdAt: true,
        _count: { select: { sessions: true } },
        submissions: {
          select: {
            id: true,
            category: true,
            urgencyLevel: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!raw) return { success: false, error: "User not found." };

    let email = "[encrypted]";
    let phone = "[encrypted]";
    try { email = decrypt(raw.encryptedEmail, raw.emailIV, raw.emailTag); } catch { /* keep fallback */ }
    try { phone = decrypt(raw.encryptedPhone, raw.phoneIV, raw.phoneTag); } catch { /* keep fallback */ }

    return {
      success: true,
      user: {
        id: raw.id,
        name: raw.name,
        email,
        phone,
        teacherOrStudent: raw.teacherOrStudent,
        institutionName: raw.institutionName,
        institutionType: raw.institutionType,
        universityType: raw.universityType ?? null,
        department: raw.department ?? null,
        division: raw.division,
        district: raw.district,
        upazila: raw.upazila,
        specificAddress: raw.specificAddress ?? null,
        createdAt: raw.createdAt.toISOString(),
        sessionsCount: raw._count.sessions,
        submissions: raw.submissions.map((s) => ({
          id: s.id,
          category: s.category,
          urgencyLevel: s.urgencyLevel,
          status: s.status,
          createdAt: s.createdAt.toISOString(),
        })),
      },
    };
  } catch {
    return { success: false, error: "Failed to load user details." };
  }
}

// ─── getAuditLogs ──────────────────────────────────────────────────────────────

const AUDIT_PAGE_SIZE = 20;

export async function getAuditLogs(
  page: number,
  filter: AuditFilter = {}
): Promise<GetAuditLogsResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  const safePage = Math.max(1, Math.floor(page));

  const where: Prisma.AuditLogWhereInput = {};
  if (filter.action?.trim())        where.action     = filter.action as Prisma.AuditLogWhereInput["action"];
  if (filter.targetType?.trim())    where.targetType = filter.targetType;
  if (filter.actorType === "admin") where.adminId    = { not: null };
  if (filter.actorType === "user")  where.userId     = { not: null };

  if (filter.dateFrom || filter.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filter.dateFrom) createdAt.gte = new Date(filter.dateFrom);
    if (filter.dateTo)  {
      const to = new Date(filter.dateTo);
      to.setUTCHours(23, 59, 59, 999);
      createdAt.lte = to;
    }
    where.createdAt = createdAt;
  }

  try {
    const [rawRows, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * AUDIT_PAGE_SIZE,
        take: AUDIT_PAGE_SIZE,
      }),
      db.auditLog.count({ where }),
    ]);

    const rows: AuditRow[] = rawRows.map((r) => ({
      id:         r.id,
      adminId:    r.adminId   ?? null,
      adminName:  r.adminName ?? null,
      userId:     r.userId    ?? null,
      userName:   r.userName  ?? null,
      action:     r.action,
      targetType: r.targetType ?? null,
      targetId:   r.targetId  ?? null,
      ipAddress:  r.ipAddress ?? null,
      userAgent:  r.userAgent ?? null,
      details:    r.details   ?? null,
      createdAt:  r.createdAt.toISOString(),
    }));

    return { success: true, rows, total };
  } catch {
    return { success: false, error: "Failed to load audit logs." };
  }
}
