"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/auth";
import { rateLimitByUser } from "@/lib/rate-limit";
import { incidentReportSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import type { IncidentCategory, UrgencyLevel } from "@prisma/client";
import type { ZodIssue } from "zod";

// ─── Config ───────────────────────────────────────────────────────────────────

// Field-name map and Zod → Bangla error translator
const FIELD_BN: Record<string, string> = {
  category:          "বিভাগ",
  urgencyLevel:      "জরুরী স্তর",
  description:       "বিবরণ",
  links:             "প্রমাণের লিঙ্ক",
  accusedName:       "অভিযুক্তের নাম",
  accusedDetails:    "অভিযুক্তের বিবরণ",
  accusedLinks:      "অভিযুক্তের লিঙ্ক",
  additionalName:    "অতিরিক্ত দায়ীর নাম",
  additionalDetails: "অতিরিক্ত দায়ীর বিবরণ",
  additionalLinks:   "অতিরিক্ত দায়ীর লিঙ্ক",
};

function zodIssuesToBangla(issues: ZodIssue[]): string {
  for (const issue of issues) {
    const key   = String(issue.path[0] ?? "");
    const field = FIELD_BN[key] ?? "তথ্য";
    if (issue.code === "invalid_enum_value") {
      return `"${field}" এর মান গ্রহণযোগ্য নয়। পুনরায় নির্বাচন করুন।`;
    }
    if (issue.code === "too_small") {
      if (key === "description") return "বিবরণ কমপক্ষে ১০ অক্ষর হতে হবে।";
      return `"${field}" এর তথ্য অসম্পূর্ণ।`;
    }
    if (issue.code === "too_big") {
      return `"${field}" এর তথ্য সর্বোচ্চ সীমা অতিক্রম করেছে।`;
    }
    const msg = issue.message ?? "";
    if (/url/i.test(msg) || /invalid url/i.test(msg)) {
      return `"${field}" তালিকায় একটি অবৈধ লিঙ্ক রয়েছে। সঠিক URL দিন।`;
    }
    if (/disallowed|invalid char/i.test(msg)) {
      return `"${field}" তে অননুমোদিত বিষয়বস্তু রয়েছে।`;
    }
    return `"${field}" সঠিকভাবে পূরণ করুন।`;
  }
  return "তথ্য যাচাই ব্যর্থ হয়েছে। আপনার প্রবেশ করা তথ্য পুনরায় পরীক্ষা করুন।";
}

// 5 final submissions per 24 hours; drafts get a more lenient 30/day limit.
const SUBMIT_LIMIT = { max: 5,  windowMs: 24 * 60 * 60_000 } as const;
const DRAFT_LIMIT  = { max: 30, windowMs: 24 * 60 * 60_000 } as const;

// Upload route now stores blobs in DB and returns the blob UUID as the key.
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FileMetadata {
  key:                   string;
  fileIV:                string;
  fileTag:               string;
  encryptedOriginalName: string;
  nameIV:                string;
  nameTag:               string;
  mimeType:              string;
  fileSize:              number;
}

export interface ReportPayload {
  category:              string;
  urgencyLevel:          string;
  description:           string;
  evidenceFiles:         FileMetadata[];
  videoFile?:            FileMetadata;
  links:                 string[];
  accusedName?:          string;
  accusedDetails?:       string;
  accusedFiles:          FileMetadata[];
  accusedVideoFile?:     FileMetadata;
  accusedLinks:          string[];
  additionalName?:       string;
  additionalDetails?:    string;
  additionalFiles:       FileMetadata[];
  additionalVideoFile?:  FileMetadata;
  additionalLinks:       string[];
}

// Discriminated union — callers check `result.success`
export type ReportActionResult =
  | { success: true;  submissionId: string }
  | { success: false; error: string };

export interface DraftSummary {
  id:                 string;
  category:           string;
  urgencyLevel:       string;
  descriptionPreview: string; // first 120 chars of decrypted description
  fileCount:          number;
  createdAt:          Date;
  updatedAt:          Date;
}

export type GetDraftsResult =
  | { success: true;  drafts: DraftSummary[] }
  | { success: false; error: string };

export type DeleteDraftResult =
  | { success: true }
  | { success: false; error: string };

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthenticatedSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSession(token);
}

// ─── File validation ──────────────────────────────────────────────────────────

async function fileExistsInDB(key: string): Promise<boolean> {
  const blob = await db.fileBlob.findUnique({ where: { id: key }, select: { id: true } });
  return blob !== null;
}

