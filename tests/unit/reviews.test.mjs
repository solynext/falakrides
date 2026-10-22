import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('retired reviews return 410 without loading a database or accepting submissions', async () => {
  const exports = {};
  const source = fs.readFileSync(new URL('../../src/app/api/reviews/route.ts', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText, {exports, Response, require() {throw Error('Retired reviews must not load dependencies');}});
  const response = await exports.POST();
  assert.equal(response.status, 410);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match((await response.json()).error, /no longer available/);
});