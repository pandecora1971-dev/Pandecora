import "server-only";
import crypto from "crypto";

export interface UploadMetadata {
  key: string;
  fileIV: string;
  fileTag: string;
  encryptedOriginalName: string;
  nameIV: string;
  nameTag: string;
  mimeType: string;
  fileSize: number;
}

function signature(file: UploadMetadata, userId: string): Buffer {
  // Derive a separate signing key from configuration that existing accounts
  // already require, avoiding a new secret requirement during deployment.
  const pepper = process.env.HASH_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("Upload signing is not configured");
  const secret = crypto.createHmac("sha256", pepper).update("pandecora:upload-signing-key:v1").digest();
  const payload = ["upload-metadata:v1", userId, file.key, file.fileIV, file.fileTag,
    file.encryptedOriginalName, file.nameIV, file.nameTag, file.mimeType, file.fileSize];
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest();
}

export function signUploadMetadata(file: UploadMetadata, userId: string): string {
  return signature(file, userId).toString("hex");
}

export function verifyUploadMetadata(file: UploadMetadata & { uploadToken?: string }, userId: string): boolean {
  if (typeof file.uploadToken !== "string" || !/^[0-9a-f]{64}$/i.test(file.uploadToken)) return false;
  return crypto.timingSafeEqual(Buffer.from(file.uploadToken, "hex"), signature(file, userId));
}
