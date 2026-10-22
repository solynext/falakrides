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
import {bookingItinerary} from "./booking-itinerary";
import {routeStops} from "./record-links";

type Row = Record<string, unknown>;
type Delegate = {
  findMany: (args?: Row) => Promise<Row[]>;
  findUnique: (args: Row) => Promise<Row | null>;
  create: (args: Row) => Promise<Row>;
  update: (args: Row) => Promise<Row>;
  delete: (args: Row) => Promise<Row>;
};
const names: Record<string, string> = {locations: "location", bookings: "booking", customers: "customer", drivers: "driver", vehicles: "vehicle", fares: "fare", offers: "offer", payments: "payment", feedback: "feedback", notifications: "notification", roles: "user"};
function table(client: Prisma.TransactionClient | typeof db, module: string): Delegate {
  const name = names[module];
  if (!name) throw new HttpError(404, "Unknown module.");
  return (client as unknown as Record<string, Delegate>)[name];
}
const includes = (module: string) => module === "bookings" ? {driver: true, vehicle: true} : module === "payments" ? {booking: true} : module === "notifications" ? {booking: true} : module === "offers" ? {vehicle:true} : module === "customers" ? {_count: {select: {bookings: {where: {status: "Completed"}}}}} : undefined;
export function serialize(module: string, record: Row): AdminRow {
  const result: AdminRow = {id: String(record.id), _version: String(record.version ?? 1), _createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt || "")};
  for (const field of modules[module].fields) {
    const value = record[field.key];
    result[field.key] = field.key==="serviceIds" ? JSON.stringify(value ?? []) : value == null ? "" : String(value);
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
    result.customerId=String(record.customerId || "");
  }
  if(module === "offers") {const vehicle=record.vehicle as Row|null|undefined;result.image=vehicle ? String(vehicle.image || "") : record.vehicle === null ? "" : String(record.image || "");}
  if (module === "payments" || module === "notifications") {
    const booking = record.booking as Row | null;
    result.booking = String(booking?.reference || "");
    if (module === "payments") {result.customer = String(booking?.customerName || ""); result.amount = String(Number(record.amount) / 100); result._paidAt = record.paidAt instanceof Date ? record.paidAt.toISOString() : "";}
  }
  if (module === "fares") for (const key of ["fare", "hourly", "waiting"]) result[key] = record[key] == null ? "" : String(Number(record[key]) / 100);
  if (module === "fares") {const [pickup,destination]=routeStops(String(record.route || ""));result.pickup=pickup;result.destination=destination;result.route=String(record.route || "");}
  if (module === "fares") {
    result.maxFare=record.maxFare == null ? result.fare : String(Number(record.maxFare)/100);
    result.priceRange=result.fare ? `SAR ${result.fare}${result.maxFare && result.maxFare !== result.fare ? ` – ${result.maxFare}` : ""}` : "";
  }
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
  if(canAccess(user.role,"locations") || canAccess(user.role,"fares")) {
    const catalog=await db.serviceCatalog.findUnique({where:{id:"main"}});
    const services=(catalog?.services || []) as {id:string;title:string}[];
    data.serviceCategories=services.map(service=>({id:service.id,name:service.title}));
    for(const location of data.locations)location._serviceNames=(JSON.parse(location.serviceIds) as string[]).map(id=>services.find(service=>service.id===id)?.title || "Unavailable service").join(", ") || "Unassigned";
  }
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
    if (field.type === "checkbox") schema = schema.refine(value => ["", "true", "false"].includes(value), "Choose a valid checkbox value.");
    if (field.type === "email") schema = schema.refine(value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email.");
    if (field.type === "tel") schema = schema.refine(value => !value || /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15, "Enter a valid contact number.");
    if (field.type === "number") schema = schema.refine(value => !value || /^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 10000000, `${field.label} must be a valid non-negative number.`);
    if (field.type === "select" && !["driver", "vehicle", "vehicleId", "serviceId"].includes(field.key)) schema = schema.refine(value => !value && field.key === "rating" || !!field.options?.includes(value), `Choose a valid ${field.label.toLowerCase()}.`);
    if (field.type === "date") schema = schema.refine(value => !value && !field.required || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)), "Enter a valid date.");
    if (field.key === "image") schema = schema.refine(value => !value || isSafePublicImage(value), "Use a local /images/ path or Unsplash photo ID.");
    if (field.key === "zipCode") schema = schema.max(20).refine(value => !value || /^[a-zA-Z0-9 -]+$/.test(value), "Enter a valid ZIP or postal code.");
    shape[field.key] = (!field.required && ["category", "description", "image", "caption", "zipCode", "destinations", "featured", "journey", "isSample"].includes(field.key) || module === "bookings" && ["email","dropoffDate","dropoffTime"].includes(field.key)) ? schema.optional() : schema;
  }
  shape.id = z.string().optional(); shape._version = z.string().optional(); shape._createdAt = z.string().optional();
  if(module === "bookings") {shape.customerId=clean.optional();shape.fareId=clean.optional();}
  if(module === "offers") {shape.discount=shape.discount.optional();shape.terms=shape.terms.optional();}
  if(module === "fares") shape.serviceId=clean.optional();
  if(module === "fares" && input && typeof input === "object") {
    const legacy=input as Record<string,unknown>;
    if(typeof legacy.route === "string" && legacy.pickup === undefined && legacy.destination === undefined) {const [pickup,destination]=routeStops(legacy.route);input={...legacy,pickup,destination};}
  }
  return z.object(shape).strip().parse(input) as Record<string, string>;
}
const money = (value: string) => {const [whole, fraction = ""] = value.split("."); return Number(whole || 0) * 100 + Number(fraction.padEnd(2, "0"));};
async function checkLocation(tx:Prisma.TransactionClient,value:string,previous?:unknown) {
  if(value === previous)return;
  if(!await tx.location.findFirst({where:{name:value,status:"Active"}}))throw new HttpError(400,"Choose an active location from Locations.");
}
async function mutationData(tx: Prisma.TransactionClient, module: string, row: Record<string, string>, existing: Row | null) {
  if (module === "vehicles") await tx.$queryRaw`SELECT pg_advisory_xact_lock(7264102)::text`;
  const data: Row = Object.fromEntries(modules[module].fields.map(field => [field.key, row[field.key] ?? ""]));
  if(module==="locations") {
    const catalog=await tx.serviceCatalog.findUnique({where:{id:"main"}});
    const services=(catalog?.services || []) as {id:string}[];
    let serviceIds:unknown;
    try {serviceIds=JSON.parse(row.serviceIds);}catch {throw new HttpError(400,"Select at least one service from Our Services.");}
    if(!Array.isArray(serviceIds)||!serviceIds.length||serviceIds.length>60||serviceIds.some(id=>typeof id!=="string"||!services.some(service=>service.id===id))||new Set(serviceIds).size!==serviceIds.length)throw new HttpError(400,"Select valid services from Our Services without duplicates.");
    data.serviceIds=serviceIds;
    if(!existing) {
      const name=row.name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,100).replace(/-$/g,"")||"location";
      data.slug=`${name}-${randomBytes(3).toString("hex").slice(0,5)}`;
      while(await tx.location.findUnique({where:{slug:String(data.slug)}}))data.slug=`${name}-${randomBytes(3).toString("hex").slice(0,5)}`;
    }
  }
  for (const key of ["category", "description", "image", "caption"]) if (existing && modules[module].fields.some(field=>field.key===key) && row[key] === undefined) data[key] = existing[key] ?? "";
  if (module === "bookings") {
    let itinerary;
    try {itinerary=bookingItinerary({pickup:row.pickup,destination:row.destination,date:row.date,time:row.time,dropoffDate:row.dropoffDate ?? String(existing?.dropoffDate || ""),dropoffTime:row.dropoffTime ?? String(existing?.dropoffTime || "")},!!existing);}
    catch(error) {throw new HttpError(400,error instanceof Error ? error.message : "Check the journey details.");}
    const {pickup,destination,pickupAt,dropoffDate,dropoffTime}=itinerary;
    await checkLocation(tx,pickup,existing?.pickup);await checkLocation(tx,destination,existing?.destination);
    if(row.fareId) {const ride=await tx.fare.findUnique({where:{id:row.fareId}});if(!ride || ride.status !== "Active" || ride.vehicleId && ride.vehicleId !== row.vehicle || routeStops(ride.route).join("→") !== [pickup,destination].join("→"))throw new HttpError(400,"The selected ride is unavailable or does not match these locations.");}
    const driver = row.driver === "Unassigned" ? null : await tx.driver.findUnique({where: {id: row.driver}});
    const vehicle = row.vehicle === "Unassigned" ? null : await tx.vehicle.findUnique({where: {id: row.vehicle}});
    if (row.driver !== "Unassigned" && !driver || row.vehicle !== "Unassigned" && !vehicle) throw new HttpError(400, "Choose an existing driver and vehicle.");
    const passengers = Number(row.passengers);
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > 30 || vehicle && passengers > vehicle.passengers) throw new HttpError(400, "The selected vehicle must fit all passengers.");
    if (vehicle?.status === "Maintenance" || driver?.status === "Off duty") throw new HttpError(400, "The selected driver or vehicle is unavailable.");
    if (row.status === "Confirmed" && (!driver || !vehicle || !row.fare)) throw new HttpError(400, "Assign a driver, vehicle, and fare before confirming.");
    const selectedCustomer=row.customerId ? await tx.customer.findUnique({where:{id:row.customerId}}) : null;
    if(row.customerId && !selectedCustomer)throw new HttpError(400,"Choose an existing customer or add a new customer.");
    if(selectedCustomer && selectedCustomer.name !== row.customer)throw new HttpError(400,"The selected customer's name changed. Select the customer again.");
    const customerId = selectedCustomer?.id || (existing && row.customerId === undefined ? String(existing.customerId) : (await tx.customer.create({data: {name: row.customer, phone: row.phone, email: row.email || ""}})).id);
    return {customerId, customerName: row.customer, customerEmail: row.email ?? String(existing?.customerEmail || ""), phone: row.phone, pickup, destination, date: row.date, time: row.time, pickupAt, dropoffDate, dropoffTime, passengers, fare: row.fare ? money(row.fare) : null, status: row.status, driverId: driver?.id ?? null, vehicleId: vehicle?.id ?? null, vehicleName: vehicle?.name || String(existing?.vehicleName || ""), notes: row.notes, ...(!existing ? {reference: `FR-${randomBytes(6).toString("hex").toUpperCase()}`, idempotencyKey: `admin-${randomBytes(24).toString("hex")}`, luggage: 0, stops: []} : {})};
  }
  if (module === "customers") delete data.trips;
  if(module === "drivers" && row.vehicle && row.vehicle !== "Unassigned") {
    const vehicle=await tx.vehicle.findFirst({where:{OR:[{id:row.vehicle},{name:row.vehicle}]}});
    if(!vehicle)throw new HttpError(400,"Choose an existing vehicle.");
    data.vehicle=vehicle.id;
  } else if(module === "drivers")data.vehicle="";
  if(module === "drivers")await checkLocation(tx,row.city,existing?.city);
  if (module === "vehicles") {
    for (const key of ["passengers", "luggage"]) {data[key] = Number(row[key]); if (!Number.isInteger(data[key]) || Number(data[key]) < (key === "passengers" ? 1 : 0) || Number(data[key]) > 30) throw new HttpError(400, "Vehicle capacities must be whole numbers from 0 to 30.");}
    data.category = row.category || String(existing?.category || "");
    if (!data.category || data.category !== existing?.category && !await tx.vehicleCategory.findUnique({where:{name:String(data.category)}})) throw new HttpError(400, "Choose a category created by an administrator.");
  }
  if (module === "fares") {
    const serviceId = row.serviceId === undefined ? String(existing?.serviceId || "") : row.serviceId;
    if (serviceId && serviceId !== existing?.serviceId) {
      const catalog = await tx.serviceCatalog.findUnique({where: {id: "main"}});
      const services = (catalog?.services || []) as {id:string}[];
      if (!services.some(service => service.id === serviceId)) throw new HttpError(400, "Choose a service category from Our Services.");
    }
    data.serviceId = serviceId || null;
    const [oldPickup,oldDestination]=routeStops(String(existing?.route || ""));
    await checkLocation(tx,row.pickup,oldPickup);await checkLocation(tx,row.destination,oldDestination);
    if(row.pickup.toLowerCase() === row.destination.toLowerCase())throw new HttpError(400,"Choose different pickup and drop-off locations.");
    data.route=`${row.pickup} → ${row.destination}`;delete data.pickup;delete data.destination;
    const vehicle=await tx.vehicle.findUnique({where:{id:row.vehicleId}});
    if(!vehicle)throw new HttpError(400,"Select a ride from Vehicles.");
    data.vehicleId=vehicle.id;
    data.fare=money(row.fare);data.maxFare=money(row.maxFare);
    if(Number(data.maxFare)<Number(data.fare))throw new HttpError(400,"Maximum price must be at least the minimum price.");
  }
  if (module === "fares") data.featured = row.featured === undefined ? Boolean(existing?.featured) : row.featured === "true";
  if (module === "fares" && !existing) { data.image = row.image || "/images/header-background.jpg";}
  if (module === "offers") {
    const vehicle=await tx.vehicle.findUnique({where:{id:row.vehicleId}});
    if(!vehicle)throw new HttpError(400,"Select an existing vehicle.");
    if(row.pickup.toLowerCase() === row.destination.toLowerCase())throw new HttpError(400,"Choose different pickup and drop-off locations.");
    await checkLocation(tx,row.pickup,existing?.pickup);await checkLocation(tx,row.destination,existing?.destination);
    const discount=row.discount === undefined ? Number(existing?.discount || 0) : Number(row.discount || 0);
    if(!Number.isInteger(discount) || discount<0 || discount>100)throw new HttpError(400,"Discount must be a whole percentage from 0 to 100.");
    return {...data,image:vehicle.image || "",discount,terms:row.terms ?? String(existing?.terms || ""),name:`${vehicle.name} · ${row.pickup} → ${row.destination}`,route:`${row.pickup} → ${row.destination}`,...(!existing ? {code:`OFFER-${randomBytes(8).toString("hex").toUpperCase()}`,validUntil:"9999-12-31",status:"Active"} : {})};
  }
  if (module === "feedback") {
    data.featured = row.featured === "true";
    data.isSample = row.isSample === "true";
    data.journey = row.journey ?? String(existing?.journey || "");
    if (data.featured && (row.type !== "Review" || row.status !== "Approved")) throw new HttpError(400, "Approve the review before featuring it on the homepage.");
    if (row.type === "Review") {
      const rating = Number(row.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Choose a star rating from 1 to 5.");
      data.rating = rating;
      if (row.status === "Resolved") throw new HttpError(400, "Choose Pending or Approved for a review.");
    } else {
      data.rating = null;
      if (row.status === "Approved") throw new HttpError(400, "Only reviews can be approved for the homepage.");
    }
  }
  if (module === "payments" || module === "notifications") {
    const booking = row.booking ? await tx.booking.findUnique({where: {reference: row.booking}}) : null;
    if (row.booking && !booking || module === "payments" && !booking) throw new HttpError(400, "Choose an existing booking reference.");
    delete data.booking; data.bookingId = booking?.id ?? null;
    if(module === "notifications" && booking) {const recipient=row.channel === "Email" ? booking.customerEmail : booking.phone;if(!recipient)throw new HttpError(400,"The selected booking has no contact details for this channel.");data.recipient=recipient;}
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
  if (!["vehicles", "fares", "locations", "offers", "feedback"].includes(module)) return;
  const values: ContentValues = {};
  if (record.contentIndex != null) {
    const index = record.contentIndex;
    if (module === "vehicles") for (const [field, key] of [["name", "name"], ["description", "description"], ["image", "image"], ["passengers", "passengers"], ["bags", "luggage"]]) values[`vehicle.${index}.${field}`] = String(record[key]);
    if (module === "locations") values[`location.${index}`] = String(record.name);
    if (module === "fares") {const [from, to = ""] = String(record.route).split(/\s*→\s*/); for (const [position, value] of [from, to, record.caption, record.image].entries()) values[`route.${index}.${position}`] = String(value);}
  }
  const content = await tx.siteContent.findUniqueOrThrow({where: {id: "main"}});
  await tx.siteContent.update({where: {id: "main", version: content.version}, data: {publishedAt: new Date(), ...(Object.keys(values).length ? {version: {increment: 1}, draft: {...content.draft as ContentValues, ...values}, published: {...content.published as ContentValues, ...values}} : {})}});
}
export async function writeRecord(module: string, input: unknown, user: {id: string; role: string}, id?: string, options:{notifyConfirmation?:boolean}={}) {
  if (!canAccess(user.role, module, true)) throw new HttpError(403, "Your role does not allow this action.");
  const row = validate(module, input);
  const result = await db.$transaction(async tx => {
    if(module==="locations")await tx.serviceCatalog.updateMany({where:{id:"main"},data:{version:{increment:1}}});
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
    const notificationId = module === "bookings" && options.notifyConfirmation !== false ? await queueBookingConfirmation(tx, record, existing?.status) : null;
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
    if(module==="locations")await tx.serviceCatalog.updateMany({where:{id:"main"},data:{version:{increment:1}}});
    if (module === "roles") await tx.$queryRaw`SELECT pg_advisory_xact_lock(7264101)::text`;
    const where = module === "bookings" ? {reference: id} : {id};
    const record = await table(tx, module).findUnique({where});
    if (!record) throw new HttpError(404, "Record not found.");
    if (module === "roles") {
      if (id === user.id || record.role === "Administrator" && record.status === "Active" && await tx.user.count({where: {role: "Administrator", status: "Active"}}) <= 1) throw new HttpError(400, "Keep your own account and at least one active administrator.");
    } else if (record.version !== version) throw new HttpError(409, "Someone else updated this record. Refresh before removing it.");
    await table(tx, module).delete({where: {...where, ...(module !== "roles" ? {version} : {})}});
    await tx.auditLog.create({data: {userId: user.id, action: "delete", resource: module, recordId: String(record.id)}});
    if (["vehicles", "fares", "locations", "offers", "feedback"].includes(module)) await tx.siteContent.update({where: {id: "main"}, data: {publishedAt: new Date()}});
  });
}
