# Activate the Supabase implementation

The application now uses Supabase Auth and PostgreSQL. There is no automatic
fallback to demo accounts, seed orders or in-memory state.

On 2026-11-21 migration `202611210001_seller_details_and_gallery.sql` was applied.
Seller setup now validates individual PAN/IFSC syntax, account-number format,
confirmation and account-holder name without an operator queue. These are basic
checks, not identity or bank-ownership verification. Only masked endings and IFSC
are retained; payment onboarding and activation remain separate. Existing pending
sellers complete `/sell/verify` again to unlock listing. Listings require 1–8
owned Storage photos with ordered `listing_media` rows.

## 1. Apply the database migrations

Target project: `fgcgmycoyxrkznskgkpa`. All four migrations were applied on
2026-11-19. The existing Auth account was preserved and its profile backfilled.
Hosted history matches all local versions; no operators, orders or payment
records were seeded. Do not rerun the initial SQL setup against this project.

Migration `202611200001_storage_media.sql` was applied on 2026-11-20. It adds
the public, deployment-managed branding bucket, validates listing photo
ownership/existence and maintains canonical `listing_media` object paths.

Migration `202611200002_site_asset_formats.sql` was applied on 2026-11-20 for
trusted SVG provider-reference logos in the admin-managed site-assets bucket.
It does not allow user SVG uploads or change private evidence permissions.

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
5. `migrations/202611200001_storage_media.sql`
6. `migrations/202611200002_site_asset_formats.sql`

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

Enable email/password login and turn **Confirm email off**, as requested by the
owner on 2026-11-20. In Authentication → Sign In / Providers → Email, disable
Confirm email and save. Local `auth.email.enable_confirmations` is already false;
this local file does not change hosted settings. New signups should return a
session immediately, without sending a confirmation email. Password recovery
still uses email through the configured SMTP service. Existing unconfirmed
accounts are not bulk-confirmed or otherwise modified by this code change.

Hosted setting verified on 2026-11-20 after the owner saved it: Auth reports
email/password enabled and `mailer_autoconfirm=true`. A temporary account created
through the app signed in immediately, restored its cookie session, signed out
and signed back in with its password. That test account and profile were removed.

### Gmail SMTP for this project

On 2026-11-20 the owner reported configuring Gmail custom SMTP in the hosted
Supabase dashboard. Delivery has not yet been independently verified.
The app already calls Supabase Auth for signup and password recovery; those
requests automatically use the hosted SMTP settings. No Gmail client, separate
mail API, or SMTP credentials are needed in the Next.js application.

Use these values in Authentication → Emails → SMTP Settings:

| Field | Value |
| --- | --- |
| Sender email | The Gmail address you configured |
| Sender name | **TrueDeal** (replace `My App` if copied from the setup guide) |
| Host | `smtp.gmail.com` |
| Port | `465` for implicit TLS, or `587` for STARTTLS |
| Username | The same Gmail address as the sender |
| Password | The Google app password, saved in Supabase's SMTP settings |

