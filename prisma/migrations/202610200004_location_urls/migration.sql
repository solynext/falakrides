ALTER TABLE "Location" ADD COLUMN "slug" TEXT;
UPDATE "Location" SET "slug" = COALESCE(NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''), 'location') || '-' || substring(md5(random()::text || "id"), 1, 5);
ALTER TABLE "Location" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
