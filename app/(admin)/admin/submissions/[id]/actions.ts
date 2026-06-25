"use server";

import path from "path";
import fs from "fs";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { audit } from "@/lib/audit";

// ─── Config ────────────────────────────────────────────────────────────────────

const UPLOAD_DIR    = path.join(process.cwd(), "uploads");
const UUID_PATTERN  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = new Set(["PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]);

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

async function getRequestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

function safeDecrypt(
  ciphertext: string | null | undefined,
  iv: string | null | undefined,
  tag: string | null | undefined,
  fallback = "[decryption failed]"
): string | null {
  if (!ciphertext || !iv || !tag) return null;
  try { return decrypt(ciphertext, iv, tag); }
  catch { return fallback; }
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface DecryptedFile {
  id:           string;
  originalName: string;
  fileType:     string;
  fileSize:     number;
}

export interface SubmissionDetail {
  id:           string;
  status:       string;
  category:     string;
  urgencyLevel: string;
  description:  string;
  createdAt:    string; // ISO 8601
  updatedAt:    string;

  submitter: {
    id:              string;
    name:            string;
    email:           string;
    phone:           string;
    role:            string; // TeacherOrStudent enum value
    institutionType: string | null;
    universityType:  string | null;
    institutionName: string | null;
    department:      string | null;
    division:        string;
    district:        string;
    upazila:         string;
    specificAddress: string | null;
  };

  evidenceFiles: DecryptedFile[];
  links:         string[];

  accusedName:    string | null;
  accusedDetails: string | null;
  accusedFiles:   DecryptedFile[];
  accusedLinks:   string[];

  additionalName:    string | null;
  additionalDetails: string | null;
  additionalFiles:   DecryptedFile[];
  additionalLinks:   string[];
}

export type GetSubmissionResult =
  | { success: true;  submission: SubmissionDetail }
  | { success: false; error: string; notFound?: boolean };

export type UpdateStatusResult =
  | { success: true }
  | { success: false; error: string };

export type DeleteSubmissionResult =
  | { success: true }
  | { success: false; error: string };

// ─── getSubmission ─────────────────────────────────────────────────────────────

export async function getSubmission(id: string): Promise<GetSubmissionResult> {
  const session = await getStaffSession();
  if (!session) return { success: false, error: "Unauthorized." };

  if (!UUID_PATTERN.test(id)) return { success: false, error: "Not found.", notFound: true };

  const meta = await getRequestMeta();

  // Audit log + DB fetch in parallel — page load is recorded even if fetch fails
  await audit({
    action:     "VIEW",
    adminId:    session.user.id,
    adminName:  session.user.name,
    targetId:   id,
    targetType: "SUBMISSION",
    ipAddress:  meta.ipAddress,
    userAgent:  meta.userAgent,
    details:    `Viewed submission ${id.slice(0, 8)}`,
  });

  const [, raw] = await Promise.all([
    Promise.resolve(),

    db.submission.findUnique({
      where:   { id },
      include: {
        user:                { select: { id: true, name: true, encryptedEmail: true, emailIV: true, emailTag: true, encryptedPhone: true, phoneIV: true, phoneTag: true, teacherOrStudent: true, institutionType: true, universityType: true, institutionName: true, department: true, division: true, district: true, upazila: true, specificAddress: true } },
        evidenceFiles:            { orderBy: { createdAt: "asc" } },
        links:                    { orderBy: { createdAt: "asc" } },
        accusedEvidenceFiles:     { orderBy: { createdAt: "asc" } },
        accusedLinks:             { orderBy: { createdAt: "asc" } },
        additionalEvidenceFiles:  { orderBy: { createdAt: "asc" } },
        additionalLinks:          { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  if (!raw) return { success: false, error: "Submission not found.", notFound: true };

  const { user, evidenceFiles, links, accusedEvidenceFiles, accusedLinks, additionalEvidenceFiles, additionalLinks } = raw;

  const submission: SubmissionDetail = {
    id:           raw.id,
    status:       raw.status,
    category:     raw.category,
    urgencyLevel: raw.urgencyLevel,
    description:  safeDecrypt(raw.encryptedDescription || null, raw.descriptionIV || null, raw.descriptionTag || null) ?? "",
    createdAt:    raw.createdAt.toISOString(),
    updatedAt:    raw.updatedAt.toISOString(),

    submitter: {
      id:              user.id,
      name:            user.name,
      email:           safeDecrypt(user.encryptedEmail, user.emailIV, user.emailTag) ?? "[unavailable]",
      phone:           safeDecrypt(user.encryptedPhone, user.phoneIV, user.phoneTag) ?? "[unavailable]",
      role:            user.teacherOrStudent,
      institutionType: user.institutionType,
      universityType:  user.universityType ?? null,
      institutionName: user.institutionName,
      department:      user.department ?? null,
      division:        user.division,
      district:        user.district,
      upazila:         user.upazila,
      specificAddress: user.specificAddress ?? null,
    },

    evidenceFiles: evidenceFiles.map((f) => ({
      id:           f.id,
      originalName: safeDecrypt(f.encryptedOriginalName, f.nameIV, f.nameTag) ?? f.id,
      fileType:     f.fileType,
      fileSize:     f.fileSize,
    })),

    links: links.map((l) => safeDecrypt(l.encryptedUrl, l.urlIV, l.urlTag) ?? "[unavailable]"),

    accusedName:    safeDecrypt(raw.encryptedAccusedName,    raw.accusedNameIV,    raw.accusedNameTag),
    accusedDetails: safeDecrypt(raw.encryptedAccusedDetails, raw.accusedDetailsIV, raw.accusedDetailsTag),

    accusedFiles: accusedEvidenceFiles.map((f) => ({
      id:           f.id,
      originalName: safeDecrypt(f.encryptedOriginalName, f.nameIV, f.nameTag) ?? f.id,
      fileType:     f.fileType,
      fileSize:     f.fileSize,
    })),

    accusedLinks: accusedLinks.map((l) => safeDecrypt(l.encryptedUrl, l.urlIV, l.urlTag) ?? "[unavailable]"),

    additionalName:    safeDecrypt(raw.encryptedAdditionalName,    raw.additionalNameIV,    raw.additionalNameTag),
    additionalDetails: safeDecrypt(raw.encryptedAdditionalDetails, raw.additionalDetailsIV, raw.additionalDetailsTag),

    additionalFiles: additionalEvidenceFiles.map((f) => ({
      id:           f.id,
      originalName: safeDecrypt(f.encryptedOriginalName, f.nameIV, f.nameTag) ?? f.id,
      fileType:     f.fileType,
      fileSize:     f.fileSize,
    })),

    additionalLinks: additionalLinks.map((l) => safeDecrypt(l.encryptedUrl, l.urlIV, l.urlTag) ?? "[unavailable]"),
  };

  return { success: true, submission };
}

// ─── updateStatus ──────────────────────────────────────────────────────────────

export async function updateStatus(
  submissionId: string,
  status: string
): Promise<UpdateStatusResult> {
  const session = await getStaffSession();
  if (!session) return { success: false, error: "Unauthorized." };

  if (!UUID_PATTERN.test(submissionId)) return { success: false, error: "Invalid submission ID." };
  if (!VALID_STATUSES.has(status))      return { success: false, error: "Invalid status value." };

  const meta = await getRequestMeta();

  try {
    const existing = await db.submission.findUnique({
      where:  { id: submissionId },
      select: { id: true, status: true },
    });
    if (!existing) return { success: false, error: "Submission not found." };

    await db.submission.update({
      where: { id: submissionId },
      data:  { status },
    });

    await audit({
      action:     "STATUS_CHANGE",
      adminId:    session.user.id,
      adminName:  session.user.name,
      targetId:   submissionId,
      targetType: "SUBMISSION",
      details:    `Status changed: ${existing.status} → ${status}`,
      ipAddress:  meta.ipAddress,
      userAgent:  meta.userAgent,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update status. Please try again." };
  }
}

// ─── deleteSubmission ──────────────────────────────────────────────────────────

export async function deleteSubmission(submissionId: string): Promise<DeleteSubmissionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  if (!UUID_PATTERN.test(submissionId)) return { success: false, error: "Invalid submission ID." };

  const meta = await getRequestMeta();

  // Fetch file storage paths before deletion (cascade will remove DB rows)
  const submission = await db.submission.findUnique({
    where:  { id: submissionId },
    select: {
      evidenceFiles:       { select: { storagePath: true } },
      accusedEvidenceFiles: { select: { storagePath: true } },
    },
  });

  if (!submission) return { success: false, error: "Submission not found." };

  const storagePaths = [
    ...submission.evidenceFiles.map((f)       => path.join(UPLOAD_DIR, f.storagePath)),
    ...submission.accusedEvidenceFiles.map((f) => path.join(UPLOAD_DIR, f.storagePath)),
  ];

  // Delete DB record first — cascade removes all child rows atomically
  try {
    await db.submission.delete({ where: { id: submissionId } });
  } catch {
    return { success: false, error: "Failed to delete submission. Please try again." };
  }

  await audit({
    action:     "DELETE",
    adminId:    session.user.id,
    adminName:  session.user.name,
    targetId:   submissionId,
    targetType: "SUBMISSION",
    details:    `Deleted submission ${submissionId.slice(0, 8)} — ${storagePaths.length} file(s) removed`,
    ipAddress:  meta.ipAddress,
    userAgent:  meta.userAgent,
  });

  // Remove encrypted files from disk — best effort, after DB commit
  for (const fp of storagePaths) {
    await fs.promises.unlink(fp).catch(() => undefined);
  }

  return { success: true };
}
