import assert from "node:assert/strict";
import { after, afterEach, mock, test } from "node:test";
import crypto from "node:crypto";

Object.assign(process.env, {
  NODE_ENV: "test", DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  ENCRYPTION_KEY: "11".repeat(32), HASH_PEPPER: "22".repeat(32), BETTER_AUTH_SECRET: "33".repeat(32),
  RESEND_API_KEY: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "",
});
const { db } = await import("../lib/db");
const { encrypt } = await import("../lib/encryption");
const { loginWithEmail, hashPassword, clearLoginAttempts } = await import("../lib/auth");
const { extractSessionToken, validateSession } = await import("../lib/session");
const { signUpSchema, incidentReportSchema, loginSchema } = await import("../lib/validators");
const { signUploadMetadata, verifyUploadMetadata } = await import("../lib/upload-metadata");
const { POST: authPost } = await import("../app/api/auth/[...all]/route");
const { POST: uploadPost } = await import("../app/api/upload/route");
const { NextRequest } = await import("next/server");

const restorers: (() => void)[] = [];
function stub(target: object, name: string, implementation: (...args: unknown[]) => unknown) {
  const object = target as Record<string, unknown>;
  const original = object[name];
  const replacement = mock.fn(implementation);
  object[name] = replacement;
  restorers.push(() => { object[name] = original; });
  return replacement;
}
afterEach(() => { restorers.splice(0).reverse().forEach((restore) => restore()); mock.restoreAll(); });
after(() => db.$disconnect());
const token = "ab".repeat(32);
const email = encrypt("reporter@example.test");
const user = {
  id: crypto.randomUUID(), name: "Test Reporter", role: "USER" as const, emailVerified: true,
  encryptedEmail: email.ciphertext, emailIV: email.iv, emailTag: email.tag,
  teacherOrStudent: "DOCTOR", division: "Dhaka", district: "Dhaka", upazila: "Dhamrai",
  specificAddress: null, institutionType: null, universityType: null, institutionName: null,
  department: null, createdAt: new Date(), updatedAt: new Date(),
  hashedPassword: await hashPassword("Valid-Pass123"),
};
function sessionFixture(account = user) {
  return { id: crypto.randomUUID(), userId: account.id, token, expiresAt: new Date(Date.now() + 60_000),
    ipAddress: null, userAgent: null, createdAt: new Date(), user: account };
}
function authorizeUpload() {
  stub(db.session, "findUnique", async () => sessionFixture());
  stub(db.session, "update", async () => ({}));
  for (const model of [db.evidenceFile, db.accusedEvidenceFile, db.additionalEvidenceFile]) {
    stub(model, "aggregate", async () => ({ _sum: { fileSize: 0 } }));
  }
}
function uploadRequest(body: FormData | string, contentType?: string) {
  return new NextRequest("http://localhost/api/upload", { method: "POST", body,
    headers: { Cookie: `sip_session=${token}`, ...(contentType ? { "Content-Type": contentType } : {}) } });
}

test("malformed or noncanonical cookies are rejected before any database access", async () => {
  const query = stub(db.session, "findUnique", () => { throw Error("Unexpected query"); });
  for (const cookie of [null, "sip_session=%E0%A4%A", "sip_session=short", "other=value"]) {
    assert.equal(extractSessionToken(cookie), null);
  }
  assert.equal(extractSessionToken(`other=1; sip_session=${token}`), token);
  assert.equal(await validateSession("garbage"), null);
  assert.equal(query.mock.callCount(), 0);
});

test("sessions belonging to unverified accounts are revoked", async () => {
  stub(db.session, "findUnique", async () => sessionFixture({ ...user, emailVerified: false }));
  const removed = stub(db.session, "delete", async () => ({}));
  assert.equal(await validateSession(token), null);
  assert.equal(removed.mock.callCount(), 1);
});

test("validated sessions expose neither nested ciphertext nor password hashes", async () => {
  stub(db.session, "findUnique", async () => sessionFixture());
  stub(db.session, "update", async () => ({}));
  const result = await validateSession(token);
  assert.ok(result);
  assert.equal(result.user.email, "reporter@example.test");
  assert.equal("user" in result.session, false);
  assert.equal("hashedPassword" in result.user, false);
  assert.equal("encryptedEmail" in result.user, false);
});

test("regular users cannot obtain a staff login session", async () => {
  stub(db.user, "findUnique", async () => user);
  const created = stub(db.session, "create", () => { throw Error("Must not issue session"); });
  const result = await loginWithEmail({ email: "reporter@example.test", password: "Valid-Pass123", allowedRoles: ["ADMIN", "SUPERADMIN", "MODERATOR"] });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "forbidden");
  assert.equal(created.mock.callCount(), 0);
});

test("verified staff sign in with their original password and safe user fields", async () => {
  stub(db.user, "findUnique", async () => ({ ...user, role: "SUPERADMIN" }));
  stub(db.session, "create", async () => sessionFixture());
  const result = await loginWithEmail({ email: "reporter@example.test", password: "Valid-Pass123", allowedRoles: ["SUPERADMIN"] });
  assert.ok(result.ok);
  assert.equal(result.user.role, "SUPERADMIN");
  assert.match(result.cookieHeader, /HttpOnly/);
  assert.equal("hashedPassword" in result.user, false);
});

