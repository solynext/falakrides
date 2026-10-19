import {config} from "dotenv";
import {randomUUID} from "node:crypto";
import {databaseAdapter} from "../src/lib/db/adapter";
import {PrismaClient} from "../src/generated/prisma/client";
import {hashPassword} from "better-auth/crypto";
import {contentFields} from "../src/features/content/fields";
import {vehicles, routes, locations} from "../src/data/catalog";
import {initialSettings} from "../src/features/admin/data/modules";
import type {ContentValues} from "../src/features/content/types";

config({path: ".env.local", quiet: true});
config({quiet: true});
const db = new PrismaClient({adapter: databaseAdapter(), transactionOptions: {maxWait: 10000, timeout: 60000}});
async function main() {try {
  const defaults = Object.fromEntries(contentFields.map(field => [field.id, field.value]));
  const published: ContentValues = {...defaults};
  const draft: ContentValues = {...defaults};
  const updateRequestCopy = (values: ContentValues) => ({...values, "booking.4": (values["booking.4"] || defaults["booking.4"]).replace(". This request has not been sent or reserved.", ". This request has been received and is awaiting confirmation.")});
  if (!await db.siteContent.findUnique({where: {id: "main"}})) {
    await db.$transaction(async tx => {
      await tx.siteContent.create({data: {id: "main", version: 0, draft: updateRequestCopy(draft), published: updateRequestCopy(published), publishedAt: new Date()}});
      await tx.siteSettings.create({data: {...initialSettings, phone: published["contact.phone"] || initialSettings.phone, email: published["contact.email"] || initialSettings.email}});
      for (const [index, vehicle] of vehicles.entries()) await tx.vehicle.create({data: {name: published[`vehicle.${index}.name`] || vehicle.name, category: vehicle.category, description: published[`vehicle.${index}.description`] || vehicle.description, image: published[`vehicle.${index}.image`] || vehicle.image, passengers: Number(published[`vehicle.${index}.passengers`] || vehicle.passengers), luggage: Number(published[`vehicle.${index}.bags`] || vehicle.bags), plate: `CATALOG-${index + 1}`, contentIndex: index}});
      for (const [index, route] of routes.entries()) await tx.fare.create({data: {route: `${published[`route.${index}.0`] || route[0]} → ${published[`route.${index}.1`] || route[1]}`, caption: published[`route.${index}.2`] || route[2], image: published[`route.${index}.3`] || route[3], featured: true, status: "Active", contentIndex: index}});
      for (const [index, location] of locations.entries()) await tx.location.create({data: {name: published[`location.${index}`] || location, description: location, image:"/images/header-background.jpg", contentIndex: index}});
    });
    console.log("Migrated existing public copy, catalog, settings, and saved content. No fictional admin records imported.");
  }
  const current = await db.siteContent.findUniqueOrThrow({where: {id: "main"}});
  const nextDraft = updateRequestCopy({...defaults, ...current.draft as ContentValues}), nextPublished = updateRequestCopy({...defaults, ...current.published as ContentValues});
  if (JSON.stringify(nextDraft) !== JSON.stringify(current.draft) || JSON.stringify(nextPublished) !== JSON.stringify(current.published)) await db.siteContent.update({where: {id: "main", version: current.version}, data: {draft: nextDraft, published: nextPublished, version: {increment: 1}, publishedAt: new Date()}});
  // Bootstrap credentials must not recreate an old login after an admin changes email.
  if (!await db.user.findFirst({where: {role: "Administrator", status: "Active"}})) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 12) throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before initial seeding.");
    if (await db.user.findUnique({where: {email}})) throw new Error("The seed email belongs to an existing account. Restore administrator access before seeding.");
    const userId = randomUUID();
    await db.user.create({data: {id: userId, name: "Administrator", email, emailVerified: false, role: "Administrator", accounts: {create: {id: randomUUID(), accountId: userId, providerId: "credential", password: await hashPassword(password)}}}});
    console.log("Initial administrator created. Credentials are not printed.");
  }
} finally {await db.$disconnect();}}
main().catch(error => {console.error(error); process.exitCode = 1;});
