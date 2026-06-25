import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decrypt, createDecryptCipher } from "@/lib/encryption";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-. ]/g, "_").replace(/\s+/g, "_").slice(0, 200);
}

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

  const { fileId } = await params;
  if (!UUID_PATTERN.test(fileId)) return new Response("Not found", { status: 404 });

  // ── Locate file record ──────────────────────────────────────────────────────
  let fileRecord: FileRecord | null = null;

  fileRecord = await db.evidenceFile.findUnique({ where: { id: fileId }, select: FILE_SELECT });
  if (!fileRecord) {
    fileRecord = await db.accusedEvidenceFile.findUnique({ where: { id: fileId }, select: FILE_SELECT });
  }
  if (!fileRecord) {
    fileRecord = await db.additionalEvidenceFile.findUnique({ where: { id: fileId }, select: FILE_SELECT });
  }
  if (!fileRecord) return new Response("Not found", { status: 404 });

  // ── Audit log ───────────────────────────────────────────────────────────────
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? null;
  const isInline = req.nextUrl.searchParams.get("inline") === "1";

  await db.auditLog.create({
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
  }).catch(() => undefined);

  // ── Resolve original filename ───────────────────────────────────────────────
  let originalName = fileId;
  try {
    originalName = decrypt(fileRecord.encryptedOriginalName, fileRecord.nameIV, fileRecord.nameTag);
  } catch {}

  // ── Fetch encrypted blob from DB ────────────────────────────────────────────
  const blob = await db.fileBlob.findUnique({ where: { id: fileRecord.storagePath } });
  if (!blob) return new Response("File not found in database", { status: 404 });

  // ── Decrypt and stream to client ────────────────────────────────────────────
  const decipher = createDecryptCipher(fileRecord.fileIV, fileRecord.fileTag);
  const encryptedData = blob.data as Buffer;

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      decipher.on("data", (chunk: Buffer) => {
        try { controller.enqueue(new Uint8Array(chunk)); } catch { decipher.destroy(); }
      });
      decipher.on("end", () => {
        try { controller.close(); } catch {}
      });
      decipher.on("error", (err) => {
        try { controller.error(err); } catch {}
      });
      decipher.end(encryptedData);
    },
    cancel() { decipher.destroy(); },
  });

  const disposition = isInline
    ? `inline; filename="${sanitizeFilename(originalName)}"`
    : `attachment; filename="${sanitizeFilename(originalName)}"`;

  return new Response(readable, {
    headers: {
      "Content-Type":           fileRecord.fileType,
      "Content-Disposition":    disposition,
      "Content-Length":         String(fileRecord.fileSize),
      "Cache-Control":          "no-store, no-cache, private, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy":        "no-referrer",
    },
  });
}
