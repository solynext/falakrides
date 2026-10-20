import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const exports={};
const source=fs.readFileSync(new URL("../../src/features/admin/routes.ts",import.meta.url),"utf8");
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});
const {adminRoutes,adminSectionPath,adminSectionFromPath,adminLegacyRoutes,adminLegacyRedirect}=exports;
test("every admin section has a unique URL that resolves to the same section",()=>{
 const paths=Object.keys(adminRoutes).map(adminSectionPath);
 assert.equal(new Set(paths).size,paths.length);
 for(const key of Object.keys(adminRoutes)){
   assert.equal(adminSectionFromPath(adminSectionPath(key)),key);
   assert.equal(adminSectionFromPath(adminSectionPath(key)+"/"),key);
 }
 assert.equal(adminSectionPath("content"),"/admin/website-content");
 assert.equal(adminSectionPath("fares"),"/admin/price-and-routes");
 assert.equal(adminSectionPath("offers"),"/admin/offers-and-packages");
 assert.equal(adminSectionPath("feedback"),"/admin/feedback");
 assert.equal(adminSectionPath("roles"),"/admin/team-and-roles");
});

test("old section links redirect to their matching canonical page without loops",()=>{
 for(const [slug,section] of Object.entries(adminLegacyRoutes)) {
   const destination=adminLegacyRedirect(slug);
   assert.equal(destination,adminSectionPath(section));
   assert.equal(adminSectionFromPath(destination),section);
   assert.notEqual(destination,`/admin/${slug}`);
 }
 for(const slug of [...Object.values(adminRoutes),'__proto__','unknown'])assert.equal(adminLegacyRedirect(slug),undefined);
});
test("legacy admin root opens dashboard and unknown URLs are rejected",()=>{
 assert.equal(adminSectionFromPath("/admin/services"),"services");
 assert.equal(adminSectionFromPath("/admin/services/"),"services");
 assert.equal(adminSectionFromPath("/admin"),"overview");
 assert.equal(adminSectionFromPath("/admin/"),"overview");
 for(const path of ["/admin/unknown","/admin/bookings/extra","/website-content","/admin/__proto__"])assert.equal(adminSectionFromPath(path),undefined);
});
