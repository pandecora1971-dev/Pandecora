import { NextRequest, NextResponse } from "next/server";
import Busboy from "busboy";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { encrypt, createEncryptCipher } from "@/lib/encryption";
import { rateLimitByIP, rateLimitByUser } from "@/lib/rate-limit";

// ─── Config ───────────────────────────────────────────────────────────────────

const MAGIC_PROBE       = 12;                       // bytes needed for header check
const UPLOAD_TIMEOUT_MS = 10 * 60_000;              // 10 minutes per file
const MAX_REGULAR_SIZE  = 20 * 1024 * 1024;         // 20 MB per image/doc
const MAX_VIDEO_SIZE    = 2 * 1024 * 1024 * 1024;   // 2 GB per video
const MAX_REGULAR_COUNT = 5;
const MAX_VIDEO_COUNT   = 1;
const USER_QUOTA_BYTES  = 5 * 1024 * 1024 * 1024;   // 5 GB per user

// Per spec: 20 uploads per hour per user. IP gate is lighter (pre-auth defense).
const IP_LIMIT   = { max: 60, windowMs: 60 * 60_000 } as const;
const USER_LIMIT = { max: 20, windowMs: 60 * 60_000 } as const;

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const REGULAR_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain",
]);
const VIDEO_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/x-msvideo",
  "video/webm", "video/mpeg",
]);
const ALL_TYPES = new Set([...REGULAR_TYPES, ...VIDEO_TYPES]);