/**
 * Validates all submitted FileMetadata objects:
 * 1. key matches the expected UUID.enc format (prevents path traversal)
 * 2. File actually exists on disk (uploaded via the authenticated upload API)
 * 3. fileSize is a positive integer
 *
 * Returns an error string on the first violation, or null if all pass.
 */
async function validateFileMetadata(files: FileMetadata[]): Promise<string | null> {
  for (const f of files) {
    if (!KEY_PATTERN.test(f.key)) {
      return "Invalid file reference (malformed key).";
    }
    if (!(await fileExistsInDB(f.key))) {
      return "One or more files were not found. Please re-upload and try again.";
    }
    if (!Number.isInteger(f.fileSize) || f.fileSize <= 0 || f.fileSize > 2 * 1024 * 1024 * 1024) {
      return "Invalid file size in submission.";
    }
  }
  return null;
}

// ─── Decrypt preview (best-effort — never throws to the caller) ───────────────

function decryptPreview(ciphertext: string, iv: string, tag: string, maxLen = 120): string {
  try {
    const full = decrypt(ciphertext, iv, tag);
    return full.length > maxLen ? `${full.slice(0, maxLen)}…` : full;
  } catch {
    return "[content unavailable]";
  }
}

// ─── Core submit / save logic ─────────────────────────────────────────────────

