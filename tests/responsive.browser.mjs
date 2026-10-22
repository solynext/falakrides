// Read-only responsive audit using installed Chrome, without extra dependencies.
import {spawn} from 'node:child_process';
import {mkdtemp, rm, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import WebSocket from 'next/dist/compiled/ws/index.js';
import {config} from 'dotenv';
config({path: '.env.local', quiet: true});
config({path: '.env', quiet: true});
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const height = Number(process.env.RESPONSIVE_HEIGHT || 900);
const output = process.env.RESPONSIVE_OUTPUT || '.next/responsive-audit';
const profile = await mkdtemp(join(tmpdir(), 'falak-responsive-'));
const browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {windowsHide:true});
let socket;
let testCookie;
try {
  const endpoint = await new Promise((res,rej) => {browser.on('error',rej); browser.stderr.on('data',chunk => {const match=String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/); if(match)res(match[1]);});});
  const tabs = await (await fetch(`http://${new URL(endpoint).host}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise(res=>socket.on('open',res));
  let id=0; const pending=new Map();
  socket.on('message', data=>{const msg=JSON.parse(data); if(pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(new Error(msg.error.message));else p.resolve(msg.result);}});
  const command=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>reject(new Error('Timed out: '+method)),30000);pending.set(key,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
  const email=process.env.TEST_ADMIN_EMAIL||process.env.ADMIN_EMAIL;
  const password=process.env.TEST_ADMIN_PASSWORD||process.env.ADMIN_PASSWORD;
  let admin=false;
  if(email&&password){
    const response=await fetch(base+'/api/auth/sign-in/email',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(response.ok){const pairs=response.headers.getSetCookie().map(c=>c.split(';')[0]);testCookie=pairs.join('; ');await command('Network.setCookies',{cookies:pairs.map(pair=>{const i=pair.indexOf('=');return {name:pair.slice(0,i),value:pair.slice(i+1),url:base,httpOnly:true};})});admin=true;}
  }
  const publicRoutes=['/','/about','/book-a-ride','/contact','/faq','/gallery','/jeddah-airport-to-makkah-taxi','/madinah-to-jeddah-airport-transfer','/makkah-to-madinah-taxi','/my-bookings','/offers','/packages','/policies','/premium-umrah-transport','/privacy','/routes','/services','/terms','/travel-guides','/umrah-taxi-prices','/vehicles'];
  const adminRoutes=['dashboard','bookings','services','customers','drivers','vehicles','price-and-routes','offers-and-packages','payments','feedback','website-content','reports','team-and-roles','settings','notifications','locations'].map(s=>'/admin/'+s);
  const routes=process.env.RESPONSIVE_ROUTES?.split(',')||[...publicRoutes,'/login','/register','/forgot-password',...(admin?adminRoutes:[])];
  const widths=(process.env.RESPONSIVE_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number);
  const results=[]; const interactions=[]; await mkdir(output,{recursive:true});
  for(let routeIndex=0;routeIndex<routes.length;routeIndex++){
    const route=routes[routeIndex];
    await command('Page.navigate',{url:base+route});
    const deadline=Date.now()+90000;
    while(Date.now()<deadline){if(await evaluate(`document.readyState==='complete' && !!document.querySelector('main, h1, .adm-auth, .password-reset-page')`))break;await new Promise(r=>setTimeout(r,200));}
    await evaluate('document.fonts.ready');
    if(!route.startsWith('/admin/') && !process.env.RESPONSIVE_ROUTES){const links=await evaluate(`Array.from(document.querySelectorAll('a[href]')).map(a=>a.getAttribute('href')).filter(h=>/^\\/(services|packages|locations|travel-guides)\\/[^/#]+$/.test(h))`);routes.push(...links.filter((h,i)=>links.indexOf(h)===i&&!routes.includes(h)));}
    for(const width of widths){
      await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await new Promise(r=>setTimeout(r,300));
      const result=await evaluate(`(() => {const root=document.documentElement;const visible=e=>{const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&e.getClientRects().length&&!e.closest('[aria-hidden="true"],dialog:not([open])');};const issues=[...document.querySelectorAll('body *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();if(r.width===0)return false;if(e.closest('.adm-table-scroll,.cms-section-nav nav,.taxi-location-marquee,.taxi-price-grid'))return false;return r.right>innerWidth+2||r.left< -2;}).slice(0,14).map(e=>({tag:e.tagName,cls:e.className?.baseVal??e.className,width:Math.round(e.getBoundingClientRect().width)}));return {url:location.pathname,width:innerWidth,scrollWidth:root.scrollWidth,mainWidth:document.querySelector('.adm-main')?.scrollWidth,mainClient:document.querySelector('.adm-main')?.clientWidth,issues};})()`);
      if(route==='/'&&width>=901){
        const overlap=await evaluate(`(() => {const elements=[...document.querySelector('.header').children].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none').map(e=>({name:e.className,rect:e.getBoundingClientRect()}));return elements.flatMap((a,i)=>elements.slice(i+1).filter(b=>Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left)>1&&Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top)>1).map(b=>[a.name,b.name]));})()`);
        if(overlap.length)throw Error('Header overlaps '+JSON.stringify({width,overlap}));
      }
      results.push({route,...result});
      if(width===320||width===1440){const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,route.replace(/[^a-z0-9_-]/gi,'_')+'-'+width+'.png'),Buffer.from(shot.data,'base64'));}
    }
    if(process.env.RESPONSIVE_INTERACTIONS==='1'){
      for(const width of [320,375,390,430,768,1024,1440]){
        await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        await new Promise(r=>setTimeout(r,300));
        if(width<=800 && route.startsWith('/admin/') && await evaluate(`!!document.querySelector('.adm-mobile-menu')`)){
          await evaluate(`document.querySelector('.adm-mobile-menu').click()`);
          await new Promise(r=>setTimeout(r,300));
          const menu=await evaluate(`({open:document.querySelector('.adm-sidebar').classList.contains('is-open'),focus:!!document.activeElement.closest('.adm-sidebar'),inert:document.querySelector('.adm-work-area').inert,active:document.activeElement.outerHTML.slice(0,180),visibility:getComputedStyle(document.querySelector('.adm-sidebar')).visibility})`);
          if(!menu.open||!menu.focus||!menu.inert)throw Error('Admin drawer accessibility failed '+JSON.stringify(menu));
          await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
          await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        }
        const triggers=route==='/'?['.taxi-slide[data-active="true"] .taxi-hero-contact','.header-search-mobile-toggle','.reference-menu-toggle']:
          route==='/gallery'?['.gallery-card']:
          route==='/admin/settings'?['.adm-settings-card:first-child','.adm-settings-card:last-child']:
          route.startsWith('/admin/')?['.adm-page-actions .adm-button:last-child']:[];
        for(const selector of triggers){
          const clicked=await evaluate(`(() => {const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.disabled||!b.getClientRects().length||getComputedStyle(b).display==='none')return false;b.click();return true;})()`);
          if(!clicked)continue;
          await new Promise(r=>setTimeout(r,350));
          if(route==='/admin/price-and-routes' && await evaluate(`!!document.querySelector('dialog[open] #adm-fare-service-category')`)){
            const selected=await evaluate(`(() => {const select=document.querySelector('#adm-fare-service-category');const option=[...select.options].find(o=>o.value&&!o.disabled);if(!option)return null;select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));return {id:option.value,label:option.textContent};})()`);
            if(selected){
              await new Promise(r=>setTimeout(r,50));
              const value=await evaluate(`document.querySelector('#adm-fare-service-category').value`);
              if(value!==selected.id)throw Error('Route service category selection was not retained');
              interactions.push({route,width,selectedCategory:selected});
            }
          }
          const state=await evaluate(`(() => {const e=document.querySelector('dialog[open]')||document.querySelector('.reference-nav[data-open="true"]')||document.querySelector('.header-search-panel[data-mobile-open="true"]');if(!e)return null;const r=e.getBoundingClientRect();return {class:e.className,left:r.left,right:r.right,top:r.top,bottom:r.bottom,scroll:e.scrollWidth,client:e.clientWidth};})()`);
          if(state){interactions.push({route,width,selector,state});if(state.left< -1||state.right>width+1||state.top< -1||state.bottom>height+1||state.scroll>state.client+2)throw Error('Interactive overflow: '+JSON.stringify({route,width,selector,state}));}
          await evaluate(`(() => {const d=document.querySelector('dialog[open]');if(d){const b=d.querySelector('button[aria-label^="Close"]');if(b)b.click();else d.close();}const menu=document.querySelector('.reference-menu-toggle[aria-expanded="true"]');menu?.click();const search=document.querySelector('.header-search-mobile-toggle[aria-expanded="true"]');search?.click();})()`);
          if(route==='/admin/price-and-routes')await evaluate(`document.querySelector('.unsaved-dialog[open] .unsaved-discard')?.click()`);
          await new Promise(r=>setTimeout(r,100));
        }
        if(route==='/admin/website-content'){
          const pages=await evaluate(`document.querySelectorAll('.cms-page-tabs button').length`);
          for(let page=0;page<pages;page++){
            await evaluate(`document.querySelectorAll('.cms-page-tabs button')[${page}].click()`);
            await new Promise(r=>setTimeout(r,30));
            const sections=await evaluate(`document.querySelectorAll('.cms-section-nav nav button').length`);
            for(let section=0;section<sections;section++){
              await evaluate(`document.querySelectorAll('.cms-section-nav nav button')[${section}].click()`);
              await new Promise(r=>setTimeout(r,30));
              const layout=await evaluate(`(() => {document.querySelectorAll('#cms-editor-form details').forEach(d=>d.open=true);const main=document.querySelector('.adm-main');return {page:document.querySelector('.cms-page-tabs .active').textContent,section:document.querySelector('.cms-section-nav .active').textContent,width:main.clientWidth,scroll:main.scrollWidth};})()`);
              if(layout.scroll>layout.width+1)throw Error('Content editor overflow '+JSON.stringify({width,...layout}));
              interactions.push({route,width,contentSection:layout});
            }
          }
        }
      }
    }
    console.log(route,JSON.stringify(results.filter(r=>r.route===route&& (r.issues.length||r.scrollWidth>r.width||r.mainWidth>r.mainClient)).map(r=>({width:r.width,issues:r.issues}))));
  }
  await writeFile(join(output,'results.json'),JSON.stringify({adminAuthenticated:admin,results,interactions},null,2));
  if(results.some(r=>r.scrollWidth>r.width+1||r.mainWidth>r.mainClient+1||r.issues.length))process.exitCode=1;
  console.log(`Audited ${routes.length} routes; admin authenticated: ${admin}. Results: ${output}`);
} finally {
  if(testCookie)await fetch(base+'/api/auth/sign-out',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:testCookie},body:'{}'}).catch(()=>{});
  socket?.close();browser.kill();
  if(!resolve(profile).startsWith(resolve(tmpdir())+'\\')||!profile.includes('falak-responsive-'))throw new Error('Unexpected temporary path');
  await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
}
