ALTER TABLE "Fare" ADD COLUMN "maxFare" INTEGER,
ADD COLUMN "vehicleId" TEXT;
UPDATE "Fare" SET "maxFare" = "fare" WHERE "fare" IS NOT NULL;
ALTER TABLE "Fare" ADD CONSTRAINT "Fare_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Fare" ADD CONSTRAINT "Fare_price_range_check"
CHECK (("fare" IS NULL OR "fare" >= 0) AND ("maxFare" IS NULL OR ("fare" IS NOT NULL AND "maxFare" >= "fare")));
