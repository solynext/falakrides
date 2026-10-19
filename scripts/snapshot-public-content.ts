import {config} from "dotenv";
config({path:".env.local",quiet:true});config({quiet:true});
import {mkdir,writeFile} from "node:fs/promises";
import {PrismaClient} from "../src/generated/prisma/client";
import {databaseAdapter} from "../src/lib/db/adapter";
import {editableContentFields} from "../src/features/content/fields";
import {parseWebsite,WEBSITE_FIELD,websiteFromValues} from "../src/features/content/website-model";
import type {ContentValues} from "../src/features/content/types";
const db=new PrismaClient({adapter:databaseAdapter()});
async function main(){try{
 const [record,settings,vehicles,fares,locations,offers,reviews]=await Promise.all([
 db.siteContent.findUniqueOrThrow({where:{id:"main"}}),db.siteSettings.findUniqueOrThrow({where:{id:"main"}}),
 db.vehicle.findMany({where:{status:{not:"Maintenance"}},orderBy:{createdAt:"asc"}}),db.fare.findMany({where:{status:"Active"},orderBy:{createdAt:"asc"}}),db.location.findMany({where:{status:"Active"},orderBy:{createdAt:"asc"}}),db.offer.findMany({where:{status:"Active",validUntil:{gte:new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"})}},orderBy:{createdAt:"desc"}}),db.feedback.findMany({where:{status:"Approved",type:"Review"},orderBy:{createdAt:"desc"},take:20})]);
 const stored=record.published as ContentValues;if(stored[WEBSITE_FIELD])parseWebsite(stored[WEBSITE_FIELD]);
 const all:ContentValues={...Object.fromEntries(editableContentFields.map(f=>[f.id,f.value])),"company.name":settings.name,"company.description":settings.description,"contact.phone":settings.phone,"contact.email":settings.email,...stored};
 const values=Object.fromEntries(editableContentFields.filter(f=>f.id!==WEBSITE_FIELD).map(f=>[f.id,all[f.id]]));const website=websiteFromValues(stored);
 const catalog={vehicles:vehicles.map(v=>({id:v.id,name:v.name,category:v.category,description:v.description,image:v.image,passengers:v.passengers,bags:v.luggage})),routes:fares.map(f=>({id:f.id,route:f.route,caption:f.caption,image:f.image,fare:f.fare===null?null:f.fare/100})),destinations:locations.map(a=>({id:a.id,name:a.name,destinations:a.destinations})),offers:offers.map(o=>({id:o.id,name:o.name,code:o.code,discount:o.discount,route:o.route,validUntil:o.validUntil,terms:o.terms})),reviews:reviews.map(r=>({id:r.id,name:r.customer,rating:r.rating,text:r.message}))};
 const assets=new Set<string>();function images(value:unknown){if(typeof value==="string"&&/^(?:\/images\/|photo-\d|https:\/\/res\.cloudinary\.com\/)/.test(value))assets.add(value);else if(Array.isArray(value))value.forEach(images);else if(value&&typeof value==="object")Object.values(value).forEach(images);}images({website,values,catalog});
 const pages=["/","/about","/services",...website.services.map(s=>`/services/${s.slug}`),"/packages",...website.vehicles.map(v=>`/packages/${v.slug}`),"/vehicles","/routes","/offers","/contact","/faq","/book-a-ride","/my-bookings","/policies","/privacy","/terms"];
 await mkdir("data",{recursive:true});await writeFile("data/public-website.snapshot.json",JSON.stringify({schemaVersion:1,capturedAt:new Date().toISOString(),sourceVersion:record.version,site:"FalakRides",pages,design:{headingFont:"Oswald",bodyFont:"Epilogue",accent:"#8dc73f",headingColor:"#27144c",layout:"Shared page banner, responsive cards, lime actions, white and light-grey sections"},website,values,catalog,assets:[...assets].sort()},null,2)+"\n");console.log(JSON.stringify({pages:pages.length,fields:Object.keys(values).length,images:assets.size,sourceVersion:record.version}));
}finally{await db.$disconnect();}}void main().catch(e=>{console.error(e.message);process.exitCode=1;});
