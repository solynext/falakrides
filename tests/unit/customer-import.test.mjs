import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../../src/features/admin/customer-import.ts', import.meta.url), 'utf8');
const context = {exports: {}};
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, context);
const {parseCustomerCsv} = context.exports;

test('Google Sheets CSV supports BOM, reordered headings, multiline cells and escaped quotes', () => {
  const rows = parseCustomerCsv('\uFEFFEmail,name,notes,phone\r\nTEST@example.com,"Doe, Jane","Line one\nSays ""hello""",+966501234567\r\n');
  assert.equal(rows[0].name, 'Doe, Jane');
  assert.equal(rows[0].email, 'test@example.com');
  assert.equal(rows[0].notes, 'Line one\nSays "hello"');
  assert.equal(rows[0].phone, '+966501234567');
});
test('optional fields and empty lines are accepted', () => {
  const rows = parseCustomerCsv('name\n\nJane\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].phone, '');
});
test('malformed spreadsheets and invalid contacts are rejected', () => {
  for (const csv of ['email\na@b.com', 'name,name\nA,B', 'name\n"Unclosed', 'name\nA,B', 'name,email\nJane,invalid', 'name,phone\nJane,123', 'name,email\n,a@b.com', 'name\n']) assert.throws(() => parseCustomerCsv(csv));
});
test('import is bounded to 500 customer rows', () => {
  assert.equal(parseCustomerCsv('name\n' + 'Jane\n'.repeat(500)).length, 500);
  assert.throws(() => parseCustomerCsv('name\n' + 'Jane\n'.repeat(501)), /at most 500/);
});