See [Google's SMTP settings](https://developers.google.com/workspace/gmail/imap/imap-smtp)
and [Supabase's Google SMTP guide](https://supabase.com/kb/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y).
Saving SMTP settings does not install the TrueDeal email bodies; apply the
templates below separately. Changes to hosted SMTP take effect in Supabase
without rebuilding Next.js. Email/password signup uses the hosted confirmation
setting; it does not bypass Supabase Auth or create users with the admin key.

To verify the current flow, create an account through `/login?mode=join` with
an inbox you control and check that you are signed in immediately without a
confirmation email. Also request a password reset from
`/auth/forgot-password` and verify its link. An Invite User email tests SMTP,
but does not validate the application's signup confirmation template or flow.
If signup fails, use its displayed error and Supabase Auth logs to distinguish
SMTP authentication/delivery problems from rate limits or account validation.

### TrueDeal email branding (hosted setup required)

The repository includes branded confirmation and recovery HTML in
`supabase/templates/`, referenced by the local CLI configuration. Editing these
files does **not** change hosted Supabase Auth settings.

In the hosted project's Authentication email templates, set:

| Template | Subject | HTML body |
| --- | --- | --- |
| Confirm signup | Confirm your TrueDeal email | `supabase/templates/confirmation.html` |
| Reset password | Reset your TrueDeal password | `supabase/templates/recovery.html` |

Keep the hosted Site URL set to the actual website origin. These templates send
users to `/auth/confirm` with a hashed token; they do not expose an access token
or depend on the signup browser's PKCE verifier.

For the inbox sender to display **TrueDeal**, configure custom SMTP in the
hosted project's Authentication email settings: use sender name `TrueDeal`, a
sender address verified by your email provider, and that provider's SMTP host,
port and credentials. SMTP credentials belong only in Supabase's hosted SMTP
settings, never in browser environment variables. Do not invent a sender
domain or enable SMTP without working provider credentials.

If custom SMTP is disabled, the built-in email service is restricted to project team email addresses and
currently permits two emails per hour. Delivery restrictions and rate limits
can therefore reject signup even when the form is valid. See the official
[SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp) and
[rate limits](https://supabase.com/docs/guides/auth/rate-limits).

The confirmation handler supports PKCE `code` exchange and hashed email tokens.
For confirmation links that work across devices, use these email-template
destinations in Supabase:

```html
<!-- Confirm signup -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm email</a>

<!-- Reset password -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Sign up through `/login?mode=join` to sign in immediately, then use the same
email and password for later sign-ins. Password recovery starts at
`/auth/forgot-password`. Existing demo
emails do not become real accounts automatically. The old `sellio_uid`
cookie is ignored, `POST /api/session` is gone, and `/api/reset` is gone.

## Optional: sample sellers and catalogue

Activated on the hosted project on 2026-11-20: five confirmed sample Auth
accounts and 14 live demo listings. Anonymous browse, all product image/detail
responses, buyer/seller logins and disabled payment configuration were verified.

The owner requested dummy accounts and listings on 2026-11-20. The opt-in
catalogue script creates four confirmed sample seller Auth accounts, one
confirmed buyer Auth account and 14 live listings. Import photographs live in
`scripts/fixtures/catalog` and are uploaded to `listing-photos` before listings
are published; the website uses Storage URLs. Every title starts with `[Demo]`; descriptions
state that these items are sample data and are not offered for sale. Prices
are illustrative, stored as integer paise, with no invented sales history.

Preview without credentials or writes:

```sh
npm run demo:seed
```

To apply, set `SUPABASE_SECRET_KEY` and the existing database credentials in
ignored `.env.local`, keep payments disabled, then run:

```sh
npm run demo:seed -- --apply
```

Account creation uses Supabase's server-side Admin API with `email_confirm`:
reserved `.invalid` addresses do not receive email. Generated login passwords
are saved only in ignored `.demo-accounts.json`, not printed or committed.
Keep that file private. Existing non-demo Auth accounts are never updated,
confirmed or assigned roles. Rerunning reuses seed-owned accounts and preserves
existing listings, including any changes made after seeding. The one migration
exception replaces only the known old `/img/` fixture references with uploaded
Storage photos; user-selected photos are preserved. If Auth creation
is interrupted, rerun to finish the catalogue; Auth accounts and database writes
are separate operations, so some sample accounts may already exist.

Seller accounts here mean login identities and seller profiles. The script
does not grant admin/operator roles, create KYC approvals or inspection reports,
configure Razorpay payout destinations, or insert orders or financial records.
Sample sellers still need real verification before creating additional listings
through the regular API. The historical `lib/seed.ts` and read-only `sell.io/`
are not imported. There is no browser-accessible seed/reset endpoint.

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

### Storage-backed image delivery

`listing_media.storage_path` is the authoritative product-photo reference.
The database trigger rejects missing objects and paths outside the listing
seller's folder, including direct calls to the marketplace RPC. The API derives
the public `img` URL from that path and `NEXT_PUBLIC_SUPABASE_URL`, rather than
trusting a database hostname or returning a local fallback. `attributes.img`
remains a legacy write input; it is excluded from the database read model.

Images are uploaded through the Supabase Storage API; never write file bytes or
manually insert `storage.objects` rows in the hosted database. Import files use
SHA-256 filenames and seller UUID folders. Uploads do not overwrite existing
objects; a duplicate is checked against the original bytes before reuse.
One-year caching is safe for these immutable paths. Uploads complete before
the listing transaction publishes their references. If the database transaction
fails, unreferenced Storage objects may remain; rerunning safely reuses them.
Any future orphan cleanup must account for active listings and retained evidence.

Branding uses a separate public `site-assets` bucket with no browser write
policy. Publish the supplied logo from `assets/brand` and the eight planned
provider-reference logos from `assets/providers`:

```sh
npm run assets:publish                            # preview only
npm run assets:publish -- --apply --write-env     # upload and configure local env
```

Set the returned `NEXT_PUBLIC_BRAND_LOGO_PATH` in each deployment environment,
alongside that environment's Supabase URL, then rebuild Next.js. This is a public
object path, not a secret or a hardcoded project URL. If it is unset, the navbar
shows the TrueDeal name. The browser icon is a bundled Next.js metadata asset.
The homepage selects its image from live listings. Next.js Image allows only
the configured project's public listing/branding paths, with no query strings
or redirects. Private order evidence continues to use short-lived signed URLs.

Provider logos use the generated `assets/providers/manifest.json` with immutable
content hashes; the publisher updates it only after uploading all sources.
Review and commit a changed manifest before deployment. SVGs are trusted static
assets rendered directly as images; the Next.js SVG optimizer remains disabled.
The homepage labels these as planned integrations, not active partnerships.

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
