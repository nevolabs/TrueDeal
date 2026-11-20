# Activate the Supabase implementation

The application now uses Supabase Auth and PostgreSQL. There is no automatic
fallback to demo accounts, seed orders or in-memory state.

## 1. Apply the database migrations

Target project: `fgcgmycoyxrkznskgkpa`. All four migrations were applied on
2026-11-19. The existing Auth account was preserved and its profile backfilled.
Hosted history matches all local versions; no operators, orders or payment
records were seeded. Do not rerun the initial SQL setup against this project.

The preferred workflow is password-based code migrations. Supabase CLI 3.2.0
is pinned as a development dependency. The wrapper loads the project's
database host/user/password from ignored `.env.local`, verifies TLS against
the included public Supabase CA, and supplies the password through child-process
environment variables rather than command-line arguments. It needs no browser
or personal access token:

```sh
npm run db:plan      # preview pending migrations; no schema changes
npm run db:migrate   # apply pending migrations to the target project
npm run db:status    # verify local and hosted migration history
npm run db:inspect   # read-only schema, permission and count checks
```

These commands use database authentication, not the browser publishable key or
the application's service key. `db:migrate` uses Supabase's migration history to apply
only pending files; it does not run the generated setup bundle. After a file
has been applied, make future changes in a new migration rather than editing
that applied file. No migrations run automatically during Next.js startup or
web requests. Vault updates and seed data are excluded from these commands.

This network cannot use the direct IPv6 hostname. The verified connection is
`aws-1-ap-southeast-1.pooler.supabase.com:5432`, user
`postgres.fgcgmycoyxrkznskgkpa`. See `.env.example` for variable names; never
commit the password. The public CA lives in `supabase/certs/`. A successful
preview is required before applying changes. `db:migrate` is an explicit
apply command and passes the CLI confirmation flag; it does not run at startup.

`db:login` and `db:link` remain available for optional account-management CLI
operations, but are not prerequisites for the configured migration commands.

For a project where the TrueDeal schema has not yet been installed, the simplest
SQL Editor option is the generated `supabase/setup.sql`: paste and run the entire
file. It combines all migrations in one transaction, so a failure rolls back the
whole setup. Regenerate it after changing migrations with `npm run db:bundle`.
Do not run initial setup again against an already installed schema.

Alternatively run these individual files, in order, in the project's Supabase SQL Editor:

1. `migrations/202611180001_marketplace.sql`
2. `migrations/202611180002_payments.sql`
3. `migrations/202611180003_storage.sql`
4. `migrations/202611180004_onboarding.sql`

Each migration is transactional. This is an initial schema: it does not
overwrite existing tables with the same names. Back up existing project data
before application. For a failed transaction fix the cause and rerun that
file. For application rollback restore the previous code with payments
disabled; do not drop financial tables to roll back code.

## 2. Configure Auth

`.env.local` already contains the supplied project URL and publishable key.
Use `.env.example` for the complete list of supported variables.

Set `NEXT_PUBLIC_SITE_URL` to the actual origin, for example
`http://localhost:3001` in development. Set the same Site URL in Supabase Auth
and allow the `/auth/confirm` redirect and recovery destination on your own
origin. Do not add arbitrary production redirect domains.

Enable email/password login and email confirmation. Configure SMTP for real
email delivery and review Supabase Auth rate limits before public use.

The confirmation handler supports PKCE `code` exchange and hashed email tokens.
For confirmation links that work across devices, use these email-template
destinations in Supabase:

