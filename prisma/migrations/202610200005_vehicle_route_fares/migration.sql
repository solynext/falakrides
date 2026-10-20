CREATE UNIQUE INDEX "Fare_route_vehicleId_key" ON "Fare"("route", "vehicleId");
DROP INDEX "Fare_route_key";
