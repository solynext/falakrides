# Booking confirmation email

The booking form requires an email address and saves requests through `/api/bookings`. A successful submission returns a reference and remains Pending until confirmed by an administrator. WhatsApp remains available as an optional follow-up after submission.

The email entered at booking time is stored in `Booking.customerEmail`, independent of later changes to the customer profile. Admin booking editors show this email and preserve it when older API clients omit the email field. Existing bookings without an email do not send a confirmation until an email is supplied.

When a booking changes to Confirmed, the same database transaction creates a Queued email notification. After commit, the backend sends it through the configured Gmail SMTP account (including the `GMAIL_USER` and `GMAIL_APP_PASSWORD` aliases), or Resend when Gmail is not configured. The message includes the reference, route, pickup date and Saudi Arabia time, vehicle, passengers, fare, and return details when applicable.

Saving an already confirmed booking does not create another confirmation. A rescheduled ride goes back to Pending and receives a new confirmation when confirmed again. Booking submissions retain their idempotency key across retries to avoid creating duplicate rides.

Email delivery failure leaves the booking Confirmed and records a Failed notification. The admin receives a retry warning and can retry from `/admin/notifications` or open the message through the notification center. Sent messages cannot be resent through the delivery endpoint. No live emails are sent by the unit or browser tests.

Apply `prisma migrate deploy` when deploying to another database, then generate the Prisma client. Migration `202610180001_booking_customer_email` adds the email snapshot column without modifying existing records.