async function persistReport(
  payload: ReportPayload,
  status: "PENDING" | "DRAFT"
): Promise<ReportActionResult> {

  // ── Authentication ────────────────────────────────────────────────────────
  const session = await getAuthenticatedSession();
  if (!session) return { success: false, error: "Unauthorized." };
  const userId = session.user.id;

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const limit = status === "PENDING" ? SUBMIT_LIMIT : DRAFT_LIMIT;
  const context = status === "PENDING" ? "submit" : "draft";
  const rl = await rateLimitByUser(userId, limit.max, limit.windowMs, context);
  if (!rl.success) {
    const cap = status === "PENDING"
      ? "5 final submissions per day"
      : "30 draft saves per day";
    return { success: false, error: `Rate limit reached (${cap}). Please try again later.` };
  }

  // ── Zod validation on all text fields ────────────────────────────────────
  // incidentReportSchema applies security sanitization (strips <>, trims) via
  // the _secure pipeline in validators.ts. Post-parse values are what gets encrypted.
  const rawText = {
    category:          payload.category,
    urgencyLevel:      payload.urgencyLevel,
    description:       payload.description,
    links:             payload.links.filter((l) => l.trim()),
    accusedName:       payload.accusedName    || undefined,
    accusedDetails:    payload.accusedDetails  || undefined,
    accusedLinks:      payload.accusedLinks.filter((l) => l.trim()),
    additionalName:    payload.additionalName    || undefined,
    additionalDetails: payload.additionalDetails || undefined,
    additionalLinks:   payload.additionalLinks.filter((l) => l.trim()),
  };

  // For drafts, make description optional (user may not have filled it yet)
  const schema =
    status === "DRAFT"
      ? incidentReportSchema.partial({ description: true })
      : incidentReportSchema;

  const parsed = schema.safeParse(rawText);
  if (!parsed.success) {
    log("submission_validation_failed", {
      userId,
      status,
      issues: parsed.error.issues.map((i) => ({ path: i.path, code: i.code })),
    });
    return { success: false, error: zodIssuesToBangla(parsed.error.issues) };
  }

  const d = parsed.data;

  // ── File metadata validation ──────────────────────────────────────────────
  const allFiles: FileMetadata[] = [
    ...payload.evidenceFiles,
    ...(payload.videoFile            ? [payload.videoFile]            : []),
    ...payload.accusedFiles,
    ...(payload.accusedVideoFile     ? [payload.accusedVideoFile]     : []),
    ...payload.additionalFiles,
    ...(payload.additionalVideoFile  ? [payload.additionalVideoFile]  : []),
  ];

  const MAX_FILES = 18; // 5 evidence + 1 video + 5 accused + 1 accused video + 5 additional + 1 additional video
  if (allFiles.length > MAX_FILES) {
    return { success: false, error: "Too many files attached." };
  }

  const fileError = await validateFileMetadata(allFiles);
  if (fileError) {
    log("submission_file_validation_failed", { userId, status, reason: fileError });
    return { success: false, error: fileError };
  }

  // ── Encrypt all text PII server-side ──────────────────────────────────────
  const descText     = (d as typeof incidentReportSchema._type).description ?? "";
  const descEnc      = descText ? encrypt(descText) : null;

  const accusedName      = (d as typeof incidentReportSchema._type).accusedName;
  const accusedDets      = (d as typeof incidentReportSchema._type).accusedDetails;
  const additionalName   = (d as typeof incidentReportSchema._type).additionalName;
  const additionalDets   = (d as typeof incidentReportSchema._type).additionalDetails;

  const accusedNameEnc    = accusedName    ? encrypt(accusedName)    : null;
  const accusedDetsEnc    = accusedDets    ? encrypt(accusedDets)    : null;
  const additionalNameEnc = additionalName ? encrypt(additionalName) : null;
  const additionalDetsEnc = additionalDets ? encrypt(additionalDets) : null;

  const evidenceFilesMeta    = [...payload.evidenceFiles, ...(payload.videoFile           ? [payload.videoFile]           : [])];
  const additionalFilesMeta  = [...payload.additionalFiles, ...(payload.additionalVideoFile ? [payload.additionalVideoFile] : [])];
  const validLinks           = ((d as typeof incidentReportSchema._type).links ?? []).filter(Boolean);
  const validAccusedLinks    = ((d as typeof incidentReportSchema._type).accusedLinks ?? []).filter(Boolean);
  const validAdditionalLinks = ((d as typeof incidentReportSchema._type).additionalLinks ?? []).filter(Boolean);

  if (!descEnc && status === "PENDING") {
    return { success: false, error: "Description is required for final submissions." };
  }

  // ── DB transaction — all-or-nothing ──────────────────────────────────────
  let submission: { id: string };
  try {
    submission = await db.$transaction(async (tx) => {
      return tx.submission.create({
        select: { id: true },
        data: {
          userId,
          category:    d.category    as IncidentCategory,
          urgencyLevel: d.urgencyLevel as UrgencyLevel,

          // Description — required for PENDING, may be empty for DRAFT
          encryptedDescription: descEnc?.ciphertext ?? "",
          descriptionIV:        descEnc?.iv          ?? "",
          descriptionTag:       descEnc?.tag          ?? "",

          encryptedAccusedName:    accusedNameEnc?.ciphertext ?? null,
          accusedNameIV:           accusedNameEnc?.iv          ?? null,
          accusedNameTag:          accusedNameEnc?.tag          ?? null,

          encryptedAccusedDetails: accusedDetsEnc?.ciphertext ?? null,
          accusedDetailsIV:        accusedDetsEnc?.iv          ?? null,
          accusedDetailsTag:       accusedDetsEnc?.tag          ?? null,

          encryptedAdditionalName:    additionalNameEnc?.ciphertext ?? null,
          additionalNameIV:           additionalNameEnc?.iv          ?? null,
          additionalNameTag:          additionalNameEnc?.tag          ?? null,

          encryptedAdditionalDetails: additionalDetsEnc?.ciphertext ?? null,
          additionalDetailsIV:        additionalDetsEnc?.iv          ?? null,
          additionalDetailsTag:       additionalDetsEnc?.tag          ?? null,

          status,

          evidenceFiles: {
            create: evidenceFilesMeta.map((f) => ({
              storagePath:           f.key,
              encryptedOriginalName: f.encryptedOriginalName,
              nameIV:                f.nameIV,
              nameTag:               f.nameTag,
              fileType:              f.mimeType,
              fileSize:              f.fileSize,
              fileIV:                f.fileIV,
              fileTag:               f.fileTag,
            })),
          },

          links: {
            create: validLinks.map((url) => {
              const e = encrypt(url);
              return { encryptedUrl: e.ciphertext, urlIV: e.iv, urlTag: e.tag };
            }),
          },

          accusedEvidenceFiles: {
            create: [
              ...payload.accusedFiles,
              ...(payload.accusedVideoFile ? [payload.accusedVideoFile] : []),
            ].map((f) => ({
              storagePath:           f.key,
              encryptedOriginalName: f.encryptedOriginalName,
              nameIV:                f.nameIV,
              nameTag:               f.nameTag,
              fileType:              f.mimeType,
              fileSize:              f.fileSize,
              fileIV:                f.fileIV,
              fileTag:               f.fileTag,
            })),
          },

          accusedLinks: {
            create: validAccusedLinks.map((url) => {
              const e = encrypt(url);
              return { encryptedUrl: e.ciphertext, urlIV: e.iv, urlTag: e.tag };
            }),
          },

          additionalEvidenceFiles: {
            create: additionalFilesMeta.map((f) => ({
              storagePath:           f.key,
              encryptedOriginalName: f.encryptedOriginalName,
              nameIV:                f.nameIV,
              nameTag:               f.nameTag,
              fileType:              f.mimeType,
              fileSize:              f.fileSize,
              fileIV:                f.fileIV,
              fileTag:               f.fileTag,
            })),
          },

          additionalLinks: {
            create: validAdditionalLinks.map((url) => {
              const e = encrypt(url);
              return { encryptedUrl: e.ciphertext, urlIV: e.iv, urlTag: e.tag };
            }),
          },
        },
      });
    });
  } catch (err) {
    log("submission_db_error", {
      userId,
      status,
      error: err instanceof Error ? err.message : String(err),
    });
    // Never expose DB internals to the client
    return { success: false, error: "Failed to save your report. Please try again." };
  }

  log("submission_created", { userId, submissionId: submission.id, status });

  await audit({
    action:     status === "PENDING" ? "SUBMIT_REPORT" : "SAVE_DRAFT",
    userId,
    userName:   session.user.name,
    targetId:   submission.id,
    targetType: "SUBMISSION",
    details:    status === "PENDING"
      ? `Submitted incident report ${submission.id.slice(0, 8)}`
      : `Saved draft ${submission.id.slice(0, 8)}`,
  });

  return { success: true, submissionId: submission.id };
}

