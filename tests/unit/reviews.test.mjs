import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';
import * as crypto from 'node:crypto';

function load(file, require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText, {exports, require, Request, Response, Buffer, process, console: {error() {}}});
  return exports;
}

function fixture({limited = false, unavailable = false} = {}) {
  const saved = [];
  const db = {
    feedback: {create: async ({data}) => {if (unavailable) throw Error('Database unavailable'); saved.push(data); return {id: 'review-id'};}},
    rateLimit: {upsert: async () => ({count: limited ? 6 : 1})},
  };
  const security = load('../../src/lib/security/http.ts', name => {
    if (name === 'node:crypto') return crypto;
    if (name === 'zod') return zod;
    if (name === './origins') return {trustedOrigins: () => ['https://example.test']};
    if (name === '@/lib/db') return {db};
    throw Error(`Unexpected import ${name}`);
  });
  const route = load('../../src/app/api/reviews/route.ts', name => {
    if (name === 'zod') return zod;
    if (name === '@/lib/db') return {db};
    if (name === '@/lib/security/http') return security;
    throw Error(`Unexpected import ${name}`);
  });
  const post = (data, origin = 'https://example.test') => route.POST(new Request('https://example.test/api/reviews', {
    method: 'POST', headers: {'Content-Type': 'application/json', origin}, body: JSON.stringify(data),
  }));
  return {post, saved};
}

test('visitor reviews are trimmed and saved for approval, never auto-published', async () => {
  const f = fixture();
  const response = await f.post({name: '  A traveller  ', rating: 4, message: '  My journey feedback.  '});
  assert.equal(response.status, 201);
  assert.equal(f.saved.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(f.saved[0])), {customer: 'A traveller', type: 'Review', rating: 4, message: 'My journey feedback.', status: 'Pending'});
  assert.match((await response.json()).message, /approval/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('invalid ratings, blank or oversized content, and publication overrides are rejected', async () => {
  const valid = {name: 'Traveller', rating: 5, message: 'My feedback'};
  for (const input of [
    {...valid, rating: 0}, {...valid, rating: 6}, {...valid, rating: 1.5}, {...valid, rating: '5'},
    {...valid, name: ' '}, {...valid, name: 'a'.repeat(81)}, {...valid, message: ' '},
    {...valid, message: 'a'.repeat(1501)}, {...valid, status: 'Approved'}, {...valid, type: 'Inquiry'},
  ]) {
    const f = fixture();
    assert.equal((await f.post(input)).status, 400);
    assert.equal(f.saved.length, 0);
  }
});

test('cross-origin review submissions are rejected before any review is stored', async () => {
  const f = fixture();
  assert.equal((await f.post({name: 'Traveller', rating: 5, message: 'Feedback'}, 'https://untrusted.test')).status, 403);
  assert.equal(f.saved.length, 0);
});

test('rate-limited reviews are rejected without saving', async () => {
  const f = fixture({limited: true});
  assert.equal((await f.post({name: 'Traveller', rating: 5, message: 'Feedback'})).status, 429);
  assert.equal(f.saved.length, 0);
});

test('database failures report failure instead of claiming a successful submission', async () => {
  const f = fixture({unavailable: true});
  const response = await f.post({name: 'Traveller', rating: 5, message: 'Feedback'});
  assert.equal(response.status, 500);
  assert.equal(f.saved.length, 0);
  assert.match((await response.json()).error, /try again/i);
});
