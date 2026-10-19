import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function fixture(file,user=null,allowed=true) {
  const snapshots=[];
  const code=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const context={exports:{},require:name=>{
    if(name==="react/jsx-runtime")return {jsx:(type,props)=>({type,props})};
    if(name==="next/navigation")return {redirect:path=>{throw Error(`REDIRECT:${path}`);},notFound:()=>{throw Error("NOT_FOUND");}};
    if(name==="@/lib/auth")return {currentAdmin:async()=>user,canAccess:()=>allowed};
    if(name==="@/features/admin/components/admin-app")return {default:()=>null};
    if(name==="@/features/admin/server")return {adminSnapshot:async user=>{snapshots.push(user);return {data:{}};}};
    if(name==="@/features/admin/routes")return {adminLegacyRedirect:slug=>["fares","offers","reviews","team"].includes(slug)?`/admin/${{fares:"price-and-routes",offers:"offers-and-packages",reviews:"feedback",team:"team-and-roles"}[slug]}`:undefined,adminSectionFromPath:path=>path==="/admin/offers-and-packages"?"offers":undefined};
    throw Error(name);
  }};
  vm.runInNewContext(code,context);
  return {snapshots,page:context.exports.default};
}
for(const file of ["../../src/app/admin/page.tsx","../../src/app/admin/[section]/page.tsx"]) {
  test(`${file}: missing sessions redirect to Login before reading admin data`,async()=>{
    const f=fixture(file);
    await assert.rejects(f.page({params:Promise.resolve({section:"offers-and-packages"})}),/REDIRECT:\/login/);
    assert.equal(f.snapshots.length,0);
  });
  test(`${file}: active administrators can load their workspace`,async()=>{
    const user={id:"admin",role:"Administrator"},f=fixture(file,user);
    await f.page({params:Promise.resolve({section:"offers-and-packages"})});assert.equal(f.snapshots[0],user);
  });
}
test("admin sections deny unavailable modules before loading private data",async()=>{
  const f=fixture("../../src/app/admin/[section]/page.tsx",{id:"viewer",role:"Viewer"},false);
  await assert.rejects(f.page({params:Promise.resolve({section:"offers-and-packages"})}),/NOT_FOUND/);assert.equal(f.snapshots.length,0);
});