// ─── Magic byte validators ────────────────────────────────────────────────────
//
// Each function receives the first MAGIC_PROBE (12) bytes of the file.
// Out-of-bounds Buffer access returns undefined, which === any number is false,
// so short files fail automatically for multi-byte checks (correct behaviour).

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg":
    (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png":
    (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
            b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  "image/gif":
    (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  "image/webp":
    // RIFF....WEBP
    (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
            b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x41 && b[11] === 0x50,
  "application/pdf":
    (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  "text/plain":
    // No reliable universal signature — rely on extension + MIME allowlist
    (_b) => true,
  "video/mp4":
    // ISO Base Media (ftyp box at offset 4)
    (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  "video/quicktime":
    (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  "video/x-msvideo":
    // RIFF....AVI (space = 0x20)
    (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
            b[8] === 0x41 && b[9] === 0x56 && b[10] === 0x49 && b[11] === 0x20,
  "video/webm":
    (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  "video/mpeg":
    (b) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 &&
            (b[3] === 0xba || b[3] === 0xb3),
};

function checkMagicBytes(buf: Buffer, mimeType: string): boolean {
  const fn = MAGIC[mimeType];
  if (!fn) return false;
  // Files shorter than 4 bytes can only be valid plain text
  if (buf.length < 4) return mimeType === "text/plain";
  return fn(buf);
}

// ─── Blocked extensions ───────────────────────────────────────────────────────
//
// Applied AFTER magic-byte check as defense-in-depth.
// Scans all dot-separated segments to catch "evil.php.jpg" disguises.

const BLOCKED_EXTS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".scr", ".pif",
  ".sh",  ".bash", ".zsh", ".fish",
  ".php", ".php3", ".php4", ".php5", ".php7", ".phtml",
  ".js",  ".mjs",  ".cjs", ".jsx",
  ".ts",  ".tsx",
  ".py",  ".pyc",  ".pyo",
  ".rb",  ".pl",   ".pm",
  ".asp", ".aspx", ".cshtml",
  ".jsp", ".jspx",
  ".dll", ".so",   ".dylib",
  ".ps1", ".psm1", ".psd1",
  ".vbs", ".vbe",  ".wsf",  ".wsh",
  ".jar", ".war",  ".ear",
  ".deb", ".rpm",  ".apk",
  ".dmg", ".iso",  ".img",
  ".reg", ".env",  ".sql",
  ".htaccess", ".htpasswd", ".config",
]);

function hasBlockedExtension(filename: string): boolean {
  const parts = filename.toLowerCase().split(".");
  for (let i = 1; i < parts.length; i++) {
    if (BLOCKED_EXTS.has(`.${parts[i]}`)) return true;
  }
  return false;
}

function sanitizeFilename(raw: string): string {
  return (
    raw
      .replace(/[/\\]/g,  "_")            // path separators
      .replace(/\.\./g,   "_")            // path traversal sequences
      .replace(/[\x00-\x1f\x7f]/g, "")   // control characters and null byte
      .replace(/[<>:"|?*]/g, "_")         // Windows-reserved characters
      .slice(0, 200)
  ) || "unnamed";
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function uploadLog(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown>
): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  level === "error" ? console.error(line) : console.log(line);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function getUserStorageBytes(userId: string): Promise<number> {
  const [ev, ac] = await Promise.all([
    db.evidenceFile.aggregate({
      _sum: { fileSize: true },
      where: { submission: { userId } },
    }),
    db.accusedEvidenceFile.aggregate({
      _sum: { fileSize: true },
      where: { submission: { userId } },
    }),
  ]);
  return (ev._sum.fileSize ?? 0) + (ac._sum.fileSize ?? 0);
}

// ─── Public result type (consumed by report form + actions) ───────────────────

export interface UploadedFileResult {
  key:                   string;
  fileIV:                string;
  fileTag:               string;
  encryptedOriginalName: string;
  nameIV:                string;
  nameTag:               string;
  mimeType:              string;
  fileSize:              number;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // ── IP-level gate (pre-auth, lightweight) ─────────────────────────────────
  const ipRl = await rateLimitByIP(ip, IP_LIMIT.max, IP_LIMIT.windowMs, "upload");
  if (!ipRl.success) {
    uploadLog("warn", "rate_limited_ip", { ip });
    return NextResponse.json(
      { error: "Too many upload requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipRl.resetIn / 1000)) } }
    );
  }

  // ── Authentication ────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    uploadLog("warn", "unauthorized", { ip });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // ── Per-user rate limit (20 / hour per spec) ──────────────────────────────
  const userRl = await rateLimitByUser(userId, USER_LIMIT.max, USER_LIMIT.windowMs, "upload");
  if (!userRl.success) {
    uploadLog("warn", "rate_limited_user", { userId, ip });
    return NextResponse.json(
      { error: "Upload limit reached (20 per hour). Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(userRl.resetIn / 1000)) } }
    );
  }

  // ── Storage quota check ───────────────────────────────────────────────────
  const storageUsed = await getUserStorageBytes(userId);
  if (storageUsed >= USER_QUOTA_BYTES) {
    uploadLog("warn", "quota_exceeded", { userId, storageUsed });
    return NextResponse.json(
      { error: "Storage quota exceeded (5 GB per account)." },
      { status: 400 }
    );
  }
  const quotaLeft = USER_QUOTA_BYTES - storageUsed;

  // ── Content-type guard ────────────────────────────────────────────────────
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  req.signal.addEventListener("abort", () => {
    uploadLog("warn", "aborted", { userId, ip });
  });

  return new Promise<NextResponse>((resolveRequest) => {
    const busboy = Busboy({
      headers: { "content-type": contentType },
      fileHwm: 1 * 1024 * 1024,  // 1 MB per-file stream buffer (important for large video)
      limits: {
        fileSize: MAX_VIDEO_SIZE,                    // busboy hard cap; per-type enforced below
        files:    MAX_REGULAR_COUNT + MAX_VIDEO_COUNT,
      },
    });

    const uploads: Promise<UploadedFileResult>[] = [];
    let regularCount       = 0;
    let videoCount         = 0;
    let totalBytesInFlight = 0;   // across all concurrent files in this request
    let firstError: string | null = null;

    // ── File event — one invocation per uploaded file ──────────────────────
    busboy.on("file", (_field, stream, info) => {
      const rawName  = info.filename ?? "";
      const mimeType = info.mimeType ?? "";
      const safeName = sanitizeFilename(rawName);
      const isVideo  = VIDEO_TYPES.has(mimeType);
      const maxSize  = isVideo ? MAX_VIDEO_SIZE : MAX_REGULAR_SIZE;

      uploadLog("info", "file_received", { userId, ip, filename: safeName, mimeType });

      // Extension blocklist — checked before anything else
      if (hasBlockedExtension(safeName)) {
        firstError = `"${safeName}" has a disallowed file extension.`;
        uploadLog("warn", "blocked_extension", { userId, ip, filename: safeName });
        stream.resume();
        return;
      }

      // MIME allowlist
      if (!ALL_TYPES.has(mimeType)) {
        firstError = `File type "${mimeType}" is not permitted.`;
        uploadLog("warn", "blocked_mime", { userId, ip, mimeType, filename: safeName });
        stream.resume();
        return;
      }

      // Slot limits
      if (isVideo  && videoCount   >= MAX_VIDEO_COUNT)   { stream.resume(); return; }
      if (!isVideo && regularCount >= MAX_REGULAR_COUNT) { stream.resume(); return; }
      isVideo ? videoCount++ : regularCount++;

      // Collect encrypted chunks in memory → store in DB
      const { cipher, iv } = createEncryptCipher();
      const encryptedChunks: Buffer[] = [];
      cipher.on("data", (chunk: Buffer) => encryptedChunks.push(chunk));

      uploads.push(
        new Promise<UploadedFileResult>((res, rej) => {

          let magicBuf     = Buffer.alloc(0);
          let magicPassed  = false;
          let fileRejected = false;
          let fileBytes    = 0;

          function rejectFile(reason: string) {
            if (fileRejected) return;
            fileRejected = true;
            stream.resume();
            cipher.destroy();
            clearTimeout(timeoutId);
            uploadLog("warn", "file_rejected", { userId, ip, filename: safeName, reason });
            rej(new Error(reason));
          }

          function writeToCipher(data: Buffer) {
            if (!cipher.write(data)) {
              stream.pause();
              cipher.once("drain", () => { if (!fileRejected) stream.resume(); });
            }
          }

          const timeoutId = setTimeout(() => {
            stream.destroy(new Error("timeout"));
            rejectFile("Upload timed out after 10 minutes. Please try again.");
          }, UPLOAD_TIMEOUT_MS);

          stream.on("data", (chunk: Buffer) => {
            if (fileRejected) return;

            fileBytes          += chunk.length;
            totalBytesInFlight += chunk.length;

            if (fileBytes > maxSize) {
              rejectFile(isVideo ? "Video exceeds the 2 GB limit." : `"${safeName}" exceeds the 20 MB limit.`);
              return;
            }
            if (totalBytesInFlight > quotaLeft) {
              rejectFile("These uploads would exceed your 5 GB storage quota.");
              return;
            }

            if (!magicPassed) {
              magicBuf = Buffer.concat([magicBuf, chunk]);
              if (magicBuf.length >= MAGIC_PROBE) {
                if (!checkMagicBytes(magicBuf.subarray(0, MAGIC_PROBE), mimeType)) {
                  rejectFile(`"${safeName}" failed content validation. File header does not match declared type "${mimeType}".`);
                  return;
                }
                magicPassed = true;
                writeToCipher(magicBuf);
                magicBuf = Buffer.alloc(0);
              }
              return;
            }

            writeToCipher(chunk);
          });

          stream.on("end", () => {
            if (fileRejected) return;
            if (!magicPassed) {
              if (!checkMagicBytes(magicBuf, mimeType)) {
                rejectFile(`"${safeName}" failed content validation (file too small or wrong type).`);
                return;
              }
              magicPassed = true;
              if (magicBuf.length > 0) writeToCipher(magicBuf);
            }
            cipher.end();
          });

          stream.on("error", (err) => {
            clearTimeout(timeoutId);
            cipher.destroy();
            uploadLog("error", "stream_error", { userId, ip, filename: safeName, error: err.message });
            rej(err);
          });

          cipher.on("end", async () => {
            if (fileRejected) return;
            clearTimeout(timeoutId);
            try {
              const tag       = cipher.getAuthTag().toString("hex");
              const encrypted = Buffer.concat(encryptedChunks);

              const blob = await db.fileBlob.create({ data: { data: encrypted } });
              const nameEnc = encrypt(safeName);

              uploadLog("info", "file_stored_db", { userId, ip, filename: safeName, mimeType, fileBytes, blobId: blob.id });

              res({
                key:                   blob.id,
                fileIV:                iv,
                fileTag:               tag,
                encryptedOriginalName: nameEnc.ciphertext,
                nameIV:                nameEnc.iv,
                nameTag:               nameEnc.tag,
                mimeType,
                fileSize:              fileBytes,
              });
            } catch (err) {
              rej(err instanceof Error ? err : new Error("DB write failed."));
            }
          });

          cipher.on("error", (err) => {
            clearTimeout(timeoutId);
            uploadLog("error", "cipher_error", { userId, ip, filename: safeName, error: err.message });
            rej(err);
          });
        })
      );
    });

    // ── Busboy finish: await all file Promises ─────────────────────────────
    busboy.on("finish", async () => {
      if (firstError) {
        resolveRequest(NextResponse.json({ error: firstError }, { status: 400 }));
        return;
      }
      if (uploads.length === 0) {
        resolveRequest(NextResponse.json({ error: "No files received." }, { status: 400 }));
        return;
      }
      try {
        const files = await Promise.all(uploads);
        resolveRequest(NextResponse.json({ files }));
      } catch (err) {
        resolveRequest(
          NextResponse.json(
            { error: err instanceof Error ? err.message : "Upload failed." },
            { status: 400 }
          )
        );
      }
    });

    busboy.on("error", (err) => {
      uploadLog("error", "busboy_error", { userId, ip, error: String(err) });
      resolveRequest(NextResponse.json({ error: "Upload processing error." }, { status: 500 }));
    });

    // ── Stream request body into Busboy ───────────────────────────────────
    req.body
      ?.pipeTo(
        new WritableStream({
          write(chunk) { busboy.write(chunk as Buffer); },
          close()      { busboy.end(); },
        })
      )
      .catch((err) => {
        uploadLog("warn", "connection_lost", { userId, ip, error: String(err) });
        resolveRequest(
          NextResponse.json({ error: "Connection lost during upload." }, { status: 499 })
        );
      });
  });
}
