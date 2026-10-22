import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';
import * as crypto from 'node:crypto';

function load(path, require = () => {throw Error('Unexpected import');}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText, {exports, require, Date});
  return exports;
}
const {modules} = load('../../src/features/admin/data/modules.ts');
function fixture() {
  const writes = [], queries = [];
  const db = {
    feedback: {
      findMany: async args => {queries.push(args); return [];},
      create: async ({data}) => {writes.push(data); return {...data, id:'feedback-1', version:1};},
    },
    noticeState: {findMany: async () => []},
    user: {findUniqueOrThrow: async () => ({name:'Administrator'})},
    auditLog: {create: async () => {}},
    siteContent: {findUniqueOrThrow: async () => ({version:1}), update: async () => {}},
    $transaction: async action => action(db),
  };
  const service = load('../../src/features/admin/server.ts', name => {
    if (name === 'zod') return zod;
    if (name === 'node:crypto') return crypto;
    if (name === '@/lib/db') return {db};
    if (name === './data/modules') return {modules};
    if (name === '@/lib/auth') return {canAccess: (_role,key) => key === 'feedback'};
    if (name === '@/lib/security/http') return {HttpError: class extends Error {constructor(status,message){super(message);this.status=status;}}};
    return {};
  });
  return {service, writes, queries};
}
const admin = {id:'admin', role:'Administrator'};

test('admin feedback contains inquiries and complaints without rating or review moderation controls', () => {
  const definition = modules.feedback;
  assert.equal(definition.fields.some(field => field.key === 'rating'), false);
  assert.equal(definition.columns.includes('rating'), false);
  assert.deepEqual(Array.from(definition.fields.find(field => field.key === 'type').options), ['Inquiry','Complaint']);
  assert.deepEqual(Array.from(definition.fields.find(field => field.key === 'status').options), ['Pending','Resolved']);
});

test('inquiries and complaints save without a rating; reviews are rejected without writing', async () => {
  const f = fixture();
  for (const type of ['Inquiry','Complaint']) {
    await f.service.writeRecord('feedback', {customer:'Traveller', type, message:'Please help with my journey.', status:'Pending'}, admin);
    assert.equal(f.writes.at(-1).rating, null);
  }
  await assert.rejects(f.service.writeRecord('feedback', {customer:'Traveller', type:'Review', message:'Old review', status:'Pending'}, admin));
  assert.equal(f.writes.length, 2);
});

test('admin snapshot excludes historical reviews without deleting stored records', async () => {
  const f = fixture();
  await f.service.adminSnapshot(admin);
  assert.deepEqual(JSON.parse(JSON.stringify(f.queries[0].where)), {type:{not:'Review'}});
});
