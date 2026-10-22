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

const review = {customer:'Traveller',type:'Review',rating:'5',message:'Comfortable family transfer.',status:'Approved',featured:'true',isSample:'true',journey:'Jeddah to Makkah'};
test('admin exposes review approval, featuring and sample controls', () => {
  assert.deepEqual(Array.from(modules.feedback.fields.find(field=>field.key==='type').options), ['Review','Inquiry','Complaint']);
  for (const key of ['rating','status','featured','isSample','journey']) assert.ok(modules.feedback.fields.some(field=>field.key===key));
});
test('approved featured reviews persist rating and sample details', async () => {
  const f=fixture();
  await f.service.writeRecord('feedback',review,admin);
  assert.equal(f.writes[0].rating,5);
  assert.equal(f.writes[0].featured,true);
  assert.equal(f.writes[0].isSample,true);
  assert.equal(f.writes[0].journey,'Jeddah to Makkah');
});
test('pending reviews and inquiries cannot be featured', async () => {
  const f=fixture();
  for (const change of [{status:'Pending'},{type:'Inquiry'}]) await assert.rejects(f.service.writeRecord('feedback',{...review,...change},admin),/Approve the review/);
  assert.equal(f.writes.length,0);
});
test('invalid ratings and review statuses cannot be saved', async () => {
  const f=fixture();
  for (const rating of ['0','6','2.5']) await assert.rejects(f.service.writeRecord('feedback',{...review,rating},admin));
  await assert.rejects(f.service.writeRecord('feedback',{...review,status:'Resolved',featured:'false'},admin));
  assert.equal(f.writes.length,0);
});
test('inquiries save without a star rating', async () => {
  const f=fixture();
  await f.service.writeRecord('feedback',{customer:'Traveller',type:'Inquiry',rating:'',message:'Pickup question',status:'Pending'},admin);
  assert.equal(f.writes[0].rating,null);
  assert.equal(f.writes[0].featured,false);
});
test('admin snapshot includes stored reviews for management', async () => {
  const f=fixture(); await f.service.adminSnapshot(admin);
  assert.equal(f.queries[0].where,undefined);
});

test('public catalogue requests only approved featured reviews and preserves sample labels', async () => {
  let query;
  const empty={findMany:async()=>[]};
  const db={vehicle:empty,fare:empty,location:empty,offer:empty,feedback:{findMany:async args=>{query=args;return [{id:'sample',customer:'Traveller',rating:4,message:'Smooth journey',journey:'Makkah to Madinah',isSample:true}];}}};
  const {databaseCatalog}=load('../../src/features/content/database-catalog.ts',()=>({db}));
  const catalog=await databaseCatalog();
  assert.deepEqual(JSON.parse(JSON.stringify(query.where)),{type:'Review',status:'Approved',featured:true});
  assert.equal(catalog.reviews[0].isSample,true);
  assert.equal(catalog.reviews[0].journey,'Makkah to Madinah');
});
