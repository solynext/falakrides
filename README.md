# Falak Rides

Next.js App Router, React, TypeScript, PostgreSQL, Prisma, and Better Auth. The existing public website and admin dashboard retain their styles, layout, images, and marketing copy. Operational preview messages have been replaced where necessary to describe real persisted actions.

## Development with Neon

Requires Node.js 20.19+, npm, and a Neon PostgreSQL database. Installed Chrome is needed only for browser tests.

Configure `.env.local` using `.env.example`: set `DATABASE_URL` to the Neon pooled connection string and `DIRECT_URL` to its direct connection string for Prisma migrations. Set `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Use a unique secret and a password of at least 12 characters. Environment files are ignored by Git; never prefix database credentials with `NEXT_PUBLIC_`.

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:check
npm.cmd run dev
```

Open `http://localhost:3000` and sign in at `/login` using the configured administrator account. The application and seed use `@prisma/adapter-neon`; no local PostgreSQL server or local database files are required. Seeding is idempotent: it imports the existing public copy and declared catalog without fictional operational records, and does not reset existing administrator passwords or overwrite existing records.

## Connected features

- Admin CRUD for bookings, customers, drivers, vehicles, fares/routes, service areas, offers, feedback/inquiries, notifications, and team accounts.
- Admin roles are checked in server layouts and on every private API request. Administrator has full access; Dispatcher manages operations; Finance manages payments/fares; Viewer is read-only. Disabled accounts lose access immediately. Invitations are single-use and expire after 24 hours; public admin registration is disabled.
- Both existing booking forms persist Pending requests, generate server references, validate Saudi pickup times and capacity, and prevent duplicate submissions using idempotency keys. Only authorized staff confirm reservations.
- Customer profiles and booking history persist in PostgreSQL. An opaque HttpOnly visitor cookie grants access only to that browser's records; entering another person's email or phone never grants their booking history. `/my-bookings` supports cancellation and opens the existing popup for rescheduling.
- Inquiries are stored in the existing feedback workflow as Inquiry records, without fabricated review ratings. The existing email handoff remains available.
- Company contact details, published catalog changes, fares, offers, and CMS publications update the public site. Open public tabs poll every five seconds and refresh on focus. CMS drafts remain private and updates reject stale versions.
- Existing exports contain current database records. Revenue charts and reports derive from actual stored payment records and their dates. Amounts are integer halalas in the database and rendered in SAR.
- Profiles, forms, admin records, and CMS edits retain unsaved-change protection. Failed saves keep entered values; refresh/tab-close uses the browser warning. Expired content access keeps unsaved edits in memory for restoration after unlocking.
- Writes enforce same-origin requests, bounded JSON bodies, validation, database rate limits, and audit trails. Foreign keys protect related records; optimistic versions reject competing updates.

## External providers

Cloudinary media configuration uses server-only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and optional `CLOUDINARY_UPLOAD_FOLDER` (default `falakrides`). Server code can call `getCloudinary()` from `src/lib/cloudinary.ts`; the module prevents client imports. Next Image allows image upload URLs only from the configured cloud. Run `npm.cmd run cloudinary:check` to verify credentials without uploading or modifying media. Existing image storage and UI remain unchanged by environment setup. Configure the same variables in your hosting environment for deployment.

Database-backed cash and bank-transfer records work without external services. Recording a cash/bank refund records the staff action; it does not initiate a bank transfer.

Outbound Email uses Resend (`RESEND_API_KEY`, `EMAIL_FROM`); SMS and WhatsApp use Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and the corresponding sender). Sending fails clearly when a provider is unconfigured and never marks an unsent draft as sent. Provider acceptance does not guarantee recipient delivery.


Run `node --test tests/unit/*.test.mjs` for unit coverage. Run `node --conditions=react-server --import tsx tests/integration/change-password.ts` for an isolated database test of actual password hashing, concurrent password changes, and session revocation without changing live administrator credentials.


Administrators can change their own password in **Settings → Password & security**. The server requires an active administrator session, the current password, a different 12–128-character new password, and matching confirmation. Same-origin checks and database-backed rate limits protect the endpoint. The password hash, other-session revocation and audit entry are committed in one transaction; the current session stays signed in. Concurrent stale password changes are rejected. The isolated database test above also verifies this flow without changing live administrator credentials.

