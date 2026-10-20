import {db} from "@/lib/db";
import {HttpError} from "@/lib/security/http";
import {websiteFromValues, parseWebsite, type WebsiteService} from "@/features/content/website-model";
import type {ContentValues} from "@/features/content/types";

export async function readServices() {
  const existing = await db.serviceCatalog.findUnique({where:{id:"main"}});
  if (existing) return existing;
  // Copy existing live services once; subsequent website content edits cannot change them.
  const content = await db.siteContent.findUnique({where:{id:"main"}});
  const services = websiteFromValues((content?.published || {}) as ContentValues).services;
  return db.serviceCatalog.upsert({where:{id:"main"},create:{id:"main",services},update:{}});
}

export function validateServices(services: unknown): WebsiteService[] {
  const base = websiteFromValues({});
  return parseWebsite(JSON.stringify({...base,services})).services;
}

export async function readServicesForAdmin() {
  await readServices();
  return db.$transaction(async tx=>{
    const catalog=await tx.serviceCatalog.findUniqueOrThrow({where:{id:"main"}});
    const locations=await tx.location.findMany({orderBy:{name:"asc"},select:{id:true,name:true,serviceIds:true}});
    return {...catalog,locations};
  },{isolationLevel:"RepeatableRead"});
}

export async function saveServices(version:number, input:unknown, userId:string, assignments?:Record<string,string[]>) {
  let services:WebsiteService[];
  try {services=validateServices(input);} catch(error) {throw new HttpError(400,error instanceof Error ? error.message : "Check service details.");}
  await db.$transaction(async tx=>{
    const previous=await tx.serviceCatalog.findUnique({where:{id:"main"}});
    const deleted=new Set(((previous?.services||[]) as WebsiteService[]).filter(service=>!services.some(item=>item.id===service.id)).map(service=>service.id));
    const result=await tx.serviceCatalog.updateMany({where:{id:"main",version},data:{services,version:{increment:1}}});
    if(result.count!==1)throw new HttpError(409,"Services changed. Reload the latest services before saving.");
    if(assignments||deleted.size) {
      const locations=await tx.location.findMany({select:{id:true,serviceIds:true,version:true}});
      for(const [serviceId,locationIds] of Object.entries(assignments||{})) {
        if(!services.some(service=>service.id===serviceId)||!Array.isArray(locationIds)||new Set(locationIds).size!==locationIds.length||locationIds.some(id=>!locations.some(location=>location.id===id)))throw new HttpError(400,"Select existing locations without duplicates.");
      }
      for(const location of locations) {
        const next=new Set(location.serviceIds.filter(id=>!deleted.has(id)));
        for(const [serviceId,locationIds] of Object.entries(assignments||{})) {if(locationIds.includes(location.id))next.add(serviceId);else next.delete(serviceId);}
        const serviceIds=[...next];
        if(JSON.stringify(serviceIds)!==JSON.stringify(location.serviceIds)) {
          const updated=await tx.location.updateMany({where:{id:location.id,version:location.version},data:{serviceIds,version:{increment:1}}});
          if(updated.count!==1)throw new HttpError(409,"A location changed. Reload services before saving again.");
        }
      }
    }
    await tx.auditLog.create({data:{userId,action:"save",resource:"services",recordId:"main"}});
  });
  return readServices();
}
