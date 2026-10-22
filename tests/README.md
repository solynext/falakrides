# Tests

Run `node --test tests/unit/*.test.mjs` for pure business logic, content validation, and export checks.

Backend and browser integration tests require a running development server, a dedicated Neon test database, and configured administrator credentials. Do not use a production Neon connection for write-enabled tests. Temporary test records are cleaned up after each run.

- `npm.cmd run test:backend`: authentication, role permissions, CRUD, validation, booking ownership/idempotency/cancellation, profiles, inquiries, publishing, and operational records.
- `node --test tests/integration/content.test.mjs`: public content visibility and required administrator authentication.
- `npm.cmd run test:browser`: profile saving, unsaved-change protection, browser navigation, real booking requests/cancellation, admin settings, and record dialogs. Uses installed Chrome through DevTools; override CHROME_PATH or TEST_BASE_URL as needed.

Run `npm.cmd run lint`, TypeScript checks, and `npm.cmd run build` for application validation. Tests do not require a local PostgreSQL server.

Responsive checks use installed Chrome without adding a browser dependency:

- `node tests/responsive.browser.mjs` checks public pages and linked detail pages at 320, 375, 390, 430, 768, 1024, and 1440 pixels. It writes screenshots and measurements to `.next/responsive-audit`. Set `RESPONSIVE_INTERACTIONS=1` to also check open navigation, search, contact, gallery, and admin record dialogs. Layout failures return a nonzero exit code.
- Set `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` to include authenticated admin routes. These checks open controls without saving forms. Without credentials, admin authentication is reported as unavailable.
- `node tests/responsive-fixture.mjs` serves the actual admin components with synthetic records at `http://localhost:3100`, using the already installed esbuild package. Set `TEST_BASE_URL` to that URL and `RESPONSIVE_ROUTES` to comma-separated admin paths when running the audit. The fixture blocks all writes and supplies local API responses; it checks layouts and controls, but does not validate authentication or real backend integration.
- `RESPONSIVE_WIDTHS`, `RESPONSIVE_ROUTES`, and `RESPONSIVE_OUTPUT` can narrow a run. The fixture replaces Next navigation and image wrappers for standalone rendering; use the real application for final authenticated integration testing.
For production-mode database/browser verification in PowerShell, use `$env:VERIFY_PRODUCTION = 'true'; node scripts/verify-isolated.mjs`. Add `$env:VERIFY_BROWSER_ONLY = 'true'` to run the browser checks alone. Verification creates and removes its own temporary database schema.
