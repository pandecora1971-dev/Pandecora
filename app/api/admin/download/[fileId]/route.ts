import type { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decrypt, createDecryptCipher } from "@/lib/encryption";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/auth";

// ─── Config ────────────────────────────────────────────────────────────────────

const UPLOAD_DIR   = path.join(process.cwd(), "uploads");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-. ]/g, "_").replace(/\s+/g, "_").slice(0, 200);
}

// Shared select shape for both evidence table lookups
const FILE_SELECT = {
  storagePath:           true,
  fileIV:                true,
  fileTag:               true,
  encryptedOriginalName: true,
  nameIV:                true,
  nameTag:               true,
  fileType:              true,
  fileSize:              true,
  submissionId:          true,
} as const;

type FileRecord = {
  storagePath:           string;
  fileIV:                string;
  fileTag:               string;
  encryptedOriginalName: string;
  nameIV:                string;
  nameTag:               string;
  fileType:              string;
  fileSize:              number;
  submissionId:          string;
};

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
): Promise<Response> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });

  const session = await validateSession(token);
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Validate fileId ─────────────────────────────────────────────────────────
  const { fileId } = await params;
  if (!UUID_PATTERN.test(fileId)) return new Response("Not found", { status: 404 });

  // ── Locate file record (evidence or accused) ────────────────────────────────
  let fileRecord: FileRecord | null = null;

  const evidence = await db.evidenceFile.findUnique({
    where:  { id: fileId },
    select: FILE_SELECT,
  });
  fileRecord = evidence;

  if (!fileRecord) {
    const accused = await db.accusedEvidenceFile.findUnique({
      where:  { id: fileId },
      select: FILE_SELECT,
    });
    fileRecord = accused;
  }

  if (!fileRecord) return new Response("Not found", { status: 404 });

  // ── Audit log ───────────────────────────────────────────────────────────────
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? null;

  const isInline = req.nextUrl.searchParams.get("inline") === "1";
  await db.auditLog
    .create({
      data: {
        adminId:    session.user.id,
        adminName:  session.user.name,
        action:     "DOWNLOAD",
        targetId:   fileId,
        targetType: "FILE",
        details:    `${isInline ? "Previewed" : "Downloaded"} file from submission ${fileRecord.submissionId.slice(0, 8)}`,
        ipAddress:  ip,
        userAgent:  req.headers.get("user-agent") ?? null,
      },
    })
    .catch(() => undefined);

  // ── Resolve original filename ───────────────────────────────────────────────
  let originalName = fileId;
  try {
    originalName = decrypt(
      fileRecord.encryptedOriginalName,
      fileRecord.nameIV,
      fileRecord.nameTag
    );
  } catch {}

  // ── Verify file exists on disk ──────────────────────────────────────────────
  const filePath = path.join(UPLOAD_DIR, fileRecord.storagePath);
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return new Response("File not found on disk", { status: 404 });
  }

  // ── Build streaming decrypt pipeline ────────────────────────────────────────
  // GCM auth tag is verified at stream end (decipher.final()).
  // If verification fails, the stream errors — client sees a connection drop.
  // We stream directly without buffering to support files up to 2 GB.
  const decipher = createDecryptCipher(fileRecord.fileIV, fileRecord.fileTag);
  const inputStream = fs.createReadStream(filePath);

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      inputStream.on("error", (err) => {
        controller.error(err);
      });
      decipher.on("error", (err) => {
        try { controller.error(err); } catch {}
        inputStream.destroy();
      });
      decipher.on("data", (chunk: Buffer) => {
        try {
          controller.enqueue(new Uint8Array(chunk));
        } catch {
          inputStream.destroy();
          decipher.destroy();
        }
      });
      decipher.on("end", () => {
        try { controller.close(); } catch {}
      });
      inputStream.pipe(decipher);
    },
    cancel() {
      inputStream.destroy();
      decipher.destroy();
    },
  });

  // inline=1 → browser displays (images, PDFs, video); default → force download
  const inline = req.nextUrl.searchParams.get("inline") === "1";
  const disposition = inline
    ? `inline; filename="${sanitizeFilename(originalName)}"`
    : `attachment; filename="${sanitizeFilename(originalName)}"`;

  return new Response(readable, {
    headers: {
      "Content-Type":              fileRecord.fileType,
      "Content-Disposition":       disposition,
      "Content-Length":            String(fileRecord.fileSize),
      "Cache-Control":             "no-store, no-cache, private, max-age=0",
      "X-Content-Type-Options":    "nosniff",
      "Referrer-Policy":           "no-referrer",
    },
  });
}
