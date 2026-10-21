import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, imports) {
  const exports = {};
  const source = fs.readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText,
    {exports, require: name => imports[name], console: {error() {}}});
  return exports.default;
}
const imports = {
  "@/lib/seo": {absoluteUrl: path => `https://canonical.example${path}`, publicPath: path => path},
  "@/features/seo/travel-guides": {travelGuides: [{slug: "pickup-guide"}]},
  "@/features/content/website-model": {websiteFromValues: () => ({services: [{slug: "airport-transfers", visible: true}, {slug: "hidden", visible: false}], vehicles: [{slug: "sedan", visible: true}]})},
};

test("robots allows public crawling and points to the canonical sitemap", () => {
  const output = load("app/robots.ts", imports)();
  assert.equal(output.rules.allow, "/");
  assert.ok(!output.rules.disallow.includes("/"));
  assert.ok(output.rules.disallow.includes("/admin"));
  assert.equal(output.sitemap, "https://canonical.example/sitemap.xml");
});

test("sitemap contains priority routes and published pages on one canonical domain", async () => {
  const sitemap = load("app/sitemap.ts", {...imports,
    "@/features/content/store": {readContent: async () => ({published: {}, catalog: {locationCards: [{slug: "makkah"}]}})},
  });
  const urls = Array.from(await sitemap(), item => item.url);
  for (const path of ["/jeddah-airport-to-makkah-taxi", "/makkah-to-madinah-taxi", "/services/airport-transfers", "/packages/sedan", "/locations/makkah"]) {
    assert.ok(urls.includes(`https://canonical.example${path}`), path);
  }
  assert.ok(urls.every(url => url.startsWith("https://canonical.example/")));
  assert.ok(!urls.some(url => /\/hidden|\/admin|\/api\//.test(url)));
});

test("sitemap retains route landing pages if the catalog cannot be loaded", async () => {
  const sitemap = load("app/sitemap.ts", {...imports,
    "@/features/content/store": {readContent: async () => {throw new Error("Database unavailable");}},
  });
  const urls = Array.from(await sitemap(), item => item.url);
  assert.ok(urls.includes("https://canonical.example/jeddah-airport-to-makkah-taxi"));
  assert.ok(urls.includes("https://canonical.example/makkah-to-madinah-taxi"));
});
