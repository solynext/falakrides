import {mkdir,writeFile,readFile} from "node:fs/promises";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {config} from "dotenv";
import {neon} from "@neondatabase/serverless";

const photos=[
  {name:"Jeddah Airport (JED)",file:"King Abdulaziz International Airport - North Terminal 2.jpg",slug:"jeddah-airport"},
  {name:"Makkah",file:"The Kaaba during Hajj (edited).jpg",slug:"makkah-haram"},
  {name:"Madinah",file:"Masjid al-Nabawi 2024 (9).jpg",slug:"madinah"},
  {name:"Madinah Airport (MED)",file:"Madina international Airport 2025.jpg",slug:"madinah-airport"},
  {name:"Jeddah",file:"Jeddah waterfront sunset.jpg",slug:"jeddah"},
  {name:"Hotel / other location",file:"Hilton Hotel Makkah.jpg",slug:"hotel-makkah"},
];
const creditsPath=join("src","data","location-image-credits.json");
if(process.argv.includes("--apply")) {
  config({path:[".env.local",".env"],quiet:true});
  const credits=JSON.parse(await readFile(creditsPath,"utf8"));
  for(const photo of credits)await readFile(join("public",photo.image));
  const sql=neon(process.env.DATABASE_URL);
  const results=await sql.transaction(credits.map(photo=>sql.query('UPDATE "Location" SET image=$1, version=version+1, "updatedAt"=CURRENT_TIMESTAMP WHERE name=$2 AND image=$3 RETURNING id, name, image',[photo.image,photo.name,"/images/header-background.jpg"])));
  console.log(JSON.stringify({updated:results.flat().length,locations:results.flat().map(row=>({name:row.name,image:row.image}))}));
} else {
  await mkdir(join("public","images","locations"),{recursive:true});
  const metadata=[
    {author:"Tahir mq",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
    {author:"Adli Wahid (cropped version uploaded by Aliphotography)",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
    {author:"Radosław Botev / Fundacja Nomos",license:"CC BY 3.0 PL",licenseUrl:"https://creativecommons.org/licenses/by/3.0/pl/"},
    {author:"ほっきー",license:"CC0 1.0",licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/"},
    {author:"SUAAD",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
    {author:"King Eliot",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
  ];
  const credits=[];
  for(const [index,photo] of photos.entries()) {
    const filename=photo.file.replaceAll(" ","_");
    const hash=createHash("md5").update(filename).digest("hex");
    const imageUrl=`https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0,2)}/${encodeURIComponent(filename)}`;
    const path=`/images/locations/${photo.slug}.jpg`;
    let bytes;
    try {bytes=await readFile(join("public",path));} catch(error) {if(error.code!=="ENOENT")throw error;}
    if(!bytes) {
      const image=await fetch(imageUrl,{signal:AbortSignal.timeout(45000)});
      if(!image.ok || !image.headers.get("content-type")?.startsWith("image/"))throw Error(`Image download failed (${image.status}): ${photo.file}`);
      bytes=Buffer.from(await image.arrayBuffer());
      if(bytes[0]!==0xff || bytes[1]!==0xd8)throw Error(`Expected JPEG: ${photo.file}`);
      await writeFile(join("public",path),bytes);
    }
    credits.push({name:photo.name,image:path,title:photo.file,...metadata[index],source:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,download:imageUrl,changes:"Original photograph, unmodified file. Displayed with a crop to fit the image box."});
    console.log(JSON.stringify({downloaded:photo.name,bytes:bytes.length,license:metadata[index].license}));
  }
  await writeFile(creditsPath,JSON.stringify(credits,null,2)+"\n");
  const escape=value=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const content=credits.map(photo=>`<article id="${escape(photo.image.split('/').pop().replace('.jpg',''))}"><img src="${escape(photo.image)}" alt="${escape(photo.name)}" width="240" height="140"><div><h2>${escape(photo.name)}</h2><p>${escape(photo.title)}</p><p>Photo: ${escape(photo.author)}</p><p><a href="${escape(photo.source)}">Original source</a> · <a href="${escape(photo.licenseUrl)}">${escape(photo.license)}</a></p><small>${escape(photo.changes)}</small>${photo.name === "Hotel / other location" ? '<p>Representative hotel pickup photograph; not a claim of hotel affiliation.</p>' : ''}</div></article>`).join("\n");
  await writeFile(join("public","images","locations","credits.html"),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Location photo credits | Falak Rides</title><style>body{max-width:940px;margin:40px auto;padding:0 20px;font:14px/1.6 Arial,sans-serif;color:#26351f}article{display:flex;flex-wrap:wrap;gap:24px;padding:24px 0;border-top:1px solid #e0e6d8}article img{object-fit:cover;border-radius:10px}article>div{flex:1;min-width:240px}h2{margin-top:0;font-size:20px}a{color:#527c30}small{color:#697360}</style></head><body><h1>Location photo credits</h1>${content}</body></html>\n`);
}