```html
<!-- Confirm signup -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm email</a>

<!-- Reset password -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Sign up through `/login?mode=join`, confirm the email, and sign in using the
password. Password recovery starts at `/auth/forgot-password`. Existing demo
emails do not become real accounts automatically. The old `sellio_uid`
cookie is ignored, `POST /api/session` is gone, and `/api/reset` is gone.

## 3. Bootstrap an operator

Create and confirm the intended operator's Auth account first. Use its actual
UUID from the Supabase Auth dashboard, then run this through SQL Editor:

```sql
insert into public.user_roles(user_id, role)
values ('REPLACE_WITH_CONFIRMED_AUTH_USER_UUID', 'ops');
```

The placeholder intentionally is not a valid UUID. No operator is seeded.
User-editable metadata cannot grant this role. Review identity evidence through
your operational process before approving a seller; the app does not perform
automated PAN/Aadhaar or bank verification. The initial seller form only stores
the legal name and review status. Operators cannot approve their own seller
verification, listing or inspection.

## 4. Storage

Migration 3 creates a public `listing-photos` bucket and private
`order-evidence` bucket. The app supports JPEG/PNG/WebP uploads up to 5 MB.
Listing uploads are scoped to the signed-in user. Evidence is scoped to an
order and visible to its parties and authorized operators, with 60-second
signed URLs. Submitted evidence cannot be overwritten by browser users.
Video and PDF upload interfaces are not implemented.

## 5. Razorpay remains disabled

The user requested that payments remain off until Route is activated.
`PAYMENTS_ENABLED` defaults to false. The UI disables checkout and the server
rejects payment work while disabled. Normal account, seller review and listing
flows do not need a server secret key.

After provider eligibility and funds-flow acceptance, configure server-side:

```dotenv
SUPABASE_SECRET_KEY=your-server-only-supabase-key
PAYMENTS_ENABLED=true
RAZORPAY_KEY_ID=your-test-key-id
RAZORPAY_KEY_SECRET=your-test-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
CRON_SECRET=at-least-32-random-characters
```

Use test credentials and a separate staging project first. A key beginning
`rzp_live_` selects live mode; do not enable live mode before the sandbox pilot.
Never expose any of these server secrets as NEXT_PUBLIC variables.

For the initial release, create seller linked accounts and complete their Route
product activation in Razorpay's dashboard. An authenticated operator then
posts the following to `/api/sellers/onboarding` from this site's origin:

```json
{
  "sellerId": "SUPABASE_SELLER_UUID",
  "accountId": "acc_...",
  "productId": "acc_prd_..."
}
```

The endpoint checks the provider account email against the Auth user's email,
the Route product activation, and the separate seller review. The browser
cannot self-activate payouts or choose arbitrary beneficiaries. Changes to an
existing destination require separate review. Programmatic creation of new
linked accounts and a self-service onboarding wizard are not implemented.

Checkout uses one server-computed quote and one provider order per reservation.
The transfer allocation starts on hold. An uncertain create-order outcome is
blocked for manual reconciliation, never blindly retried. Provider fees and
tax allocation must be finalized before live use; the current quote preserves
the original product's fee rules and the ledger records gross amounts.

## 6. Webhooks and background processing

Configure `POST https://YOUR_ORIGIN/api/webhooks/razorpay` in Razorpay test mode
with the same webhook secret. Subscribe to payment capture/failure, transfer,
settlement, refund and payment-dispute events available for your Route account.
Raw-body signatures are checked before events enter the database. Duplicate
events and financial transitions are idempotent; reconciliation does not rely
on browser success or webhook arrival order.

Schedule an authenticated POST to `/api/internal/payments/run` every minute:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

Use a trusted scheduler configured outside the application. No scheduler has
been provisioned automatically. The endpoint processes bounded batches,
authorizes due releases, reconciles provider state and processes durable jobs.
Only confirmed bank settlement closes an order. A provider-side hold has no
automatic release date, so a missed scheduler run cannot release during a claim.

Review `webhook_events.status = 'manual_review'`,
`outbox_jobs.status = 'manual_review'`, `payment_operations.status = 'unknown'`,
and `payment_attempts.status = 'unknown'` in restricted operator tooling.
Do not reset these statuses or repeat a payment POST until its provider outcome
is known. Identify uncertain checkouts using the provider receipt
`td` plus the order UUID without hyphens. Bind a recovered provider order only
after checking INR amount, seller allocation and app-order notes.

Untouched unpaid reservations expire automatically. Once provider checkout
creation starts, expiry does not free the item blindly: a late captured payment
must not result in two sales. Such unpaid/uncertain checkout reservations need
reconciliation before cancellation. This conservative release intentionally
requires manual intervention rather than risking a duplicate sale.

Product claims freeze release. An upheld claim requires recorded return receipt
before refund. Refund and transfer reversal are checked separately. Closed/lost
payment disputes remain blocked for manual handling; only a won external dispute
clears that block. An issue raised after release authorization may require a
recovery workflow; settlement cannot be guaranteed recallable.

## Verification and remaining launch work

Run `npm test`, `npx tsc --noEmit`, `npm run build` and `npx eslint .`.
Database tests execute the actual migrations and functions in embedded
PostgreSQL (PGlite), with local stand-ins for Supabase's Auth and Storage schemas.
Payment contract tests mock the external HTTP boundary. These do not replace
an authenticated hosted Supabase/Razorpay staging test.

The current read model is designed for a small pilot. It assembles all
user-visible listings/orders in a database function; database-side pagination,
targeted queries and reconciliation scan retirement are required before large
catalogues or long-running financial histories. Courier booking, automatic
identity verification, notification delivery, detailed gateway fee/tax ledger
posting, chargeback recovery, monitoring dashboards and a scheduler deployment
are not supplied by these migrations. Set backup/restore, retention and refund
liquidity policies before handling real payments.
