import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
const source = fs.readFileSync(new URL("../../src/features/seo/route-fares.ts", import.meta.url), "utf8");
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {exports});
const {matchingRouteFares, fareLabel} = exports;
const catalog = {vehicles: [{id: "sedan"}], fares: [
  {route: "Jeddah Airport → Makkah", vehicleId: "sedan", fare: 200},
  {route: "Makkah → Jeddah Airport", vehicleId: "sedan", fare: 160},
  {route: "Makkah → Madinah", vehicleId: "sedan", fare: 350},
  {route: "Makkah → Madinah Airport", vehicleId: "sedan", fare: 500},
  {route: "Makkah → Madinah Ziyarat", vehicleId: "sedan", fare: 600},
  {route: "Makkah → Madinah", vehicleId: "removed", fare: 100},
]};

test("fares match exact endpoints and direction, excluding other trips and unavailable vehicles", () => {
  assert.deepEqual(Array.from(matchingRouteFares(catalog, "makkah", "madinah"), item => item.fare), [350]);
  assert.deepEqual(Array.from(matchingRouteFares(catalog, "jeddah airport", "makkah"), item => item.fare), [200]);
  assert.equal(matchingRouteFares(catalog, "madinah", "makkah").length, 0);
  assert.equal(matchingRouteFares(undefined, "makkah", "madinah").length, 0);
});

test("route matching accepts airport codes, city aliases, and imported separators", () => {
  for (const separator of ["→", "->", "\u00e2\u2020\u2019"]) {
    const data = {vehicles: [], fares: [{route: `Jeddah Airport (JED) ${separator} Mecca`, fare: 200}]};
    assert.equal(matchingRouteFares(data, "jeddah airport", "makkah").length, 1);
  }
});

test("price labels preserve SAR values and ranges, and never turn missing or invalid amounts into prices", () => {
  assert.equal(fareLabel(200, 200), "SAR 200");
  assert.equal(fareLabel(200, 280), "SAR 200–SAR 280");
  for (const value of [null, 0, -1, NaN, Infinity]) assert.equal(fareLabel(value), "Contact us for a quote");
});
