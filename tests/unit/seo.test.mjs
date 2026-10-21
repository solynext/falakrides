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

test("SEO origin skips invalid or local settings and uses the next production candidate",()=>{
  assert.equal(load({SITE_URL:"http://localhost:3000",VERCEL_PROJECT_PRODUCTION_URL:"production.example"}).siteOrigin(),"https://production.example");
  assert.equal(load({SITE_URL:"http://127.0.0.1:3000",NEXT_PUBLIC_SITE_URL:"https://public.example/path"}).siteOrigin(),"https://public.example");
  assert.equal(load({SITE_URL:"https://user:password@example.com",VERCEL_PROJECT_PRODUCTION_URL:"production.example"}).siteOrigin(),"https://production.example");
  assert.equal(load({SITE_URL:"not a hostname",NEXT_PUBLIC_SITE_URL:"http://[::1]:3000"}).siteOrigin(),"https://falak-ride.vercel.app");
});

test("an explicit production domain takes precedence over the Vercel hostname",()=>{
  assert.equal(load({SITE_URL:"https://www.example.com/route",VERCEL_PROJECT_PRODUCTION_URL:"project.vercel.app",VERCEL_URL:"preview.vercel.app"}).siteOrigin(),"https://www.example.com");
});

test("JSON-LD serialization remains parseable and escapes markup",()=>{
  const seo=load({});
  const output=seo.jsonLd({name:"Falak <Rides>"});
  assert.deepEqual(JSON.parse(output),{name:"Falak <Rides>"});
  assert.ok(!output.includes("<"));
});
