import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../../src/features/content/", import.meta.url));
const cache = new Map();
function load(file) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const source = fs.readFileSync(filename, "utf8");
  if (filename.endsWith(".json")) {const json={default:JSON.parse(source)};cache.set(filename,json);return json;}
  const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(output, {exports, require: name => load(path.resolve(path.dirname(filename), name.endsWith(".json") ? name : name + ".ts"))});
  return exports;
}
const {contentFields} = load("fields.ts");
const {changedFields, fieldValue} = load("editor-utils.ts");
const {validateValues} = load("validation.ts");
const {editorSections, sectionContains} = load("editor-sections.ts");

test("combined navigation assigns every original section to exactly one group", () => {
  assert.ok(editorSections.length >= 10);
  for (const field of contentFields) {
    assert.equal(editorSections.filter(group => sectionContains(group.id, field.section)).length, 1, field.section);
    assert.equal(sectionContains("all", field.section), true);
  }
});

test("group selection includes related fields and excludes unrelated fields", () => {
  for (const section of ["fleet", "Vehicles"]) assert.equal(sectionContains("vehicles", section), true);
  for (const section of ["contact", "whatsapp-title", "whatsapp-chat", "whatsapp-description"]) assert.equal(sectionContains("contact", section), true);
  assert.equal(sectionContains("contact", "booking"), false);
  assert.equal(sectionContains("unknown", "booking"), false);
});

test("explicit default values and key order do not create false publish changes", () => {
  const field = contentFields[0];
  assert.equal(fieldValue(field, {}), field.value);
  assert.equal(changedFields({[field.id]: field.value}, {}).length, 0);
  const a = contentFields[0].id, b = contentFields[1].id;
  assert.equal(changedFields({[a]: "First", [b]: "Second"}, {[b]: "Second", [a]: "First"}).length, 0);
});

test("removing a live override appears in the publish review as a restored default", () => {
  const field = contentFields[0];
  const changes = changedFields({}, {[field.id]: "Published override"});
  assert.equal(changes.length, 1);
  assert.equal(changes[0].id, field.id);
  assert.equal(fieldValue(changes[0], {}), field.value);
  assert.equal(fieldValue(field, {[field.id]: ""}), "");
});

test("draft validation rejects invalid fields even outside the visible section", () => {
  assert.throws(() => validateValues({"contact.email": "invalid"}), /valid email/);
  assert.throws(() => validateValues({unknown: "Value"}), /Invalid content field/);
  const image = contentFields.find(field => field.kind === "image");
  assert.throws(() => validateValues({[image.id]: "javascript:alert(1)"}), /Unsplash/);
  assert.equal(validateValues({"contact.email": "hello@example.com"})["contact.email"], "hello@example.com");
});

const {defaultWebsite,websiteField,parseWebsite,websiteFromValues,websiteChanges,isSafePublicImage}=load("website-model.ts");
const website=()=>JSON.parse(JSON.stringify(defaultWebsite));
test("current public data is registered with the existing draft and publish editor",()=>{
  assert.equal(contentFields.find(field=>field.id==="public.website").kind,"website");
  assert.equal(parseWebsite(websiteField.value).services.length,3);
  assert.equal(parseWebsite(websiteField.value).vehicles.length,4);
  assert.equal(websiteFromValues({}).faqs.length,6);
  assert.equal(validateValues({"public.website":websiteField.value})["public.website"],websiteField.value);
});
test("website validation rejects unsafe image references, duplicate slugs, unknown sections and malformed records",()=>{
  for(const image of ["javascript:alert(1)","/images/../private.png","https://untrusted.example/car.jpg"]){const d=website();d.slides[0].image=image;assert.throws(()=>parseWebsite(JSON.stringify(d)),/image/i);}
  const d=website();d.services.push({...d.services[0],id:"other"});assert.throws(()=>parseWebsite(JSON.stringify(d)),/unique/i);
  const bad=website();bad.homeSections[0].key="unknown";assert.throws(()=>parseWebsite(JSON.stringify(bad)),/section/i);
  const nested=website();nested.services[0].sections[0].items=[{}];assert.throws(()=>parseWebsite(JSON.stringify(nested)),/destinations/i);
  const nav=website();nav.copy.navHome="";assert.throws(()=>parseWebsite(JSON.stringify(nav)),/Home link/i);
  assert.equal(isSafePublicImage("/images/reference/camry.jpg"),true);
  assert.equal(isSafePublicImage("photo-1565552645632-d725f8bfc19a"),true);
});
test("publish review identifies additions, removals, edits, visibility changes and order changes",()=>{
  const d=website();d.slides[0].title="New public heading";d.faqs[0].visible=false;d.vehicles.pop();d.services.push({...d.services[0],id:"new-service",slug:"new-service"});d.itineraries.reverse();d.copy.footerTitle="Updated footer";
  const changes=websiteChanges(websiteField.value,JSON.stringify(d));
  assert.ok(changes.some(value=>value.includes("Updated slides")));
  assert.ok(changes.some(value=>value.includes("Updated faqs")));
  assert.ok(changes.some(value=>value.includes("Removed vehicles")));
  assert.ok(changes.some(value=>value.includes("Added services")));
  assert.ok(changes.some(value=>value.includes("Reordered itineraries")));
  assert.ok(changes.some(value=>value.includes("Footer: Heading")));
});
test("draft editing retains temporarily incomplete fields until save validation",()=>{
  const d=website();d.slides[0].title="";const values={"public.website":JSON.stringify(d)};
  assert.equal(websiteFromValues(values,true).slides[0].title,"");
  assert.throws(()=>validateValues(values),/slide title/i);
});


