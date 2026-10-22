import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX},
  }).outputText, {exports, require, URLSearchParams});
  return exports;
}
const jsx = (type, props) => typeof type === 'function' ? type(props) : {type, props};
const route = (id,service) => ['Jeddah Airport','Makkah','Airport transfer','','200','250','sedan',id,'false',service];
function render(routes, serviceId='airport') {
  const component = load('../../src/components/public/related-prices.tsx', name => {
    if (name === 'react/jsx-runtime') return {jsx,jsxs:jsx};
    if (name === '@/features/content/public-content') return {useSiteCatalog:()=>({routes,vehicles:[{id:'sedan',name:'Sedan'}]})};
    if (name === './price-route-card') return {default:props=>({card:props})};
    if (name === './sections') return {SectionHeading:props=>({heading:props.children})};
    return {};
  });
  return component.default({serviceId,serviceTitle:'Airport transfers'});
}

test('service pages show only prices explicitly linked to the opened service', () => {
  const output=JSON.stringify(render([route('airport-fare','airport'),route('city-fare','city'),route('unassigned','')]));
  assert.ok(output.includes('Related Prices'));
  assert.ok(output.includes('airport-fare'));
  assert.ok(output.includes('Sedan'));
  assert.ok(!output.includes('city-fare'));
  assert.ok(!output.includes('unassigned'));
});

test('services with no assigned prices offer a quote instead of unrelated fares', () => {
  const output=JSON.stringify(render([route('city-fare','city')]));
  assert.ok(output.includes('No prices are currently listed for this service'));
  assert.ok(output.includes('Request a quote'));
  assert.ok(!output.includes('city-fare'));
});

test('public catalog retains each active fare service assignment and SAR price range', async () => {
  const empty={findMany:async()=>[]};
  const catalog=load('../../src/features/content/database-catalog.ts',()=>({db:{
    vehicle:empty,location:empty,offer:empty,
    fare:{findMany:async({where})=>{assert.equal(where.status,'Active');return [{id:'fare1',route:'Jeddah Airport → Makkah',fare:20000,maxFare:25000,serviceId:'airport',vehicleId:'sedan',featured:false}];}},
  }}));
  const result=await catalog.databaseCatalog();
  assert.equal(result.routes[0][9],'airport');
  assert.equal(result.routes[0][4],'200');
  assert.equal(result.routes[0][5],'250');
});

test('related price booking links carry both stops and the selected vehicle', () => {
  const card=load('../../src/components/public/price-route-card.tsx',name=>{
    if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
    if(name==='@/utils/images')return {photo:value=>value};
    return {};
  });
  const output=JSON.stringify(card.default({route:route('fare1','airport'),vehicle:{id:'sedan',name:'Sedan',passengers:4,bags:3}}));
  assert.ok(output.includes('/book-a-ride?pickup=Jeddah+Airport&destination=Makkah&vehicle=Sedan'));
});
