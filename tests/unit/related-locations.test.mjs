import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function render(locations) {
  const exports={};
  const source=fs.readFileSync(new URL("../../src/components/public/location-cards.tsx",import.meta.url),"utf8");
  const require=name=>{
    if(name==="react/jsx-runtime")return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
    if(name==="@/features/content/public-content")return {useSiteCatalog:()=>({locationCards:locations}),useWebsite:()=>({copy:{bookNow:"Book now"}})};
    if(name==="react")return {useState:value=>[value,()=>{}]};
    return {};
  };
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require});
  return exports.default({serviceId:"airport",serviceTitle:"Airport transfers",carousel:false});
}
test("Related Locations shows only locations linked to the opened service",()=>{
  const output=JSON.stringify(render([{id:"makkah",slug:"makkah-a1b2c",name:"Makkah",image:"",serviceIds:["airport","ziyarat"]},{id:"madinah",name:"Madinah",image:"",serviceIds:["ziyarat"]}]));
  assert.ok(output.includes("Related Locations"));assert.ok(output.includes("/locations/makkah-a1b2c"));assert.ok(!output.includes("Madinah"));
  assert.equal(output.split('"href":"/locations/makkah-a1b2c"').length-1,1);
  assert.ok(output.includes('"href":"/book-a-ride?pickup=Makkah"'));
  assert.ok(!output.includes("Pause scrolling locations"));
});
test("Related Locations is hidden when the service has no linked locations",()=>{
  assert.equal(render([]),null);
  assert.equal(render([{id:"madinah",name:"Madinah",serviceIds:["ziyarat"]}]),null);
});
