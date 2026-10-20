import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function fixture(record,services=[]) {
  const exports={};const queries=[];
  const source=fs.readFileSync(new URL("../../src/app/(public)/locations/[id]/page.tsx",import.meta.url),"utf8");
  const require=name=>{
    if(name==="react")return {cache:fn=>fn};
    if(name==="react/jsx-runtime")return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
    if(name==="@/lib/db")return {db:{location:{findFirst:async({where})=>{queries.push(where);return record&&where.OR.some(match=>match.id===record.id||match.slug!==undefined&&match.slug===record.slug)&&record.status===where.status?record:null;}}}};
    if(name==="next/navigation")return {permanentRedirect:url=>{throw Object.assign(new Error("Redirect"),{url});},notFound:()=>{throw Object.assign(new Error("Not found"),{status:404});}};
    if(name==="@/features/content/store")return {readContent:async()=>({published:{}})};
    if(name==="@/features/content/website-model")return {websiteFromValues:()=>({services,copy:{bookNow:"Book now",learnMore:"Learn more"}})};
    if(name==="@/utils/images")return {photo:value=>value};
    if(name==="@/lib/seo")return {absoluteImageUrl:value=>value,absoluteUrl:value=>`https://falak-ride.vercel.app${value}`,pageMetadata:value=>value};
    return {};
  };
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require});
  return {exports,queries};
}
test("location metadata resolves its own active location",async()=>{
  const f=fixture({id:"makkah",name:"Makkah",description:"Private hotel transfers.",status:"Active"});
  const metadata=await f.exports.generateMetadata({params:Promise.resolve({id:"makkah"})});
  assert.equal(metadata.title,"Makkah Private Taxi | Falak Rides");assert.equal(metadata.description,"Private hotel transfers.");
  assert.equal(f.queries[0].OR[0].slug,"makkah");assert.equal(f.queries[0].status,"Active");
});
test("name-based location URLs resolve and old ID links redirect",async()=>{
  const f=fixture({id:"old-id",slug:"makkah-a1b2c",name:"Makkah",description:"Transfers",status:"Active"});
  const metadata=await f.exports.generateMetadata({params:Promise.resolve({id:"makkah-a1b2c"})});
  assert.equal(metadata.title,"Makkah Private Taxi | Falak Rides");
  await assert.rejects(f.exports.generateMetadata({params:Promise.resolve({id:"old-id"})}),{url:"/locations/makkah-a1b2c"});
});
test("Related Service shows only the published services selected for this location",async()=>{
  const f=fixture({id:"makkah",name:"Makkah",status:"Active",description:"Transfers",image:"",destinations:"",serviceIds:["selected","draft"]},[
    {id:"selected",slug:"selected-service",title:"Selected service",visible:true,image:""},
    {id:"other",slug:"unrelated-service",title:"Unrelated service",visible:true,image:""},
    {id:"draft",slug:"draft-service",title:"Draft service",visible:false,image:""},
  ]);
  const page=await f.exports.default({params:Promise.resolve({id:"makkah"})});
  const output=JSON.stringify(page);
  assert.ok(output.includes("Related Service"));
  assert.ok(output.includes("/services/selected-service"));
  assert.ok(!output.includes("Unrelated service"));
  assert.ok(!output.includes("Draft service"));
});
test("duplicate Jeddah Airport public slug redirects without changing or querying either record",async()=>{
  const f=fixture({id:"kept-duplicate-record",slug:"jeddah-airport-jed-b4dd7",name:"Jeddah Airport",description:"Jeddah Airport",status:"Active"});
  await assert.rejects(f.exports.generateMetadata({params:Promise.resolve({id:"jeddah-airport-jed-b4dd7"})}),{url:"/locations/jeddah-airport"});
  assert.equal(f.queries.length,0);
});
test("missing, draft and inactive locations cannot open public detail pages",async()=>{
  for(const status of ["Draft","Inactive",undefined]) {
    const f=fixture(status?{id:"makkah",status}:null);
    const props={params:Promise.resolve({id:"makkah"})};
    await assert.rejects(f.exports.generateMetadata(props),{status:404});
    await assert.rejects(f.exports.default(props),{status:404});
  }
});
