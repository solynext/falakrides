import {randomBytes} from "node:crypto";
import {z} from "zod";
import {db} from "@/lib/db";
import {HttpError} from "@/lib/security/http";
import type {Booking} from "@/generated/prisma/client";

const text = (max: number) => z.string().trim().max(max);
export const bookingSchema = z.object({
  pickup: text(160).min(1), destination: text(160).min(1), stops: z.array(text(160).min(1)).max(8).default([]),
  timing: z.enum(["now", "later"]).default("later"), journey: z.enum(["one-way", "round-trip"]).default("one-way"),
  date: text(10).default(""), time: text(5).default(""), returnDate: text(10).default(""), returnTime: text(5).default(""),
  passengers: z.coerce.number().int().min(1).max(30), luggage: z.coerce.number().int().min(0).max(30),
  vehicle: text(100).min(1), name: text(80).min(1), phone: text(25).regex(/^\+?[\d\s()-]{8,25}$/, "Enter a valid contact number.").refine(value => value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15, "Enter a valid contact number."), notes: text(900).default(""),
  idempotencyKey: z.string().uuid(),
  email: z.string().trim().toLowerCase().pipe(z.union([z.email().max(254), z.literal("")])).default(""),
});
type Input = z.infer<typeof bookingSchema>;
export function publicBooking(record: Booking) {
  return {reference: record.reference, pickup: record.pickup, destination: record.destination, date: record.date, time: record.time, returnDate: record.returnDate, returnTime: record.returnTime, journey: record.journey, passengers: record.passengers, luggage: record.luggage, vehicle: record.vehicleName, name: record.customerName, email: record.customerEmail, phone: record.phone, notes: record.notes, stops: record.stops, status: record.status, fare: record.fare === null ? null : record.fare / 100, version: record.version};
}
async function validated(input: Input) {
  if (input.pickup.toLowerCase() === input.destination.toLowerCase()) throw new HttpError(400, "Choose different pickup and destination locations.");
  let date = input.date, time = input.time;
  const now = new Date();
  if (input.timing === "now") {const parts = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).formatToParts(now); const part = (name: string) => parts.find(item => item.type === name)!.value; date = `${part("year")}-${part("month")}-${part("day")}`; time = `${part("hour")}:${part("minute")}`;}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new HttpError(400, "Choose a valid pickup date and time.");
  const pickupAt = input.timing === "now" ? now : new Date(`${date}T${time}:00+03:00`);
  if (Number.isNaN(pickupAt.getTime()) || input.timing === "later" && pickupAt <= now) throw new HttpError(400, "Choose a future pickup date and time (Saudi Arabia time).");
  if (pickupAt.toLocaleDateString("en-CA", {timeZone: "Asia/Riyadh"}) !== date) throw new HttpError(400, "Choose a valid calendar date.");
  if (input.journey === "round-trip") {
    const returnAt = new Date(`${input.returnDate}T${input.returnTime}:00+03:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.returnDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.returnTime) || Number.isNaN(returnAt.getTime()) || returnAt <= pickupAt || returnAt.toLocaleDateString("en-CA", {timeZone: "Asia/Riyadh"}) !== input.returnDate) throw new HttpError(400, "Choose a valid return time after pickup.");
  }
  const vehicle = await db.vehicle.findFirst({where: {OR: [{id: input.vehicle}, {name: input.vehicle}], status: {not: "Maintenance"}}});
  const content = await db.siteContent.findUniqueOrThrow({where: {id: "main"}});
  const published = content.published as Record<string, string>;
  const preferences = ["booking.21", "booking.22", "booking.30", "booking.31"].map(key => published[key]).filter(Boolean);
  if (!vehicle && !preferences.includes(input.vehicle) || vehicle && (vehicle.passengers < input.passengers || vehicle.luggage < input.luggage)) throw new HttpError(400, "Choose an available vehicle with enough passenger and luggage space.");
  const fare = !vehicle || input.stops.length || input.journey === "round-trip" ? null : await db.fare.findFirst({where: {route: {equals: `${input.pickup} → ${input.destination}`, mode: "insensitive"}, status: "Active"}});
  return {date, time, pickupAt, vehicle, fare: fare?.fare ?? null};
}
export async function createBooking(input: Input, customerId: string) {
  const key = `${customerId}:${input.idempotencyKey}`;
  const existing = await db.booking.findUnique({where: {idempotencyKey: key}});
  if (existing) return publicBooking(existing);
  const data = await validated(input);
  try {
    const record = await db.$transaction(async tx => {
      await tx.customer.update({where: {id: customerId}, data: {name: input.name, phone: input.phone, ...(input.email ? {email: input.email} : {}), version: {increment: 1}}});
      return tx.booking.create({data: {reference: `FR-${randomBytes(6).toString("hex").toUpperCase()}`, idempotencyKey: key, customerId, customerName: input.name, customerEmail: input.email, phone: input.phone, pickup: input.pickup, destination: input.destination, stops: input.stops, date: data.date, time: data.time, pickupAt: data.pickupAt, returnDate: input.returnDate, returnTime: input.returnTime, journey: input.journey, passengers: input.passengers, luggage: input.luggage, vehicleId: data.vehicle?.id ?? null, vehicleName: data.vehicle?.name || input.vehicle, fare: data.fare, notes: input.notes, status: "Pending"}});
    });
    return publicBooking(record);
  } catch (error) {
    if ((error as {code?: string}).code === "P2002") {const duplicate = await db.booking.findUnique({where: {idempotencyKey: key}}); if (duplicate) return publicBooking(duplicate);}
    throw error;
  }
}
export async function updateBooking(reference: string, customerId: string, input: {action: "cancel" | "reschedule"; version: number; ride?: Input}) {
  const existing = await db.booking.findFirst({where: {reference, customerId}});
  if (!existing) throw new HttpError(404, "Booking not found.");
  if (!["Pending", "Confirmed", "Scheduled"].includes(existing.status)) throw new HttpError(409, "This booking can no longer be changed online.");
  if (existing.version !== input.version) throw new HttpError(409, "This booking changed. Refresh before updating it.");
  if (input.action === "cancel") return publicBooking(await db.booking.update({where: {id: existing.id, version: input.version}, data: {status: "Cancelled", version: {increment: 1}}}));
  if (!input.ride) throw new HttpError(400, "Pickup details are required.");
  const ride = bookingSchema.parse(input.ride);
  const data = await validated(ride);
  return publicBooking(await db.booking.update({where: {id: existing.id, version: input.version}, data: {pickup: ride.pickup, destination: ride.destination, date: data.date, time: data.time, pickupAt: data.pickupAt, stops: ride.stops, returnDate: ride.returnDate, returnTime: ride.returnTime, journey: ride.journey, passengers: ride.passengers, luggage: ride.luggage, vehicleId: data.vehicle?.id ?? null, vehicleName: data.vehicle?.name || ride.vehicle, fare: data.fare, notes: ride.notes, status: "Pending", driverId: null, version: {increment: 1}}}));
}
