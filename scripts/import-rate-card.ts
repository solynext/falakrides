import {config} from "dotenv";
import {PrismaClient} from "../src/generated/prisma/client";
import {databaseAdapter} from "../src/lib/db/adapter";
config({path:".env.local",quiet:true});config({quiet:true});
const db=new PrismaClient({adapter:databaseAdapter(),transactionOptions:{maxWait:10000,timeout:60000}});
const vehicles=[{name:"Camry / Sonata",passengers:4},{name:"Staria",passengers:7},{name:"GMC Yukon XL",passengers:7},{name:"Hiace",passengers:11}];
const rows:[string,string,number[]][]=[
 ["Jeddah Airport","Makkah",[200,280,400,300]],
 ["Makkah","Jeddah Airport",[160,200,320,280]],
 ["Makkah","Madinah",[350,400,640,500]],
 ["Madinah Hotel","Madinah Airport",[100,150,240,180]],
 ["Madinah Airport","Madinah Hotel",[150,200,280,250]],
 ["Makkah","Makkah Ziyarat",[160,220,320,280]],
 ["Madinah","Madinah Ziyarat",[160,200,320,250]],
 ["Makkah","Taif Ziyarat / Tour",[300,350,760,450]],
 ["Makkah Hotel","Miqat",[100,150,240,180]],
 ["Makkah","Jeddah Tours",[280,350,440,450]],
 ["Makkah","Kiswa Factory + Museum Ziyarat",[200,250,400,350]],
];
async function main(){try{
 const result=await db.$transaction(async tx=>{
  const rides=await Promise.all(vehicles.map(v=>tx.vehicle.findUniqueOrThrow({where:{name:v.name}})));
  if(!process.argv.includes("--apply"))return {preview:true,routes:rows.length,prices:rows.length*rides.length,rows};
  for(const name of new Set(rows.flatMap(([pickup,destination])=>[pickup,destination]))){
   const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
   await tx.location.upsert({where:{name},update:{},create:{name,slug,image:"/images/header-background.jpg",description:name}});
  }
  for(const [i,ride] of rides.entries()){
   if(ride.passengers!==vehicles[i].passengers)await tx.vehicle.update({where:{id:ride.id},data:{passengers:vehicles[i].passengers,version:{increment:1}}});
   for(const [pickup,destination,prices] of rows){
    const route=`${pickup} → ${destination}`;
    const fare=prices[i]*100;
    const existing=await tx.fare.findFirst({where:{route,vehicleId:ride.id}});
    const data={fare,maxFare:fare,status:"Active",featured:true,image:ride.image,caption:"Rate card supplied 20 October 2026"};
    if(existing)await tx.fare.update({where:{id:existing.id},data:{...data,version:{increment:1}}});
    else await tx.fare.create({data:{...data,route,vehicleId:ride.id}});
   }
  }
  let verified=0;
  for(const [pickup,destination,prices] of rows)for(const [i,ride] of rides.entries()){
   const saved=await tx.fare.findFirstOrThrow({where:{route:`${pickup} → ${destination}`,vehicleId:ride.id}});
   if(saved.fare!==prices[i]*100||saved.maxFare!==prices[i]*100||saved.status!=="Active")throw new Error("Imported fare verification failed.");
   verified++;
  }
  await tx.auditLog.create({data:{action:"import-october-20-rate-card",resource:"fares",recordId:"whatsapp-2026-10-20"}});
  return {routes:rows.length,verifiedPrices:verified,capacities:vehicles};
 });
 console.log(JSON.stringify(result,null,2));
}finally{await db.$disconnect();}}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
