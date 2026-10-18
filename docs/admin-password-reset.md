# Admin password reset

The sign-in page links to `/forgot-password`. The browser requests a code, verifies it, and submits the new password to Next.js. Only the backend generates or sends codes and updates credentials.

Set these server environment variables and restart the app:

```dotenv
GMAIL_SMTP_USER=your-account@gmail.com
GMAIL_SMTP_APP_PASSWORD=your-google-app-password
BETTER_AUTH_SECRET=your-existing-auth-secret
```

`GMAIL_USER` and `GMAIL_APP_PASSWORD` are also accepted as aliases. The `GMAIL_SMTP_*` settings take priority when provided.

Use a Google App Password with 2-Step Verification enabled, rather than your Gmail sign-in password. Nodemailer uses TLS on `smtp.gmail.com:465`. See [Nodemailer Gmail setup](https://nodemailer.com/guides/using-gmail) and [Google App Passwords](https://support.google.com/mail/answer/185833). Your host must allow outbound SMTP connections.

Only active users with the `Administrator` role and an existing password account are eligible. Request responses do not reveal whether an email is registered. SMTP failures are logged without the email, code, or credentials, and the failed challenge is removed. Missing SMTP configuration returns a service error for all emails.

Codes use cryptographically secure randomness, contain five digits, expire after five minutes, and allow five incorrect attempts. Resending invalidates the old challenge, with a one-minute cooldown and at most three requests per email per 15-minute window. Public endpoints also use the existing IP rate limiter; configure `TRUST_PROXY=true` only behind a trusted proxy that overwrites the IP header.

The existing `Verification` table stores a namespaced record with an HMAC of the code, attempt count, and user version. No database migration is required. Verification consumes the code and issues a five-minute reset token. Only its hash is stored in the database; the browser receives the token in an HttpOnly, SameSite=Strict cookie, marked Secure in production. It is never returned in response JSON or saved in browser storage.

Reset requires a matching token, active administrator status, unchanged user version, and a 12–128 character matching password. The backend hashes the new password using Better Auth's password hashing function. Password update, token consumption, audit logging, and revocation of all sessions happen in one transaction. Transaction-level database locks serialize requests for the same account.

No real email is sent by the unit tests. To verify delivery after configuring SMTP, request a code from `/forgot-password` using an active administrator email, enter the received code, set a new password, and sign in again.

After a successful password reset or a password change in admin settings, the backend sends a confirmation email to the account's stored email address through Gmail SMTP. It contains no password or reset code. Failed transactions do not send a confirmation. Delivery errors are logged without changing the successful password update into an error.

Password & security in admin settings asks for the old password and new password only. On success, all sessions are revoked and the browser signs out, then opens `/login` with a password-change success message. The settings form disables autocomplete and asks supported password managers to ignore its inputs; browser or extension settings may override these hints.
