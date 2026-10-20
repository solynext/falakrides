import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=fs.readFileSync(new URL("../../src/lib/seo.ts",import.meta.url),"utf8");
function load(env={}){
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({}),process:{env},URL});
  return exports;
}

test("SEO URLs use a secure configured production origin and canonicalize the duplicate airport slug",()=>{
  const seo=load({SITE_URL:"http://example.com/"});
  assert.equal(seo.absoluteUrl("/sitemap.xml"),"https://example.com/sitemap.xml");
  assert.equal(seo.publicPath("/locations/jeddah-airport-jed-b4dd7"),"/locations/jeddah-airport");
});

test("page metadata has absolute canonical, Open Graph and Twitter URLs",()=>{
  const seo=load({});
  const metadata=seo.pageMetadata({title:"Page",description:"Description",path:"/about",image:"/images/header-background.jpg"});
  assert.equal(metadata.alternates.canonical,"https://falak-ride.vercel.app/about");
  assert.equal(metadata.openGraph.url,"https://falak-ride.vercel.app/about");
  assert.equal(metadata.openGraph.images[0].url,"https://falak-ride.vercel.app/images/header-background.jpg");
  assert.equal(metadata.twitter.images[0],"https://falak-ride.vercel.app/images/header-background.jpg");
});

test("JSON-LD serialization remains parseable and escapes markup",()=>{
  const seo=load({});
  const output=seo.jsonLd({name:"Falak <Rides>"});
  assert.deepEqual(JSON.parse(output),{name:"Falak <Rides>"});
  assert.ok(!output.includes("<"));
});