// ─── Exported actions ─────────────────────────────────────────────────────────

/**
 * Submits a final incident report (status = PENDING).
 * Rate-limited to 5 per day per user.
 */
export async function submitReport(payload: ReportPayload): Promise<ReportActionResult> {
  return persistReport(payload, "PENDING");
}

/**
 * Saves an incident report as a draft (status = DRAFT).
 * Description is optional; all other validations still apply.
 * Rate-limited to 30 saves per day per user.
 */
export async function saveDraft(payload: ReportPayload): Promise<ReportActionResult> {
  return persistReport(payload, "DRAFT");
}

/**
 * Returns the authenticated user's draft submissions, newest first.
 * Decrypts a short description preview for display.
 */
export async function getUserDrafts(): Promise<GetDraftsResult> {
  const session = await getAuthenticatedSession();
  if (!session) return { success: false, error: "Unauthorized." };

  try {
    const rows = await db.submission.findMany({
      where:   { userId: session.user.id, status: "DRAFT" },
      select: {
        id:           true,
        category:     true,
        urgencyLevel: true,
        encryptedDescription: true,
        descriptionIV:        true,
        descriptionTag:       true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { evidenceFiles: true, accusedEvidenceFiles: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50, // safety cap
    });

    const drafts: DraftSummary[] = rows.map((row) => ({
      id:           row.id,
      category:     row.category,
      urgencyLevel: row.urgencyLevel,
      descriptionPreview: row.encryptedDescription
        ? decryptPreview(row.encryptedDescription, row.descriptionIV, row.descriptionTag)
        : "(no description yet)",
      fileCount:  row._count.evidenceFiles + row._count.accusedEvidenceFiles,
      createdAt:  row.createdAt,
      updatedAt:  row.updatedAt,
    }));

    return { success: true, drafts };
  } catch {
    return { success: false, error: "Failed to retrieve drafts." };
  }
}

/**
 * Soft-deletes a draft by setting its status to "DELETED".
 * Only the owner can delete their own drafts.
 * Final submissions (status = PENDING or UNDER_REVIEW) cannot be deleted.
 */
export async function deleteDraft(submissionId: string): Promise<DeleteDraftResult> {
  const session = await getAuthenticatedSession();
  if (!session) return { success: false, error: "Unauthorized." };

  // Validate submissionId is a UUID (prevent arbitrary input reaching the DB)
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_PATTERN.test(submissionId)) {
    return { success: false, error: "Invalid submission ID." };
  }

  // Fetch only the fields needed for ownership + status check
  const submission = await db.submission.findUnique({
    where:  { id: submissionId },
    select: { userId: true, status: true },
  });

  if (!submission) {
    // Return the same message whether the submission doesn't exist or belongs to another user
    return { success: false, error: "Draft not found." };
  }
  if (submission.userId !== session.user.id) {
    log("draft_delete_forbidden", { userId: session.user.id, submissionId });
    return { success: false, error: "Draft not found." }; // don't reveal existence
  }
  if (submission.status !== "DRAFT") {
    return { success: false, error: "Only drafts can be deleted." };
  }

  try {
    await db.submission.update({
      where: { id: submissionId },
      data:  { status: "DELETED" },
    });
    log("draft_deleted", { userId: session.user.id, submissionId });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete draft. Please try again." };
  }
}
