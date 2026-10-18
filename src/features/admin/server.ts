import {isSafePublicImage} from "@/features/content/website-model";
import {randomBytes} from "node:crypto";
import {z} from "zod";
import {db} from "@/lib/db";
import {canAccess} from "@/lib/auth";
import {digest, HttpError} from "@/lib/security/http";
import {modules} from "./data/modules";
import type {ContentValues} from "@/features/content/types";
import type {AdminRow} from "./types";
import type {Prisma} from "@/generated/prisma/client";
import {queueBookingConfirmation} from "@/features/bookings/confirmation";
import {deliverNotification} from "./notifications";

type Row = Record<string, unknown>;
type Delegate = {
  findMany: (args?: Row) => Promise<Row[]>;
  findUnique: (args: Row) => Promise<Row | null>;
  create: (args: Row) => Promise<Row>;
  update: (args: Row) => Promise<Row>;
  delete: (args: Row) => Promise<Row>;
};
const names: Record<string, string> = {bookings: "booking", customers: "customer", drivers: "driver", vehicles: "vehicle", fares: "fare", areas: "serviceArea", offers: "offer", payments: "payment", feedback: "feedback", notifications: "notification", roles: "user"};
function table(client: Prisma.TransactionClient | typeof db, module: string): Delegate {
  const name = names[module];
  if (!name) throw new HttpError(404, "Unknown module.");
  return (client as unknown as Record<string, Delegate>)[name];
}
const includes = (module: string) => module === "bookings" ? {driver: true, vehicle: true} : module === "payments" ? {booking: true} : module === "notifications" ? {booking: true} : module === "customers" ? {_count: {select: {bookings: {where: {status: "Completed"}}}}} : undefined;
export function serialize(module: string, record: Row): AdminRow {
  const result: AdminRow = {id: String(record.id), _version: String(record.version ?? 1), _createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt || "")};
  for (const field of modules[module].fields) {
    const value = record[field.key];
    result[field.key] = value == null ? "" : String(value);
  }
  if (module === "bookings") {
    result.id = String(record.reference);
    result.customer = String(record.customerName);
    result.email = String(record.customerEmail || "");
    result.route = `${record.pickup} → ${record.destination}`;
    result.fare = record.fare == null ? "" : String(Number(record.fare) / 100);
    result.driver = (record.driver as Row | null)?.id ? String((record.driver as Row).id) : "Unassigned";
    result.vehicle = (record.vehicle as Row | null)?.id ? String((record.vehicle as Row).id) : "Unassigned";
    result._vehicleName = String(record.vehicleName || "");
  }
  if (module === "payments" || module === "notifications") {
    const booking = record.booking as Row | null;
    result.booking = String(booking?.reference || "");
    if (module === "payments") {result.customer = String(booking?.customerName || ""); result.amount = String(Number(record.amount) / 100); result._paidAt = record.paidAt instanceof Date ? record.paidAt.toISOString() : "";}
  }
  if (module === "fares") for (const key of ["fare", "hourly", "waiting"]) result[key] = record[key] == null ? "" : String(Number(record[key]) / 100);
  if (module === "customers") result.trips = String((record._count as {bookings?: number} | undefined)?.bookings ?? 0);
  return result;
}
export async function adminSnapshot(user: {id: string; role: string}) {
  const data: Record<string, AdminRow[]> = Object.fromEntries(Object.keys(modules).map(key => [key, []]));
  await Promise.all(Object.keys(names).filter(key => canAccess(user.role, key)).map(async key => {
    const records = await table(db, key).findMany({orderBy: {createdAt: "desc"}, include: includes(key)});
    data[key] = records.map(record => serialize(key, record));
  }));
  // Surface incoming inquiries in the existing feedback workflow.
  const settings = canAccess(user.role, "settings") ? await db.siteSettings.findUniqueOrThrow({where: {id: "main"}}) : null;
  const notices = await db.noticeState.findMany({where: {userId: user.id}});
  return {data, settings, notices, user: {id: user.id, name: (await db.user.findUniqueOrThrow({where: {id: user.id}})).name, role: user.role}};
}
const clean = z.string().trim().max(1500).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), "Invalid characters.");
function validate(module: string, input: unknown) {
  const definition = modules[module];
  if (!definition || !names[module]) throw new HttpError(404, "Unknown module.");
  const shape: Record<string, z.ZodType> = {};
  for (const field of definition.fields) {
    let schema = clean;
    if (field.required) schema = schema.min(1, `${field.label} is required.`);
    if (field.type === "email") schema = schema.refine(value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email.");
    if (field.type === "tel") schema = schema.refine(value => !value || /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15, "Enter a valid contact number.");
    if (field.type === "number") schema = schema.refine(value => !value || /^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 10000000, `${field.label} must be a valid non-negative number.`);
    if (field.type === "select" && !["driver", "vehicle"].includes(field.key)) schema = schema.refine(value => !value && field.key === "rating" || !!field.options?.includes(value), `Choose a valid ${field.label.toLowerCase()}.`);
    if (field.type === "date") schema = schema.refine(value => !value && !field.required || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)), "Enter a valid date.");
    if (field.key === "image") schema = schema.refine(value => !value || isSafePublicImage(value), "Use a local /images/ path or Unsplash photo ID.");
    shape[field.key] = (["category", "description", "image", "caption"].includes(field.key) || module === "bookings" && field.key === "email") ? schema.optional() : schema;
  }
  shape.id = z.string().optional(); shape._version = z.string().optional(); shape._createdAt = z.string().optional();
  return z.object(shape).strip().parse(input) as Record<string, string>;
}
const money = (value: string) => {const [whole, fraction = ""] = value.split("."); return Number(whole || 0) * 100 + Number(fraction.padEnd(2, "0"));};
async function mutationData(tx: Prisma.TransactionClient, module: string, row: Record<string, string>, existing: Row | null) {
  const data: Row = Object.fromEntries(modules[module].fields.map(field => [field.key, row[field.key] ?? ""]));
  for (const key of ["category", "description", "image", "caption"]) if (existing && modules[module].fields.some(field=>field.key===key) && row[key] === undefined) data[key] = existing[key] ?? "";
  if (module === "bookings") {
    const [pickup, destination, extra] = row.route.split(/\s*(?:→|->)\s*/);
    if (!pickup || !destination || extra) throw new HttpError(400, "Enter the route as Pickup → Destination.");
    const pickupAt = new Date(`${row.date}T${row.time}:00+03:00`);
    if (Number.isNaN(pickupAt.getTime()) || pickupAt.toLocaleDateString("en-CA", {timeZone: "Asia/Riyadh"}) !== row.date) throw new HttpError(400, "Enter a valid pickup date and time.");
    const driver = row.driver === "Unassigned" ? null : await tx.driver.findUnique({where: {id: row.driver}});
    const vehicle = row.vehicle === "Unassigned" ? null : await tx.vehicle.findUnique({where: {id: row.vehicle}});
    if (row.driver !== "Unassigned" && !driver || row.vehicle !== "Unassigned" && !vehicle) throw new HttpError(400, "Choose an existing driver and vehicle.");
    const passengers = Number(row.passengers);
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > 30 || vehicle && passengers > vehicle.passengers) throw new HttpError(400, "The selected vehicle must fit all passengers.");
    if (vehicle?.status === "Maintenance" || driver?.status === "Off duty") throw new HttpError(400, "The selected driver or vehicle is unavailable.");
    if (row.status === "Confirmed" && (!driver || !vehicle || !row.fare)) throw new HttpError(400, "Assign a driver, vehicle, and fare before confirming.");
    const customerId = existing ? String(existing.customerId) : (await tx.customer.create({data: {name: row.customer, phone: row.phone, email: row.email || ""}})).id;
    return {customerId, customerName: row.customer, customerEmail: row.email ?? String(existing?.customerEmail || ""), phone: row.phone, pickup, destination, date: row.date, time: row.time, pickupAt, passengers, fare: row.fare ? money(row.fare) : null, status: row.status, driverId: driver?.id ?? null, vehicleId: vehicle?.id ?? null, vehicleName: vehicle?.name || String(existing?.vehicleName || ""), notes: row.notes, ...(!existing ? {reference: `FR-${randomBytes(6).toString("hex").toUpperCase()}`, idempotencyKey: `admin-${randomBytes(24).toString("hex")}`, luggage: 0, stops: []} : {})};
  }
  if (module === "customers") delete data.trips;
  if (module === "vehicles") {
    for (const key of ["passengers", "luggage"]) {data[key] = Number(row[key]); if (!Number.isInteger(data[key]) || Number(data[key]) < (key === "passengers" ? 1 : 0) || Number(data[key]) > 30) throw new HttpError(400, "Vehicle capacities must be whole numbers from 0 to 30.");}
    data.category = row.category || String(existing?.category || "Economy");
  }
  if (module === "fares") for (const key of ["fare", "hourly", "waiting"]) data[key] = row[key] ? money(row[key]) : key === "fare" ? null : 0;
  if (module === "fares" && !existing) {data.featured = true; data.image = row.image || "/images/header-background.jpg";}
  if (module === "offers") {data.discount = Number(row.discount); if (!Number.isInteger(data.discount) || Number(data.discount) > 100) throw new HttpError(400, "Discount must be a whole number from 0 to 100.");}
  if (module === "feedback") {data.rating = row.type === "Inquiry" ? null : Number(row.rating); if (row.type !== "Inquiry" && !row.rating) throw new HttpError(400, "Choose a rating.");}
  if (module === "payments" || module === "notifications") {
    const booking = row.booking ? await tx.booking.findUnique({where: {reference: row.booking}}) : null;
    if (row.booking && !booking || module === "payments" && !booking) throw new HttpError(400, "Choose an existing booking reference.");
    delete data.booking; data.bookingId = booking?.id ?? null;
    if (module === "notifications" && row.status !== "Draft" && row.status !== existing?.status) throw new HttpError(400, "Use Send notification to deliver a message; delivery status is managed by the server.");
    if (module === "notifications" && existing && ["Sending", "Sent"].includes(String(existing.status))) throw new HttpError(409, "Create a new draft instead of changing a message that has already been sent.");
    if (module === "payments") {
      delete data.customer; data.amount = money(row.amount);
      if (existing?.providerId && (row.method !== existing.method || data.amount !== existing.amount || booking?.id !== existing.bookingId)) throw new HttpError(400, "Verified provider payment details cannot be changed manually.");
      if (row.method === "Card" && row.status !== "Pending" && row.status !== existing?.status) throw new HttpError(400, "Card payments and refunds require a verified payment-provider transaction.");
      if (row.status === "Refunded" && existing?.status !== "Paid" && existing?.status !== "Refunded") throw new HttpError(400, "Only a paid payment can be refunded.");
      data.paidAt = row.status === "Paid" ? existing?.paidAt || new Date() : existing?.paidAt || null;
    }
  }
  if (module === "roles") {data.email = row.email.toLowerCase(); if (!existing) {data.id = randomBytes(16).toString("hex"); data.emailVerified = false; data.status = "Invited";}}
  return data;
}
async function syncPublicRecord(tx: Prisma.TransactionClient, module: string, record: Row) {
  if (!["vehicles", "fares", "areas", "offers", "feedback"].includes(module)) return;
  const values: ContentValues = {};
  if (record.contentIndex != null) {
    const index = record.contentIndex;
    if (module === "vehicles") for (const [field, key] of [["name", "name"], ["description", "description"], ["image", "image"], ["passengers", "passengers"], ["bags", "luggage"]]) values[`vehicle.${index}.${field}`] = String(record[key]);
    if (module === "areas") values[`location.${index}`] = String(record.name);
    if (module === "fares") {const [from, to = ""] = String(record.route).split(/\s*→\s*/); for (const [position, value] of [from, to, record.caption, record.image].entries()) values[`route.${index}.${position}`] = String(value);}
  }
  const content = await tx.siteContent.findUniqueOrThrow({where: {id: "main"}});
  await tx.siteContent.update({where: {id: "main", version: content.version}, data: {publishedAt: new Date(), ...(Object.keys(values).length ? {version: {increment: 1}, draft: {...content.draft as ContentValues, ...values}, published: {...content.published as ContentValues, ...values}} : {})}});
}
export async function writeRecord(module: string, input: unknown, user: {id: string; role: string}, id?: string) {
  if (!canAccess(user.role, module, true)) throw new HttpError(403, "Your role does not allow this action.");
  const row = validate(module, input);
  const result = await db.$transaction(async tx => {
    if (module === "roles") await tx.$queryRaw`SELECT pg_advisory_xact_lock(7264101)::text`;
    const where = module === "bookings" ? {reference: id} : {id};
    const existing = id ? await table(tx, module).findUnique({where}) : null;
    if (id && !existing) throw new HttpError(404, "Record not found.");
    if (existing && Number(row._version) !== Number(existing.version ?? 1)) throw new HttpError(409, "Someone else updated this record. Refresh before saving.");
    if (module === "roles" && existing?.id === user.id && (row.role !== "Administrator" || row.status !== "Active")) throw new HttpError(400, "You cannot disable your own administrator access.");
    if (module === "roles" && existing?.role === "Administrator" && existing.status === "Active" && (row.role !== "Administrator" || row.status !== "Active") && await tx.user.count({where: {role: "Administrator", status: "Active"}}) <= 1) throw new HttpError(400, "Keep at least one active administrator.");
    const data = await mutationData(tx, module, row, existing);
    if (existing) data.version = {increment: 1};
    const record = existing ? await table(tx, module).update({where: {...where, version: Number(row._version)}, data, include: includes(module)}) : await table(tx, module).create({data, include: includes(module)});
    let invitation: string | undefined;
    if (module === "roles" && !existing) {
      const token = randomBytes(32).toString("hex");
      await tx.verification.create({data: {id: randomBytes(16).toString("hex"), identifier: `invite:${digest(token)}`, value: String(record.id), expiresAt: new Date(Date.now() + 86400000)}});
      invitation = `/register?token=${token}`;
    }
    if (module === "roles" && (row.status !== "Active" || existing?.role !== row.role)) await tx.session.deleteMany({where: {userId: String(record.id)}});
    await tx.auditLog.create({data: {userId: user.id, action: existing ? "update" : "create", resource: module, recordId: String(record.id)}});
    await syncPublicRecord(tx, module, record);
    const notificationId = module === "bookings" ? await queueBookingConfirmation(tx, record, existing?.status) : null;
    return {row: serialize(module, record), invitation, notificationId};
  });
  const {notificationId, ...response} = result;
  if (notificationId) {
    try {await deliverNotification(notificationId);} catch {
      return {...response, warning: "Booking confirmed. The confirmation email could not be sent; retry it from Notifications."};
    }
  }
  return response;
}
export async function deleteRecord(module: string, id: string, version: number, user: {id: string; role: string}) {
  if (!canAccess(user.role, module, true)) throw new HttpError(403, "Your role does not allow this action.");
  await db.$transaction(async tx => {
    if (module === "roles") await tx.$queryRaw`SELECT pg_advisory_xact_lock(7264101)::text`;
    const where = module === "bookings" ? {reference: id} : {id};
    const record = await table(tx, module).findUnique({where});
    if (!record) throw new HttpError(404, "Record not found.");
    if (module === "roles") {
      if (id === user.id || record.role === "Administrator" && record.status === "Active" && await tx.user.count({where: {role: "Administrator", status: "Active"}}) <= 1) throw new HttpError(400, "Keep your own account and at least one active administrator.");
    } else if (record.version !== version) throw new HttpError(409, "Someone else updated this record. Refresh before removing it.");
    await table(tx, module).delete({where: {...where, ...(module !== "roles" ? {version} : {})}});
    await tx.auditLog.create({data: {userId: user.id, action: "delete", resource: module, recordId: String(record.id)}});
    if (["vehicles", "fares", "areas", "offers", "feedback"].includes(module)) await tx.siteContent.update({where: {id: "main"}, data: {publishedAt: new Date()}});
  });
}
