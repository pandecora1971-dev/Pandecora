# Authentication and upload reliability fixes

## Changes

- Unify account creation and require email verification before sign-in.
- Preserve professional registration fields and create verification tokens atomically.
- Apply staff role checks before issuing admin sessions, and share login limits across entry points.
- Reject malformed and unverified sessions, renew active session cookies, and handle unavailable authentication services gracefully.
- Forward CSP nonces to Next.js and retain security headers on redirects.
- Protect staff records from ordinary user-deletion actions and align download controls with existing permissions.
- Sign evidence metadata for the uploader, reject tampering and duplicate attachments, and include additional-party evidence in quotas.
- Handle malformed, truncated, oversized, and empty uploads with cleanup after rejected batches.
- Upload selected files individually and display the deployment's actual size limit: 4 MiB on Vercel or 20 MiB when self-hosted.
- Bundle Geist fonts locally, complete category/status labels, and correct profession labels.
- Fix Docker dependency/schema ordering and runtime startup.
- Add regression tests, strict linting, type checking, and a non-destructive SUPERADMIN enum patch.

## Deployment notes

Preserve the deployment's existing `ENCRYPTION_KEY` and `HASH_PEPPER`. Upload signing derives a separate key from the existing pepper; no additional signing secret is required.

Accounts retain their existing passwords. Invalid credentials require account recovery rather than changes to authentication validation.

If the SUPERADMIN role will be used against an existing database, run `npm run db:prepare:roles` with the target database configuration first. This adds an enum value without promoting accounts. Ordinary existing ADMIN and MODERATOR accounts continue to work without role reassignment.

Email verification requires a working email provider and the correct application URL. Evidence currently uses encrypted database blobs; large object-storage uploads and the draft-resume interface remain separate work.

## Validation

- Regression tests: `npm test`.
- Strict lint: `npm run lint`.
- Type checking: `npm run typecheck`.
- Database schema: `npx prisma validate`.
- Production compilation: `npm run build`.

The private operational review and account handoff document are excluded from Git and Docker context.
