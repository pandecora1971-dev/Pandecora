-- Guest (no-login) reporting. Safe to re-run.
ALTER TABLE "Submission" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "trackingHash" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "encryptedGuestName" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "guestNameIV" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "guestNameTag" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "encryptedGuestContact" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "guestContactIV" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "guestContactTag" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "encryptedGuestInstitution" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "guestInstitutionIV" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "guestInstitutionTag" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "guestDivision" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "guestDistrict" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Submission_trackingHash_key" ON "Submission"("trackingHash");
CREATE INDEX IF NOT EXISTS "Submission_isGuest_idx" ON "Submission"("isGuest");
