import {websiteField, websiteFromValues, WEBSITE_FIELD} from "./website-model";
import {readServices} from "@/features/services/server";
import {db} from "@/lib/db";
import {databaseCatalog} from "./database-catalog";
import type {ContentDocument, ContentValues} from "./types";
export {validateValues} from "./validation";

export async function readContent(): Promise<ContentDocument> {
  const [record, catalog, services] = await Promise.all([db.siteContent.findUniqueOrThrow({where: {id: "main"}}), databaseCatalog(), readServices()]);
  const published = {[websiteField.id]:websiteField.value,...record.published as ContentValues};
  const draft = {[websiteField.id]:websiteField.value,...record.draft as ContentValues};
  published[WEBSITE_FIELD]=JSON.stringify({...websiteFromValues(published),services:services.services});
  draft[WEBSITE_FIELD]=JSON.stringify({...websiteFromValues(draft),services:services.services});
  return {version: record.version, draft, published, updatedAt: record.updatedAt.toISOString(), publishedAt: `${record.publishedAt?.toISOString() || ""}:services:${services.version}`, catalog};
}
export async function updateContent(version: number, values: ContentValues, publish: boolean, userId?: string): Promise<ContentDocument> {
  await db.$transaction(async tx => {
    const result = await tx.siteContent.updateMany({where: {id: "main", version}, data: {version: {increment: 1}, draft: values, ...(publish ? {published: values, publishedAt: new Date()} : {})}});
    if (result.count !== 1) throw new Error("CONFLICT");
    if (publish) {
      const vehicles = await tx.vehicle.findMany({where: {contentIndex: {not: null}}});
      for (const vehicle of vehicles) {const prefix = `vehicle.${vehicle.contentIndex}`; await tx.vehicle.update({where: {id: vehicle.id}, data: {name: values[`${prefix}.name`] ?? vehicle.name, description: values[`${prefix}.description`] ?? vehicle.description, image: values[`${prefix}.image`] ?? vehicle.image, passengers: Number(values[`${prefix}.passengers`] ?? vehicle.passengers), luggage: Number(values[`${prefix}.bags`] ?? vehicle.luggage), version: {increment: 1}}});}
      const routes = await tx.fare.findMany({where: {contentIndex: {not: null}}});
      for (const route of routes) {const prefix = `route.${route.contentIndex}`; const [from, to] = route.route.split(" → "); await tx.fare.update({where: {id: route.id}, data: {route: `${values[`${prefix}.0`] ?? from} → ${values[`${prefix}.1`] ?? to}`, caption: values[`${prefix}.2`] ?? route.caption, image: values[`${prefix}.3`] ?? route.image, version: {increment: 1}}});}
      const locations = await tx.location.findMany({where: {contentIndex: {not: null}}});
      for (const location of locations) await tx.location.update({where: {id: location.id}, data: {name: values[`location.${location.contentIndex}`] ?? location.name, version: {increment: 1}}});
      await tx.siteSettings.update({where: {id: "main"}, data: {name: values["company.name"], description: values["company.description"], phone: values["contact.phone"], email: values["contact.email"], version: {increment: 1}}});
    }
    await tx.auditLog.create({data: {userId, action: publish ? "publish" : "save-draft", resource: "content", recordId: "main"}});
  });
  return readContent();
}
