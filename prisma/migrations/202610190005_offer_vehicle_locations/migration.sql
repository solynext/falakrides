ALTER TABLE "Offer"
ADD COLUMN "vehicleId" TEXT,
ADD COLUMN "image" TEXT NOT NULL DEFAULT '',
ADD COLUMN "pickup" TEXT NOT NULL DEFAULT '',
ADD COLUMN "destination" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "Offer" SET "pickup" = TRIM((regexp_split_to_array("route", '\s*(→|->)\s*'))[1]),
"destination" = TRIM((regexp_split_to_array("route", '\s*(→|->)\s*'))[2])
WHERE cardinality(regexp_split_to_array("route", '\s*(→|->)\s*')) = 2;
