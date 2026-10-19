import type {Prisma} from "@/generated/prisma/client";

export function bookingConfirmationMessage(booking: Record<string, unknown>) {
  const fare = booking.fare == null ? "To be confirmed" : `SAR ${(Number(booking.fare) / 100).toFixed(2)}`;
  return [
    `Hello ${booking.customerName},`, "", "Congratulations! Your Falak Rides booking is confirmed. We look forward to welcoming you on board.", "",
    `Booking reference: ${booking.reference}`, `Pickup: ${booking.pickup}`, `Destination: ${booking.destination}`,
    `Pickup date: ${booking.date}`, `Pickup time: ${booking.time} (Saudi Arabia time, GMT+3)`,
    ...(booking.journey === "round-trip" ? [`Return: ${booking.returnDate} at ${booking.returnTime} (Saudi Arabia time)`] : []),
    `Vehicle: ${booking.vehicleName}`, `Passengers: ${booking.passengers}`, `Fare: ${fare}`, "",
    "Thank you for choosing Falak Rides. We look forward to your journey.",
  ].join("\n");
}

export async function queueBookingConfirmation(tx: Prisma.TransactionClient, booking: Record<string, unknown>, previousStatus?: unknown) {
  if (booking.status !== "Confirmed" || previousStatus === "Confirmed") return null;
  const email = String(booking.customerEmail || "").trim();
  if (!email) return null;
  const notification = await tx.notification.create({data: {
    id: `booking-confirmed:${booking.id}:${booking.version}`,
    bookingId: String(booking.id), recipient: email, channel: "Email", status: "Queued",
    message: bookingConfirmationMessage(booking),
  }});
  return notification.id;
}
