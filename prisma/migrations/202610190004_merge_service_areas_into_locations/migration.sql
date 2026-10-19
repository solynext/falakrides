BEGIN;
ALTER TABLE "Location"
ADD COLUMN "destinations" TEXT NOT NULL DEFAULT '',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN "contentIndex" INTEGER;
CREATE UNIQUE INDEX "Location_contentIndex_key" ON "Location"("contentIndex");

INSERT INTO "Location" ("id", "name", "image", "description", "zipCode", "destinations", "status", "contentIndex", "version", "createdAt", "updatedAt")
SELECT "id", "name", '/images/header-background.jpg', COALESCE(NULLIF("destinations", ''), "name"), '', "destinations", "status", "contentIndex", "version", "createdAt", "updatedAt"
FROM "ServiceArea"
ON CONFLICT ("name") DO UPDATE SET
  "destinations" = EXCLUDED."destinations",
  "status" = EXCLUDED."status",
  "contentIndex" = EXCLUDED."contentIndex",
  "description" = CASE WHEN "Location"."description" = '' THEN EXCLUDED."description" ELSE "Location"."description" END,
  "version" = "Location"."version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "ServiceArea" a LEFT JOIN "Location" l ON l."name" = a."name"
    WHERE l."id" IS NULL OR l."destinations" <> a."destinations" OR l."status" <> a."status" OR l."contentIndex" IS DISTINCT FROM a."contentIndex"
  ) THEN RAISE EXCEPTION 'Service area migration failed verification'; END IF;
END $$;

UPDATE "AuditLog" audit SET "resource" = 'locations', "recordId" = location."id"
FROM "ServiceArea" area JOIN "Location" location ON location."name" = area."name"
WHERE audit."resource" = 'areas' AND audit."recordId" = area."id";

DROP TABLE "ServiceArea";
COMMIT;
