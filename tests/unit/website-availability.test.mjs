import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../../src/features/content/website-availability.ts", import.meta.url), "utf8");
const {outputText} = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}});
const {isPublicPage, websitePaused, availabilityValues, isSafePauseMedia, websiteAvailabilityResponse} = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));

test("only an explicit persisted boolean pauses the site", () => {
  assert.equal(websitePaused({paused: true}), true);
  for (const value of [null, undefined, {}, {paused: false}, {paused: "true"}, {paused: 1}]) assert.equal(websitePaused(value), false);
});

test("all public pages are blocked with an uncached 404 and resume immediately", async () => {
  let paused = false;
  const read = async () => ({paused});
  assert.equal(await websiteAvailabilityResponse("/", read), null);
  paused = true;
  for (const pathname of ["/", "/about", "/vehicles", "/services/airport", "/book-a-ride", "/dashboard", "/admin-example", "/apiary"]) {
    const response = await websiteAvailabilityResponse(pathname, read);
    assert.equal(response?.status, 404, pathname);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
    assert.match(await response.text(), /Page not found/);
  }
  paused = false;
  assert.equal(await websiteAvailabilityResponse("/vehicles", read), null);
});

test("admin, login, APIs and assets remain accessible without querying availability", async () => {
  for (const pathname of ["/admin", "/admin/website-content", "/login", "/login/", "/register", "/forgot-password", "/api/password-reset/request", "/api/auth/sign-in/email", "/api/admin/developer-mode", "/_next/static/app.js", "/images/car.webp", "/fonts/inter.ttf", "/favicon.ico", "/robots.txt", "/sitemap.xml"]) {
    assert.equal(isPublicPage(pathname), false, pathname);
    assert.equal(await websiteAvailabilityResponse(pathname, async () => {throw new Error("Recovery routes must not query the pause flag");}), null);
  }
});


test("existing pause records use empty media selections", () => {
  assert.deepEqual(availabilityValues({paused:true}), {paused:true,messageEnabled:false,image:"",audio:""});
  assert.deepEqual(availabilityValues(null), {paused:false,messageEnabled:false,image:"",audio:""});
});

test("media mode renders a full-screen image, looping audio and no message text", async () => {
  const state={paused:false,messageEnabled:true,image:"https://res.cloudinary.com/demo/image/upload/scene.jpg",audio:"https://res.cloudinary.com/demo/video/upload/sound.mp3"};
  const response=await websiteAvailabilityResponse("/vehicles",async()=>state);
  assert.equal(response.status,404);
  assert.equal(response.headers.get("cache-control"),"no-store");
  const html=await response.text();
  assert.match(html,/object-fit:cover/);
  assert.match(html,/<img src="https:/);
  assert.match(html,/autoplay loop/);
  assert.match(html,/id="play-sound"/);
  assert.match(html,/top:50%;left:50%/);
  assert.match(html,/button.hidden=true/);
  assert.equal(html.includes(" controls"),false);
  assert.equal(html.includes("audio.pause("),false);
  assert.equal(html.includes('<h1>'),false);
  assert.equal(html.includes('<p>'),false);
  assert.equal(html.includes('Page not found'),false);
});

test("media URLs reject unsafe sources and escape attribute content", async () => {
  for(const value of ['javascript:alert(1)','data:image/svg+xml,test','//evil.test/a.jpg','http://example.com/a.jpg','/images/../secret'])assert.equal(isSafePauseMedia(value,'image'),false);
  assert.equal(isSafePauseMedia('https://example.com/audio.mp3','audio'),true);
  assert.equal(isSafePauseMedia('https://example.com/audio.exe','audio'),false);
  const response=await websiteAvailabilityResponse('/',async()=>({paused:false,messageEnabled:true,image:'https://example.com/a.jpg?x="<tag>'}));
  const html=await response.text();assert.match(html,/&quot;&lt;tag&gt;/);assert.equal(html.includes('<tag>'),false);
});

test("media mode can be disabled or switched back to standard 404", async () => {
  const state={paused:false,messageEnabled:true,image:"/images/background.jpg",audio:""};
  assert.equal((await websiteAvailabilityResponse("/",async()=>state)).status,404);
  state.messageEnabled=false;
  assert.equal(await websiteAvailabilityResponse("/",async()=>state),null);
  state.paused=true;
  assert.match(await (await websiteAvailabilityResponse("/",async()=>state)).text(),/Page not found/);
  state.messageEnabled=true;
  assert.equal(await websiteAvailabilityResponse("/admin/website-content",async()=>state),null);
});