test("database failures return a useful login error without throwing", async () => {
  stub(db.user, "findUnique", async () => { throw Error("Database unavailable"); });
  mock.method(console, "error", () => undefined);
  const result = await loginWithEmail({ email: "reporter@example.test", password: "Valid-Pass123" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "unavailable");
});

test("unknown accounts have the same failed-attempt lockout as known accounts", async () => {
  stub(db.user, "findUnique", async () => null);
  const address = `missing-${crypto.randomUUID()}@example.test`;
  for (let i = 0; i < 5; i++) await loginWithEmail({ email: address, password: "wrong" });
  const result = await loginWithEmail({ email: address, password: "wrong" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "locked");
  const { hashForLookup } = await import("../lib/encryption");
  clearLoginAttempts(hashForLookup(address));
});

test("public signup is disabled by default and creates no account", async () => {
  delete process.env.PUBLIC_SIGNUP_ENABLED;
  const create = stub(db.user, "create", () => { throw Error("Unexpected account creation"); });
  const response = await authPost(new NextRequest("http://localhost/api/auth/signup", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      name: "Test Doctor", email: "doctor@example.test", phone: "01712345678",
      password: "Valid-Pass123", confirmPassword: "Valid-Pass123", teacherOrStudent: "DOCTOR",
      division: "Dhaka", district: "Dhaka", upazila: "Dhamrai", licenseNumber: "TEST-123", organizationName: "Test Clinic",
    }) }), { params: Promise.resolve({ all: ["signup"] }) });
  assert.equal(response.status, 503);
  assert.equal(create.mock.callCount(), 0);
});

test("API signup (when re-enabled) creates a verification token and preserves professional fields without issuing a session", async () => {
  process.env.PUBLIC_SIGNUP_ENABLED = "true";
  stub(db.user, "findUnique", async () => null);
  let created: Record<string, unknown> = {};
  stub(db.user, "create", async (args) => { created = (args as { data: Record<string, unknown> }).data; return { id: user.id }; });
  stub(db.auditLog, "create", async () => ({}));
  const sessions = stub(db.session, "create", () => { throw Error("Unexpected session"); });
  mock.method(console, "error", () => undefined);
  const request = new NextRequest("http://localhost/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    name: "Test Doctor", email: "doctor@example.test", phone: "01712345678",
    password: "Valid-Pass123", confirmPassword: "Valid-Pass123", teacherOrStudent: "DOCTOR",
    division: "Dhaka", district: "Dhaka", upazila: "Dhamrai", licenseNumber: "TEST-123", organizationName: "Test Clinic",
  }) });
  const response = await authPost(request, { params: Promise.resolve({ all: ["signup"] }) });
  assert.equal(response.status, 201);
  assert.equal(response.headers.has("Set-Cookie"), false);
  assert.equal((await response.json()).verificationRequired, true);
  assert.equal(created.emailVerified, false);
  assert.equal(created.role, "USER");
  assert.equal(created.licenseNumber, "TEST-123");
  assert.equal(created.organizationName, "Test Clinic");
  assert.ok(created.verificationTokens);
  assert.equal(sessions.mock.callCount(), 0);
  delete process.env.PUBLIC_SIGNUP_ENABLED;
});

test("API login preserves the unverified_email reason", async () => {
  stub(db.user, "findUnique", async () => ({ ...user, emailVerified: false }));
  const response = await authPost(new NextRequest("http://localhost/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "reporter@example.test", password: "Valid-Pass123" }),
  }), { params: Promise.resolve({ all: ["login"] }) });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).reason, "unverified_email");
  assert.equal(response.headers.has("Set-Cookie"), false);
});

test("valid email/password text is not rejected for SQL keywords", () => {
  assert.ok(loginSchema.safeParse({ email: "update@example.test", password: "Valid-UPDATE123!" }).success);
  const signup = signUpSchema.safeParse({ name: "Test User", email: "update@example.test", phone: "01712345678", password: "Valid-UPDATE123!", confirmPassword: "Valid-UPDATE123!", teacherOrStudent: "DOCTOR", division: "Dhaka", district: "Dhaka", upazila: "Dhamrai" });
  assert.ok(signup.success);
});

test("evidence URLs accept web links and reject non-web schemes", () => {
  const report = { category: "HARASSMENT_BULLYING", urgencyLevel: "LOW", description: "Please update the incident report." };
  assert.ok(incidentReportSchema.safeParse({ ...report, links: ["example.test/evidence"] }).success);
  for (const url of ["javascript:alert(1)", "data:text/html,test", "ftp://example.test/file"]) {
    assert.equal(incidentReportSchema.safeParse({ ...report, links: [url] }).success, false);
  }
});

