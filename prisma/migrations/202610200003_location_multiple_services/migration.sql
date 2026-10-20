ALTER TABLE "Location" ADD COLUMN "serviceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Location" SET "serviceIds" = ARRAY["serviceId"] WHERE "serviceId" <> '';
ALTER TABLE "Location" DROP COLUMN "serviceId";