Optional hosted card checkout and card refunds use `STRIPE_SECRET_KEY`. Set `STRIPE_WEBHOOK_SECRET` and register `/api/payments/stripe/webhook` for `checkout.session.completed`, `checkout.session.expired`, `refund.created`, and `refund.updated`. Card payment status changes only after signature/amount/currency verification. The checkout endpoint is `/api/bookings/{reference}/checkout` for an owned, confirmed booking with a fare. The existing UI does not collect card details. Configure an account that supports the business before enabling card checkout.

No provider credentials were supplied during setup, so live card charges, external refunds, and message delivery have not been executed or claimed as tested. No messages were sent and no funds were moved during verification.

The map illustration and provided catalog photography are preserved visual content. They are not a live GPS, mapping, or fleet verification service.

## Production

### Vercel environment

The verified public deployment is `https://falak-ride.vercel.app` (with a hyphen). Set production `SITE_URL=https://falak-ride.vercel.app` and `BETTER_AUTH_URL=https://falak-ride.vercel.app`, unless a verified custom canonical domain replaces it. SEO URLs ignore malformed or loopback settings and fall back to the next configured production origin. The preview deployment hostname is never selected automatically for canonical URLs.

After deploying, verify `/robots.txt` returns `Allow: /` and a sitemap URL on the canonical domain. Verify `/sitemap.xml` contains `/jeddah-airport-to-makkah-taxi` and `/makkah-to-madinah-taxi`, both return HTTP 200, and each page's canonical URL uses the same domain. These pages read active route fares and listed vehicle capacities from the published catalog; do not copy prices into static marketing text. Exact route direction matters, and airport or Ziyarat destinations must not be matched as city transfers.

`.env.local` is deliberately excluded from GitHub and is not sent to Vercel. In Vercel, open the project **Settings → Environment Variables** and add these for **Production** (and **Preview** if used):

- `DATABASE_URL`: your Neon pooled PostgreSQL connection string.
- `DIRECT_URL`: your Neon direct connection string if migrations run there.
- `BETTER_AUTH_SECRET`: the configured authentication secret (at least 32 characters).
- `BETTER_AUTH_URL` and `SITE_URL`: the full deployed HTTPS origin.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and optionally `CLOUDINARY_UPLOAD_FOLDER`: the configured Cloudinary values.
- `CONTENT_ADMIN_PIN` and `CONTENT_SESSION_SECRET`: if the extra content editor lock is enabled.

Save the variables, then redeploy. Use values from your local environment or provider dashboard; never commit secrets. Existing admin credentials are already stored in Neon. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are only needed when running the initial database seed. Prisma client generation works without a database URL, but the full application still requires its database and authentication configuration.

Set `SITE_URL` and `BETTER_AUTH_URL` to the HTTPS origin, configure the Neon PostgreSQL database, configure provider accounts as needed, run migrations and seed once, then run `npm.cmd run build` and `npm.cmd start`. Initial admin credentials should be rotated before public deployment. Back up the Neon database and define the business's data retention policy.

The optional existing content PIN remains an additional editor lock when `CONTENT_ADMIN_PIN` and `CONTENT_SESSION_SECRET` are configured. Admin authentication and authorization are always required regardless of PIN configuration. Set `TRUST_PROXY=true` only when a trusted reverse proxy overwrites incoming client-IP headers.

## Validation

```powershell
npm.cmd run lint
node node_modules/typescript/bin/tsc --noEmit
node --test tests/unit/*.test.mjs
npm.cmd run test:backend
npm.cmd run test:browser
node scripts/verify-isolated.mjs
npm.cmd run build
```

Backend and browser integration tests require a dedicated Neon test database, seeded administrator, and running dev server. Do not point write-enabled integration tests at a production database. They create temporary records and clean up their own records. Browser tests use installed Chrome through DevTools; override `CHROME_PATH` and `TEST_BASE_URL` if needed. Tests do not contact payment or messaging providers.

The isolated verification runner creates a temporary schema in the configured Neon database, applies migrations, seeds a test administrator, starts a separate server on port 3123, runs integration and browser checks, and removes the schema afterward. It does not modify application records in the public schema.

See [backend analysis](docs/backend-analysis.md), [API notes](src/app/api/README.md), and [admin notes](src/features/admin/README.md).
