import {config} from "dotenv";
import {PrismaClient} from "../src/generated/prisma/client";
import {databaseAdapter} from "../src/lib/db/adapter";
import {websiteFromValues} from "../src/features/content/website-model";
import type {ContentValues} from "../src/features/content/types";

config({path:".env.local",quiet:true});
config({quiet:true});
const db=new PrismaClient({adapter:databaseAdapter(),transactionOptions:{maxWait:10000,timeout:30000}});
// Provisional capacities for the reference cards; confirm against actual vehicles in admin.
const capacities:Record<string,{passengers:number;luggage:number}>={
  "camry-sonata":{passengers:3,luggage:2},
  staria:{passengers:6,luggage:4},
  gmc:{passengers:6,luggage:4},
  hiace:{passengers:12,luggage:8},
};
async function main(){try{
  const apply=process.argv.includes("--apply");
  const result=await db.$transaction(async tx=>{
    const content=await tx.siteContent.findUniqueOrThrow({where:{id:"main"}});
    const cards=websiteFromValues(content.published as ContentValues).vehicles.filter(v=>v.visible);
    const existing=await tx.vehicle.findMany({select:{name:true}});
    const missing=cards.filter(card=>!existing.some(v=>v.name.toLowerCase()===card.name.toLowerCase()));
    for(const card of missing){
      const capacity=capacities[card.slug];
      if(!capacity)throw new Error(`Set provisional capacities for ${card.name} before importing.`);
      if(!apply)continue;
      await tx.vehicle.create({data:{name:card.name,category:card.category,image:card.image,description:card.description,plate:`REFERENCE-${card.slug.toUpperCase()}`,...capacity}});
      await tx.vehicleCategory.upsert({where:{name:card.category},create:{name:card.category},update:{}});
      await tx.auditLog.create({data:{action:"import-homepage-vehicle",resource:"vehicles",recordId:card.slug}});
    }
    const saved=await tx.vehicle.findMany({select:{id:true,name:true}});
    return {applied:apply,missing:missing.map(v=>v.name),vehicles:cards.map(card=>({name:card.name,inAdmin:saved.some(v=>v.name.toLowerCase()===card.name.toLowerCase())}))};
  });
  console.log(JSON.stringify(result,null,2));
}finally{await db.$disconnect();}}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
