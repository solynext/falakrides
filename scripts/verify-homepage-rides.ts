import {config} from "dotenv";
import {existsSync} from "node:fs";
import assert from "node:assert/strict";
config({path:".env.local",quiet:true});config({quiet:true});
async function main(){
 const {databaseCatalog}=await import("../src/features/content/database-catalog");
 const {db}=await import("../src/lib/db");
 try{
 const catalog=await databaseCatalog();
 const rows=catalog.routes.filter(row=>row[2]==="Rate card supplied 20 October 2026");
 assert.equal(rows.length,44);
 assert.equal(new Set(rows.map(row=>row[7])).size,44);
 for(const row of rows){
  const vehicle=catalog.vehicles.find(v=>v.id===row[6]);assert.ok(vehicle);
  assert.ok(existsSync(`public${vehicle.image}`),`Missing image for ${vehicle.name}`);
  const fare=catalog.fares.find(f=>f.route===`${row[0]} → ${row[1]}`&&f.vehicleId===vehicle.id);
  assert.equal(Number(row[4]),fare?.fare);
 }
 const airport=rows.filter(row=>row[0]==="Jeddah Airport"&&row[1]==="Makkah");
 assert.equal(airport.length,4);
 assert.deepEqual(airport.map(row=>Number(row[4])),[200,280,400,300]);
 assert.equal(new Set(airport.map(row=>catalog.vehicles.find(v=>v.id===row[6])?.image)).size,4);
 console.log("Verified 44 unique homepage ride cards, matched vehicle images and fares; Jeddah–Makkah prices: 200 / 280 / 400 / 300 SAR.");
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
