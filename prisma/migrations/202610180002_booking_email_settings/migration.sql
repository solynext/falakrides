ALTER TABLE "SiteSettings"
  ADD COLUMN "bookingsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "bookingNoticeMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bookingConfirmationEmails" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "passwordChangeEmails" BOOLEAN NOT NULL DEFAULT true;
