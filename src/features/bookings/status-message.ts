const updates:Record<string,string> = {
  Pending:"Your Falak Rides booking request is pending. Please wait while our team reviews your request. We will update you shortly.",
  Confirmed:"Congratulations! Your Falak Rides booking is confirmed. We look forward to welcoming you on board.",
  Scheduled:"Your Falak Rides ride is scheduled. Please be ready at your pickup location at the scheduled time.",
  Completed:"Your Falak Rides ride has been completed. Thank you for travelling with us. We hope to welcome you again soon.",
  Rejected:"We are sorry, we are unable to accept your Falak Rides booking request. Please contact us so we can help you explore alternatives.",
  Cancelled:"We are sorry, your Falak Rides ride has been cancelled. Please contact us if you need help arranging another ride.",
};
export function bookingStatusMessage(booking:Record<string,unknown>) {
  const status=String(booking.status || "Pending");
  const fare=booking.fare == null ? "To be confirmed" : `SAR ${(Number(booking.fare)/100).toFixed(2)}`;
  return [
    `Hello ${booking.customerName || ""},`,"",updates[status] || `Your Falak Rides booking status is ${status.toLowerCase()}.`,"",
    `Booking reference: ${booking.reference}`,`Status: ${status}`,
    `Pickup: ${booking.pickup}`,`Pickup date & time: ${booking.date} at ${booking.time} (KSA, GMT+3)`,
    `Drop-off: ${booking.destination}`,
    ...(booking.dropoffDate && booking.dropoffTime ? [`Drop-off date & time: ${booking.dropoffDate} at ${booking.dropoffTime} (KSA, GMT+3)`] : []),
    ...(booking.journey === "round-trip" ? [`Return: ${booking.returnDate} at ${booking.returnTime} (KSA, GMT+3)`] : []),
    `Vehicle: ${booking.vehicleName || "To be assigned"}`,`Passengers: ${booking.passengers}`,`Fare: ${fare}`,"",
    "For questions or changes, please contact Falak Rides.",
  ].join("\n");
}
