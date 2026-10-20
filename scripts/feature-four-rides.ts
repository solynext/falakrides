import {config} from "dotenv";
import assert from "node:assert/strict";
config({path:".env.local",quiet:true});config({quiet:true});
async function main(){
 const {db}=await import("../src/lib/db");
 try{
 const selected=[
  {name:"Camry / Sonata",route:"Jeddah Airport → Makkah"},
  {name:"Staria",route:"Makkah → Madinah"},
  {name:"GMC Yukon XL",route:"Makkah → Jeddah Airport"},
  {name:"Hiace",route:"Madinah Airport → Madinah Hotel"},
 ];
 const result=await db.$transaction(async tx=>{
  const fares=await Promise.all(selected.map(item=>tx.fare.findFirstOrThrow({where:{route:item.route,status:"Active",vehicle:{name:item.name,status:{not:"Maintenance"}}},include:{vehicle:true}})));
  const ids=fares.map(f=>f.id);
  await tx.fare.updateMany({where:{featured:true,id:{notIn:ids}},data:{featured:false,version:{increment:1}}});
  await tx.fare.updateMany({where:{id:{in:ids},featured:false},data:{featured:true,version:{increment:1}}});
  await tx.siteContent.update({where:{id:"main"},data:{publishedAt:new Date()}});
  await tx.auditLog.create({data:{action:"select-four-featured-rides",resource:"fares",recordId:ids.join(",")}});
  const saved=await tx.fare.findMany({where:{featured:true},include:{vehicle:true}});
  assert.equal(saved.length,4);
  assert.deepEqual(new Set(saved.map(f=>f.id)),new Set(ids));
  return saved.map(f=>({vehicle:f.vehicle?.name,route:f.route,priceSAR:(f.fare??0)/100,featured:f.featured}));
 });console.log(JSON.stringify(result,null,2));
 }finally{await db.$disconnect();}
}main().catch(e=>{console.error(e.message);process.exitCode=1;});
