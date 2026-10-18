import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(name, globals = {}) {
  const source = fs.readFileSync(new URL(`../../src/features/admin/${name}.ts`, import.meta.url), 'utf8');
  const context = {exports: {}, URL, URLSearchParams, ...globals};
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, context);
  return context.exports;
}
const {customerSheetExportUrl} = load('customer-sheet-link');
test('shared sheet URLs preserve the selected tab and use CSV export', () => {
  assert.equal(customerSheetExportUrl('https://docs.google.com/spreadsheets/d/abc-123/edit#gid=42'), 'https://docs.google.com/spreadsheets/d/abc-123/export?format=csv&gid=42');
  assert.equal(customerSheetExportUrl('https://docs.google.com/spreadsheets/u/0/d/abc/edit?gid=7'), 'https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=7');
  assert.equal(customerSheetExportUrl('https://docs.google.com/spreadsheets/d/abc/edit'), 'https://docs.google.com/spreadsheets/d/abc/export?format=csv');
});
test('published sheets use their published CSV endpoint', () => {
  assert.equal(customerSheetExportUrl('https://docs.google.com/spreadsheets/d/e/2PACX-abc/pubhtml?gid=12'), 'https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?output=csv&gid=12&single=true');
});
test('non-Google destinations, credentials, ports and invalid tabs are rejected', () => {
  for (const link of ['http://docs.google.com/spreadsheets/d/a/edit', 'https://evil.test/spreadsheets/d/a', 'https://docs.google.com.evil.test/spreadsheets/d/a', 'https://user@docs.google.com/spreadsheets/d/a', 'https://docs.google.com:8443/spreadsheets/d/a', 'https://docs.google.com/document/d/a', 'https://docs.google.com/spreadsheets/d/a/edit#gid=abc']) assert.throws(() => customerSheetExportUrl(link));
});
class HttpError extends Error {constructor(status, message) {super(message); this.status = status;}}
function fetcher(fetch) {
  return load('customer-sheet-server', {Buffer, AbortSignal, fetch, require(name) {
    if (name === './customer-import') return {CUSTOMER_FILE_LIMIT: 1024 * 1024};
    if (name === './customer-sheet-link') return {customerSheetExportUrl};
    if (name === '@/lib/security/http') return {HttpError};
    throw new Error(name);
  }}).fetchCustomerSheet;
}
test('download reads CSV and follows only Google download redirects', async () => {
  const calls = [];
  const fetchSheet = fetcher(async url => {calls.push(url); return calls.length === 1 ? new Response(null, {status: 302, headers: {location: 'https://doc-01-sheets.googleusercontent.com/export.csv'}}) : new Response('name\nJane', {headers: {'content-type': 'text/csv'}});});
  assert.equal(await fetchSheet('https://docs.google.com/spreadsheets/d/a/edit'), 'name\nJane');
  assert.equal(calls.length, 2);
});
test('private sheets and external redirects fail without fetching the redirect', async () => {
  let calls = 0;
  const fetchSheet = fetcher(async () => {calls++; return new Response(null, {status: 302, headers: {location: 'http://127.0.0.1/internal'}});});
  await assert.rejects(fetchSheet('https://docs.google.com/spreadsheets/d/a/edit'), /Cannot read/);
  assert.equal(calls, 1);
  await assert.rejects(fetcher(async () => new Response('<html>Login</html>', {headers: {'content-type': 'text/html'}}))('https://docs.google.com/spreadsheets/d/a/edit'), /Cannot read/);
});
test('oversized sheets fail before import', async () => {
  await assert.rejects(fetcher(async () => new Response('x'.repeat(1024 * 1024 + 1)))('https://docs.google.com/spreadsheets/d/a/edit'), /too large/);
});
