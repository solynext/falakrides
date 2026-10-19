# Website content management

The Website content screen in `/admin` stores its drafts and published content in Neon PostgreSQL through Prisma. The JSON snapshot in `data/public-website.snapshot.json` captures the current public content for review and seeding; the running website reads the database, not this snapshot.

## Access and editing

Sign in with an active admin account with content write permission. Website content uses the admin session directly; no separate PIN or editor lock is required.

Choose a section, edit its fields, then Save draft or Review & publish. Drafts remain private and survive reloads. Public pages poll for publications every five seconds and refresh on focus. The last successful data remains visible during a connection failure.

Version checks reject stale saves. Unsaved-change confirmation protects navigation. Failed saves retain your edits in memory, including when the admin session expires.

The existing structured editor manages headings, service copy, FAQs, benefits, steps, catalog names/images/capacities, featured routes, destinations, navigation labels, booking/inquiry text, WhatsApp text, footer, legal pages, and contact information. Publishing related catalog fields updates the corresponding relational records. The separate fleet, fare, service-area, offer, and settings screens also update the public database-backed catalog.

## Configuration and security

Set the pooled Neon `DATABASE_URL` and the direct `DIRECT_URL` in the ignored environment file. Database migrations use the direct connection. Application queries use the Neon serverless adapter. Back up the Neon database rather than local files.

Private API requests require the current account's content write permission. Writes validate origin, payload size, known field IDs, capacities, contact details, and image identifiers. Rate limits and audit records persist in PostgreSQL. Content is rendered as escaped React text; transactions and optimistic versions protect concurrent updates.

## Checks

With a running development server and a dedicated Neon test database, run the content and backend integration tests described in the root README. Do not run write-enabled tests against production content.
## Current public website

Open **Website content → Current public website** to manage the redesigned public pages. The editor starts with the site's existing three hero slides, three services, six vehicle-package preferences, six itineraries, six FAQs, nine homepage sections, and page text/images.

- Add, edit, duplicate, hide/show, reorder, search, and remove slides, services, vehicle packages, itineraries, and FAQs.
- Hide/show and reorder homepage sections.
- Edit navigation labels, homepage and footer copy, section images, benefits, booking steps, service descriptions/destinations, and package routes.
- Check content, restore the currently published content into the editor, save a private draft, review changed items, and publish.
- A service or vehicle-package page uses its editable slug. Published additions immediately have a public URL and menu entry. Hidden or removed entries leave menus/cards and their detail pages become unavailable.
- Public pages use the same stored `public.website` value as this editor. Publishing refreshes open public pages through the existing five-second poll. Save draft keeps the published site unchanged.

The `public.website` document is versioned within the existing `SiteContent` record. Structured server validation checks known fields, IDs, unique slugs, collection limits, section types, and image references. Historical content IDs remain valid for existing records; obsolete layout controls are hidden from the editor.

Run `npm run content:snapshot` to capture current published content, public catalog data, page inventory, design notes and image references into `data/public-website.snapshot.json`. Run `npm run content:seed` to fill missing fields from that snapshot in the database. Existing published edits and private drafts are preserved independently. The import validates content, checks versions, records an audit entry, and can be run again safely. No schema migration is required.

The content section also includes page-specific banners, policy paragraphs, contact cards, footer links, form labels and placeholders used by the current UI. These appear under their page or shared-section names. The admin dashboard and other admin sections are unchanged.

Image fields show a preview and an upload control. JPEG, PNG, WebP, GIF and AVIF uploads up to 8 MB go through the authenticated, same-origin, PIN-protected `/api/content/images` route to the configured Cloudinary account, under `CLOUDINARY_UPLOAD_FOLDER/website`. The Cloudinary secure URL becomes the selected field value; Save draft stores it in PostgreSQL, and publishing makes it public. Existing local images and Unsplash identifiers continue to work. API secrets stay on the server. Uploading alone does not publish an image or delete any existing asset.

**Vehicles** manages dispatch fleet records, capacities, category, description, image, and availability. **Fares & routes** manages live route prices, captions, images, and status. **Locations**, **Offers & packages**, **Reviews & complaints**, and **Settings** continue to synchronize their database-backed public data. Company name, description, phone, and email synchronize between Settings and website content publishing.
