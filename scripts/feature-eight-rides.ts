import {config} from "dotenv";
import assert from "node:assert/strict";

config({path: ".env.local", quiet: true});
config({quiet: true});

async function main() {
  const {db} = await import("../src/lib/db");
  try {
    const result = await db.$transaction(async tx => {
      const fares = await tx.fare.findMany({
        where: {status: "Active", vehicle: {status: {not: "Maintenance"}}},
        include: {vehicle: true},
        orderBy: [{featured: "desc"}, {createdAt: "asc"}, {id: "asc"}],
      });
      assert.ok(fares.length >= 8, "At least eight active vehicle fares are required.");
      const selected = fares.filter(fare => fare.featured).slice(0, 8);
      // Keep the existing featured rides, then balance additions across vehicles.
      while (selected.length < 8) {
        const candidates = fares.filter(fare => !selected.some(item => item.id === fare.id));
        candidates.sort((a, b) =>
          selected.filter(item => item.vehicleId === a.vehicleId).length -
          selected.filter(item => item.vehicleId === b.vehicleId).length);
        selected.push(candidates[0]);
      }
      const ids = selected.map(fare => fare.id);
      if (process.argv.includes("--apply")) {
        await tx.fare.updateMany({where: {featured: true, id: {notIn: ids}}, data: {featured: false, version: {increment: 1}}});
        await tx.fare.updateMany({where: {id: {in: ids}, featured: false}, data: {featured: true, version: {increment: 1}}});
        await tx.siteContent.update({where: {id: "main"}, data: {publishedAt: new Date()}});
        await tx.auditLog.create({data: {action: "select-eight-featured-rides", resource: "fares", recordId: ids.join(",")}});
        const saved = await tx.fare.findMany({where: {featured: true}, select: {id: true}});
        assert.equal(saved.length, 8);
        assert.deepEqual(new Set(saved.map(fare => fare.id)), new Set(ids));
      }
      return selected.map(fare => ({vehicle: fare.vehicle?.name, route: fare.route, priceSAR: fare.fare === null ? null : fare.fare / 100}));
    });
    console.log(JSON.stringify({applied: process.argv.includes("--apply"), count: result.length, rides: result}, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {console.error(error); process.exitCode = 1;});
