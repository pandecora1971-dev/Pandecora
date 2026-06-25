/**
 * AES-256-GCM encryption utilities — single module that touches raw key material.
 *
 * All user PII is encrypted before storage. Sensitive fields are stored as
 * three separate DB columns: ciphertext (base64), IV (hex), auth tag (hex).
 *
 * Never log keys, IVs, or plaintext. Never reuse an IV.
 */

import crypto from "crypto";
import fs from "fs";
import { pipeline } from "stream/promises";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm" as const;
const KEY_BYTES = 32; // 256-bit key  → 64 hex chars in env var
const IV_BYTES = 16;  // 128-bit IV   → unique per encryption call
const TAG_BYTES = 16; // 128-bit GCM auth tag (fixed output size)

// ─── Custom error class ───────────────────────────────────────────────────────

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

// ─── Key & pepper management ──────────────────────────────────────────────────

let _cachedKey: Buffer | null = null;

/**
 * Parses, validates, and caches the encryption key from the environment.
 * Throws `EncryptionError` immediately if the key is absent or malformed —
 * the app will not start with a bad key.
 */
function getKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const hex = process.env.ENCRYPTION_KEY;

  if (!hex) {
    throw new EncryptionError(
      "ENCRYPTION_KEY is not set. " +
        "Generate one with: node -e \"const {generateEncryptionKey}=require('./lib/encryption');generateEncryptionKey()\""
    );
  }
  if (hex.length !== KEY_BYTES * 2) {
    throw new EncryptionError(
      `ENCRYPTION_KEY must be exactly ${KEY_BYTES * 2} hex characters (${KEY_BYTES} bytes). ` +
        `Got ${hex.length} characters.`
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new EncryptionError(
      "ENCRYPTION_KEY contains non-hexadecimal characters."
    );
  }

  _cachedKey = Buffer.from(hex, "hex");
  return _cachedKey;
}

/**
 * Returns the HASH_PEPPER used to key the HMAC for email hashing.
 * A missing or short pepper is rejected at call time.
 */