test("Cloudinary references are accepted without allowing arbitrary hosts or insecure URLs",()=>{
 const url="https://res.cloudinary.com/falakrides/image/upload/v123/website/hero.webp";
 assert.equal(isSafePublicImage(url),true);
 assert.equal(validateValues({"layout.bannerImage":url})["layout.bannerImage"],url);
 const data=website();data.slides[0].image=url;assert.doesNotThrow(()=>parseWebsite(JSON.stringify(data)));
 for(const bad of ["http://res.cloudinary.com/cloud/image/upload/x.png","https://evil.example/x.png","https://res.cloudinary.com/cloud/raw/upload/x.html","https://res.cloudinary.com/cloud/image/upload/../x.png"]){assert.equal(isSafePublicImage(bad),false,bad);}
});

test("uploads identify supported image signatures and reject text and SVG",()=>{
 const {imageMimeType,MAX_CONTENT_IMAGE_BYTES}=load("image-upload.ts");
 assert.equal(MAX_CONTENT_IMAGE_BYTES,8*1024*1024);
 assert.equal(imageMimeType(Uint8Array.from([0xff,0xd8,0xff])),"image/jpeg");
 assert.equal(imageMimeType(Uint8Array.from([0x89,0x50,0x4e,0x47,13,10,26,10])),"image/png");
 assert.equal(imageMimeType(Uint8Array.from([..."GIF89a"].map(c=>c.charCodeAt(0)))),"image/gif");
 for(const input of ["<svg></svg>","not an image",""]){assert.equal(imageMimeType(Uint8Array.from([...input].map(c=>c.charCodeAt(0)))),null);}
});

test("snapshot includes the live page inventory, structured content and all editable field values",()=>{
 const snapshot=JSON.parse(fs.readFileSync(new URL("../../data/public-website.snapshot.json",import.meta.url),"utf8"));
 assert.equal(snapshot.pages.length,21);
 for(const page of ["/","/about","/contact","/privacy","/terms","/services/airport-transfers","/packages/staria"])assert.ok(snapshot.pages.includes(page),page);
 assert.ok(snapshot.assets.length>10);
 assert.doesNotThrow(()=>parseWebsite(JSON.stringify(snapshot.website)));
 assert.doesNotThrow(()=>validateValues({...snapshot.values,"public.website":JSON.stringify(snapshot.website)}));
 const {editableContentFields}=load("fields.ts");
 for(const field of editableContentFields)if(field.id!=="public.website")assert.equal(typeof snapshot.values[field.id],"string",field.id);
});

test("page navigation assigns each editable field and copy field once without operational collections",()=>{
 const {contentPages}=load("page-navigation.ts");
 const {editableContentFields}=load("fields.ts");
 const {websiteCopyFields}=load("website-model.ts");
 const sections=contentPages.flatMap(page=>page.sections);
 for(const page of contentPages)assert.ok(page.sections.length,page.id);
 for(const field of editableContentFields.filter(field=>field.kind!=="website"))assert.equal(sections.filter(section=>section.fields.includes(field.id)).length,1,field.id);
 for(const field of websiteCopyFields)assert.equal(sections.filter(section=>section.copy.includes(field.key)).length,field.key.startsWith("reviews")?0:1,field.key);
 assert.ok(sections.every(section=>section.label!=="Reviews"));
 assert.ok(sections.every(section=>!section.collection||["slides","faqs","gallery"].includes(section.collection)));
 assert.ok(sections.every(section=>section.collection!=="services"));
 assert.equal(contentPages.find(page=>page.id==="home").sections[0].collection,"slides");
 assert.ok(contentPages.find(page=>page.id==="contact").sections.some(section=>section.fields.includes("ui.contact.1")));
});

test("removed images remain empty through validation and website parsing",()=>{
 const image=contentFields.find(field=>field.kind==="image");
 assert.equal(validateValues({[image.id]:""})[image.id],"");
 const data=website();
 data.slides[0].image="";
 data.services[0].image="";
 data.vehicles[0].image="";
 data.copy.introImage="";
 data.copy.whyImage="";
 data.copy.calloutImage="";
 data.copy.faqImage="";
 const raw=JSON.stringify(data);
 const parsed=parseWebsite(raw);
 assert.equal(parsed.slides[0].image,"");
 assert.equal(parsed.copy.introImage,"");
 assert.equal(validateValues({"public.website":raw})["public.website"],raw);
 assert.ok(websiteChanges(websiteField.value,raw).some(change=>change.includes("Introduction: Introduction image")));
});
