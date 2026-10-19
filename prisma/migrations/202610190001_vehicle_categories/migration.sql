CREATE TABLE "VehicleCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleCategory_name_key" ON "VehicleCategory"("name");
CREATE UNIQUE INDEX "VehicleCategory_name_case_insensitive_key" ON "VehicleCategory"(LOWER("name"));
INSERT INTO "VehicleCategory" ("id", "name")
SELECT 'category-' || md5(LOWER(TRIM("category"))), MIN(TRIM("category"))
FROM "Vehicle" WHERE TRIM("category") <> '' GROUP BY LOWER(TRIM("category"));