function getPepper(): string {
  const pepper = process.env.HASH_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new EncryptionError(
      "HASH_PEPPER is not set or is too short (minimum 32 characters). " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  return pepper;
}

// ─── Text encryption ──────────────────────────────────────────────────────────

export interface EncryptResult {
  ciphertext: string; // base64-encoded ciphertext
  iv: string;         // hex-encoded 16-byte IV
  tag: string;        // hex-encoded 16-byte GCM auth tag
}

/**
 * Encrypts a UTF-8 string with AES-256-GCM.
 * A fresh random IV is generated for every call — never reused.
 *
 * Store all three returned fields. You need all three to decrypt.
 */
export function encrypt(plaintext: string): EncryptResult {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Decrypts a ciphertext produced by `encrypt`.
 *
 * Throws `EncryptionError` if:
 * - The IV or tag encoding is invalid
 * - The auth tag doesn't match (data tampered or wrong key)
 * - The key is misconfigured
 *
 * GCM authentication failure is detected automatically by Node.js crypto.
 */
export function decrypt(ciphertext: string, iv: string, tag: string): string {
  const key = getKey();

  // Parse and validate inputs before touching the decipher
  let ivBuf: Buffer;
  let tagBuf: Buffer;
  let ciphertextBuf: Buffer;

  try {
    ivBuf = Buffer.from(iv, "hex");
    tagBuf = Buffer.from(tag, "hex");
    ciphertextBuf = Buffer.from(ciphertext, "base64");
  } catch {
    throw new EncryptionError(
      "Decryption failed: malformed IV, tag, or ciphertext encoding."
    );
  }

  if (ivBuf.length !== IV_BYTES) {
    throw new EncryptionError(
      `Decryption failed: expected ${IV_BYTES}-byte IV, got ${ivBuf.length} bytes.`
    );
  }
  if (tagBuf.length !== TAG_BYTES) {
    throw new EncryptionError(
      `Decryption failed: expected ${TAG_BYTES}-byte auth tag, got ${tagBuf.length} bytes.`
    );
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
    decipher.setAuthTag(tagBuf);

    return Buffer.concat([
      decipher.update(ciphertextBuf),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Do NOT propagate the raw crypto error — it may reveal key-related hints.
    throw new EncryptionError(
      "Decryption failed: authentication tag mismatch or corrupted data. " +
        "The ciphertext may have been tampered with, or the wrong key was used."
    );
  }
}

// ─── Keyed hash for lookup ────────────────────────────────────────────────────

/**
 * Produces a keyed HMAC-SHA256 of `value` using HASH_PEPPER.
 *
 * Used to create a deterministic, lookup-safe fingerprint of email addresses
 * without storing plaintext. HMAC (rather than SHA-256(pepper‖value)) prevents
 * length-extension attacks.
 *
 * The input is normalised (trimmed + lowercased) so that casing differences
 * don't create duplicate accounts.
 */
export function hashForLookup(value: string): string {
  const pepper = getPepper();
  return crypto
    .createHmac("sha256", pepper)
    .update(value.trim().toLowerCase())
    .digest("hex");
}

// ─── Buffer encryption ────────────────────────────────────────────────────────

export interface BufferEncryptResult {
  encrypted: Buffer;
  iv: string;  // hex
  tag: string; // hex
}

/**
 * Encrypts a Buffer with AES-256-GCM in memory.
 * Suitable for files up to ~20 MB. For larger files use encryptFile().
 */
export function encryptBuffer(input: Buffer): BufferEncryptResult {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Creates a fresh AES-256-GCM Transform stream and its IV.
 *
 * Usage:
 *   const { cipher, iv } = createEncryptCipher();
 *   cipher.pipe(writeStream);
 *   cipher.write(chunk); ... cipher.end();
 *   // after writeStream "finish": cipher.getAuthTag()
 *
 * Used for streaming encryption of large files (e.g. video uploads).
 */
export function createEncryptCipher() {
  const key = getKey();
  const ivBuf = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, ivBuf);
  return { cipher, iv: ivBuf.toString("hex") };
}

/**
 * Creates an AES-256-GCM Decipher Transform stream pre-loaded with the given
 * IV and auth tag. Pipe a readable into it to get decrypted chunks out.
 *
 * The GCM auth tag is verified when the stream ends (decipher.final()).
 * If verification fails, the stream emits an "error" event — the caller must
 * handle it to avoid an unhandled rejection or partial decrypted output.
 *
 * Throws EncryptionError synchronously if the IV or tag hex is malformed.
 */
export function createDecryptCipher(iv: string, tag: string) {
  const key = getKey();
  let ivBuf: Buffer;
  let tagBuf: Buffer;
  try {
    ivBuf  = Buffer.from(iv,  "hex");
    tagBuf = Buffer.from(tag, "hex");
  } catch {
    throw new EncryptionError("Decryption failed: malformed IV or tag encoding.");
  }
  if (ivBuf.length !== IV_BYTES) {
    throw new EncryptionError(
      `Decryption failed: expected ${IV_BYTES}-byte IV, got ${ivBuf.length} bytes.`
    );
  }
  if (tagBuf.length !== TAG_BYTES) {
    throw new EncryptionError(
      `Decryption failed: expected ${TAG_BYTES}-byte auth tag, got ${tagBuf.length} bytes.`
    );
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(tagBuf);
  return decipher;
}

// ─── File encryption (streaming) ──────────────────────────────────────────────

export interface FileEncryptResult {
  iv: string;  // hex
  tag: string; // hex
}

/**
 * Encrypts a file at `inputPath` and writes the ciphertext to `outputPath`.
 *
 * Stream-based so it handles files of arbitrary size (including large videos)
 * without loading the whole file into memory. Returns the IV and auth tag;
 * store these in the database alongside the file record.
 *
 * On failure the partial output file is deleted.
 */
export async function encryptFile(
  inputPath: string,
  outputPath: string
): Promise<FileEncryptResult> {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  try {
    await pipeline(input, cipher, output);
  } catch (err) {
    // Best-effort cleanup of a potentially partial output file
    await fs.promises.unlink(outputPath).catch(() => undefined);
    throw new EncryptionError(
      `File encryption failed: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  // getAuthTag() is only valid after cipher.final(), which pipeline triggers
  return {
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Decrypts a file produced by `encryptFile`.
 *
 * Writes decrypted bytes to a temporary path first; renames to `outputPath`
 * only after the GCM auth tag is verified successfully. This prevents a
 * tampered file from leaking partial plaintext to callers.
 *
 * Throws `EncryptionError` if the auth tag doesn't match.
 */
export async function decryptFile(
  inputPath: string,
  outputPath: string,
  iv: string,
  tag: string
): Promise<void> {
  const key = getKey();

  let ivBuf: Buffer;
  let tagBuf: Buffer;
  try {
    ivBuf = Buffer.from(iv, "hex");
    tagBuf = Buffer.from(tag, "hex");
  } catch {
    throw new EncryptionError(
      "File decryption failed: malformed IV or tag encoding."
    );
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
  // Auth tag must be set before any data is processed
  decipher.setAuthTag(tagBuf);

  // Write to a sibling temp file; only expose plaintext after verification
  const tmpPath = `${outputPath}.dec.tmp`;
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(tmpPath);

  try {
    // pipeline calls decipher.final() on stream end, which is where GCM
    // verifies the auth tag. If verification fails, pipeline rejects.
    await pipeline(input, decipher, output);
    await fs.promises.rename(tmpPath, outputPath);
  } catch {
    await fs.promises.unlink(tmpPath).catch(() => undefined);
    throw new EncryptionError(
      "File decryption failed: authentication tag mismatch or corrupted data. " +
        "The file may have been tampered with, or the wrong key was used."
    );
  }
}

// ─── Key generation utility ───────────────────────────────────────────────────

/**
 * Generates a cryptographically random 32-byte (256-bit) hex key and prints
 * it to stdout. Run once during initial setup — never commit the output.
 *
 * Usage:
 *   node -e "const {generateEncryptionKey}=require('./lib/encryption');generateEncryptionKey()"
 *
 * This function intentionally does NOT call getKey() — it is safe to run
 * before ENCRYPTION_KEY has been configured in the environment.
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_BYTES).toString("hex");
  // eslint-disable-next-line no-console
  console.log(key);
  return key;
}

// ─── Self-test (runs on module import) ───────────────────────────────────────
//
// Validates the full encrypt → decrypt round-trip at startup.
// If this throws, the process will not start — fail-fast beats silent failure.
//
// The test is skipped when ENCRYPTION_KEY is absent so that the
// `generateEncryptionKey()` bootstrapping command can run without a key
// already in place. An absent key is still caught by getKey() at call time.

(function encryptionSelfTest() {
  if (!process.env.ENCRYPTION_KEY) return;

  const PROBE = "secure-incident-platform:encryption-self-test-v1";

  let result: EncryptResult;
  try {
    result = encrypt(PROBE);
  } catch (err) {
    throw new Error(
      "Encryption self-test failed during encrypt — app cannot start.\n" +
        `Reason: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Verify that two calls produce different IVs (IV uniqueness sanity check)
  const result2 = encrypt(PROBE);
  if (result.iv === result2.iv) {
    throw new Error(
      "Encryption self-test failed: two encrypt() calls produced the same IV. " +
        "The random number generator may be broken — app cannot start."
    );
  }

  let recovered: string;
  try {
    recovered = decrypt(result.ciphertext, result.iv, result.tag);
  } catch (err) {
    throw new Error(
      "Encryption self-test failed during decrypt — app cannot start.\n" +
        `Reason: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (recovered !== PROBE) {
    throw new Error(
      "Encryption self-test failed: decrypted value does not match original — app cannot start."
    );
  }

  // Verify that tampering with the auth tag is rejected
  const tampered = result.tag.replace(/[0-9a-f]/, (c) =>
    ((parseInt(c, 16) + 1) % 16).toString(16)
  );
  let tamperRejected = false;
  try {
    decrypt(result.ciphertext, result.iv, tampered);
  } catch {
    tamperRejected = true;
  }
  if (!tamperRejected) {
    throw new Error(
      "Encryption self-test failed: tampered auth tag was not rejected — app cannot start."
    );
  }
})();
