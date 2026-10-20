import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../../src/features/content/price-filters.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {filterPriceRoutes}=context.exports;
const vehicles=[{id:'camry',name:'Camry / Sonata'},{id:'staria',name:'Staria'}];
const rows=[['Jeddah','Makkah','','','200','','camry','a'],['Makkah','Madinah','','','1000','','staria','b'],['Jeddah','Makkah','','','90','','staria','c'],['Makkah','Taif','','','','','camry','d']];
const base={search:'',vehicle:'',pickup:'',destination:'',sort:'default'};
const ids=result=>Array.from(result,row=>row[7]);
test('search matches vehicle and route words regardless of case',()=>{
 assert.deepEqual(ids(filterPriceRoutes(rows,vehicles,{...base,search:'  JEDDAH   STARIA  '})),['c']);
});
test('vehicle, pickup and destination filters combine',()=>{
 assert.deepEqual(ids(filterPriceRoutes(rows,vehicles,{...base,vehicle:'camry',pickup:'Jeddah',destination:'Makkah'})),['a']);
 assert.deepEqual(ids(filterPriceRoutes(rows,vehicles,{...base,pickup:'Taif'})),[]);
});
test('price sort is numeric with quote-only fares last in both directions',()=>{
 assert.deepEqual(ids(filterPriceRoutes(rows,vehicles,{...base,sort:'price-asc'})),['c','a','b','d']);
 assert.deepEqual(ids(filterPriceRoutes(rows,vehicles,{...base,sort:'price-desc'})),['b','a','c','d']);
 assert.deepEqual(ids(rows),['a','b','c','d']);
});
test('default shows all cards and alphabetical sorting supports route and vehicle',()=>{
 assert.deepEqual(ids(filterPriceRoutes(rows,vehicles,base)),['a','b','c','d']);
 assert.deepEqual(ids(filterPriceRoutes(rows,vehicles,{...base,sort:'vehicle'})),['a','d','b','c']);
 assert.deepEqual(ids(filterPriceRoutes(rows,vehicles,{...base,sort:'route'})),['a','c','b','d']);
});