test("upload signatures bind ownership and every encrypted-file attribute", () => {
  const metadata = { key: crypto.randomUUID(), fileIV: "11".repeat(16), fileTag: "22".repeat(16), encryptedOriginalName: "ciphertext", nameIV: "33".repeat(16), nameTag: "44".repeat(16), mimeType: "text/plain", fileSize: 5 };
  const file = { ...metadata, uploadToken: signUploadMetadata(metadata, user.id) };
  assert.ok(verifyUploadMetadata(file, user.id));
  assert.equal(verifyUploadMetadata(file, "someone-else"), false);
  assert.equal(verifyUploadMetadata({ ...file, mimeType: "text/html" }, user.id), false);
  assert.equal(verifyUploadMetadata({ ...file, fileSize: 1 }, user.id), false);
  assert.equal(verifyUploadMetadata({ ...file, uploadToken: "malformed" }, user.id), false);
});

test("upload signing works with the existing lookup pepper without an extra deployment secret", () => {
  const previousSecret = process.env.BETTER_AUTH_SECRET;
  delete process.env.BETTER_AUTH_SECRET;
  try {
    const metadata = { key: crypto.randomUUID(), fileIV: "11".repeat(16), fileTag: "22".repeat(16), encryptedOriginalName: "ciphertext", nameIV: "33".repeat(16), nameTag: "44".repeat(16), mimeType: "text/plain", fileSize: 5 };
    const file = { ...metadata, uploadToken: signUploadMetadata(metadata, user.id) };
    assert.ok(verifyUploadMetadata(file, user.id));
  } finally {
    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previousSecret;
  }
});

test("malformed multipart uploads return an error instead of crashing or hanging", async () => {
  authorizeUpload();
  const response = await uploadPost(uploadRequest("broken", "multipart/form-data"));
  assert.equal(response.status, 400);
});

test("valid uploads are encrypted and signed for the authenticated owner", async () => {
  authorizeUpload();
  let bytes: Buffer = Buffer.alloc(0);
  stub(db.fileBlob, "create", async (args) => { bytes = (args as { data: { data: Buffer } }).data.data; return { id: crypto.randomUUID() }; });
  const form = new FormData(); form.append("file", new Blob(["Private evidence"], { type: "text/plain" }), "evidence.txt");
  const response = await uploadPost(uploadRequest(form));
  assert.equal(response.status, 200);
  const file = (await response.json()).files[0];
  assert.ok(verifyUploadMetadata(file, user.id));
  assert.notEqual(bytes.toString(), "Private evidence");
  const cipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(process.env.ENCRYPTION_KEY!, "hex"), Buffer.from(file.fileIV, "hex"));
  cipher.setAuthTag(Buffer.from(file.fileTag, "hex"));
  assert.equal(Buffer.concat([cipher.update(bytes), cipher.final()]).toString(), "Private evidence");
});

test("a rejected mixed upload cleans up its successfully stored files", async () => {
  authorizeUpload();
  const id = crypto.randomUUID();
  stub(db.fileBlob, "create", async () => ({ id }));
  const cleanup = stub(db.fileBlob, "deleteMany", async () => ({ count: 1 }));
  const form = new FormData();
  form.append("file", new Blob(["Valid text"], { type: "text/plain" }), "valid.txt");
  form.append("file", new Blob(["bad"], { type: "text/plain" }), "blocked.php.txt");
  const response = await uploadPost(uploadRequest(form));
  assert.equal(response.status, 400);
  assert.equal(cleanup.mock.callCount(), 1);
});

test("truncated multipart bodies return an error", async () => {
  authorizeUpload();
  const response = await uploadPost(uploadRequest("broken", "multipart/form-data; boundary=expected"));
  assert.equal(response.status, 400);
});

test("empty files are rejected before storage", async () => {
  authorizeUpload();
  const writes = stub(db.fileBlob, "create", () => { throw Error("Unexpected write"); });
  const form = new FormData(); form.append("file", new Blob([], { type: "text/plain" }), "empty.txt");
  const response = await uploadPost(uploadRequest(form));
  assert.equal(response.status, 400);
  assert.equal(writes.mock.callCount(), 0);
});

test("oversized request headers are rejected before reading file data", async () => {
  authorizeUpload();
  const { MAX_UPLOAD_BYTES } = await import("../lib/upload-limits");
  const request = uploadRequest("placeholder", "multipart/form-data; boundary=expected");
  request.headers.set("content-length", String(MAX_UPLOAD_BYTES + 128 * 1024));
  assert.equal((await uploadPost(request)).status, 413);
});

test("additional-party evidence counts toward the storage quota", async () => {
  authorizeUpload();
  stub(db.additionalEvidenceFile, "aggregate", async () => ({ _sum: { fileSize: 5 * 1024 ** 3 } }));
  const response = await uploadPost(uploadRequest("placeholder", "multipart/form-data; boundary=expected"));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /quota/i);
});

test("middleware forwards the same CSP nonce to Next.js and the browser", async () => {
  const { middleware } = await import("../middleware");
  mock.method(console, "log", () => undefined);
  const response = await middleware(new NextRequest("http://localhost/api/health"));
  assert.equal(response.headers.get("Content-Security-Policy"), response.headers.get("x-middleware-request-content-security-policy"));
  assert.match(response.headers.get("Content-Security-Policy")!, /nonce-[A-Za-z0-9+/=]+/);
});
