// Isolated admin component harness. Uses synthetic records; never connects to APIs or a database.
// Start this server, then run responsive.browser.mjs with TEST_BASE_URL=http://localhost:3100.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
const directory='.next/responsive-fixture';
await mkdir(directory,{recursive:true});
await build({
  stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import AdminApp from './src/features/admin/components/admin-app';
    import {UnsavedChangesProvider} from './src/components/forms/unsaved-changes';
    import {modules,initialSettings} from './src/features/admin/data/modules';
    import {contentFields} from './src/features/content/fields';
    import {defaultWebsite,websiteFromValues} from './src/features/content/website-model';
    import './src/app/globals.css';
    import './src/app/admin/admin.css';
    import './src/app/responsive.css';
    const data=Object.fromEntries(Object.entries(modules).map(([key,m])=>[key,[{id:'TEST-001',...Object.fromEntries(m.fields.map(f=>[f.key,f.options?.[0]|| (f.type==='number'?'125':'Sample '+f.label)]))}]]));
    Object.assign(data.bookings[0],{customer:'A traveller with a longer customer name',pickup:'Jeddah Airport',destination:'Makkah hotel',route:'Jeddah Airport → Makkah hotel',status:'Pending',date:'2026-10-22',fare:'250',passengers:'4',luggage:'3',email:'traveller@example.test'});
    Object.assign(data.customers[0],{name:'Sample Customer',email:'traveller@example.test'});
    Object.assign(data.vehicles[0],{name:'Family vehicle',status:'Available',passengers:'6',luggage:'4'});
    data.serviceCategories=[];
    const values=Object.fromEntries(contentFields.map(f=>[f.id,f.value]));
    const document={version:1,draft:values,published:values,updatedAt:null,publishedAt:null,catalog:{locations:[],routes:[],vehicles:[],offers:[],reviews:[]}};
    const snapshot={data,settings:{...initialSettings,version:1},notices:[],user:{id:'test',name:'Test Administrator',role:'Administrator'}};
    window.fetch=async (url,options)=>{
      if(options?.method && options.method!=='GET')return Response.json({error:'Writes disabled in responsive fixture'},{status:403});
      if(String(url).startsWith('/api/content'))return Response.json(document);
      if(String(url).startsWith('/api/admin/services'))return Response.json({version:1,services:websiteFromValues(values).services,locations:[]});
      if(String(url).startsWith('/api/admin/profile'))return Response.json({name:'Test Administrator',email:'admin@example.test',role:'Administrator'});
      return Response.json(snapshot);
    };
    createRoot(window.document.getElementById('root')).render(<UnsavedChangesProvider><AdminApp initial={snapshot}/></UnsavedChangesProvider>);
  `},
  conditions:['style','browser'],bundle:true,outfile:directory+'/app.js',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},
  plugins:[{name:'fixture-next',setup(b){
    b.onResolve({filter:/^next\/(navigation|link|image)$/},args=>({path:args.path,namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:process.cwd(),loader:'tsx',contents:args.path==='next/navigation'?`import {useSyncExternalStore} from 'react';const subscribe=cb=>{window.addEventListener('popstate',cb);return()=>window.removeEventListener('popstate',cb)};const push=history.pushState.bind(history);history.pushState=(...args)=>{push(...args);window.dispatchEvent(new PopStateEvent('popstate'))};export const usePathname=()=>useSyncExternalStore(subscribe,()=>location.pathname);export const useRouter=()=>({push:url=>history.pushState(null,'',url),replace:url=>location.replace(url),back:()=>history.back()});export const useSearchParams=()=>new URLSearchParams(location.search);`:args.path==='next/link'?`import React from 'react';export default function Link({href,children,prefetch,replace,scroll,...props}){return <a href={href} {...props}>{children}</a>}`:`import React from 'react';export default function Image({src,fill,preload,priority,unoptimized,quality,...props}){return <img src={src} {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...props.style}:props.style}/ >}` }));
  }}],logLevel:'warning',
});
if (process.env.FIXTURE_BUILD_ONLY === '1') process.exit(0);
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost:3100');
  try{
    const file=url.pathname==='/app.js'||url.pathname==='/app.css'?resolve(directory,'.'+url.pathname):url.pathname.startsWith('/fonts/')||url.pathname.startsWith('/images/')?resolve('public','.'+url.pathname):null;
    if(file){if(!file.startsWith(resolve(directory))&&!file.startsWith(resolve('public')))throw Error('Invalid asset');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}
    else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');}
  }catch{res.statusCode=404;res.end();}
}).listen(3100,'127.0.0.1',()=>console.log('Isolated admin fixture: http://localhost:3100'));
