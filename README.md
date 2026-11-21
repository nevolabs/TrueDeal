# TrueDeal

**"Verified Products. Protected Payments. Trusted Transactions."**

## Product Description

We are building a **secure buyer–seller transaction platform** that combines
**independent product verification, escrow-based payment protection, and
dispute resolution** to make buying and selling safer and more transparent.

The platform serves as a trusted intermediary between buyers and sellers,
ensuring that both parties are protected throughout the transaction.

### How It Works

1. **Deal Creation:** The buyer and seller agree on the product, price,
   delivery terms, and transaction conditions.
2. **Secure Payment:** The buyer makes a payment, which is held securely
   through an authorized escrow or payment partner rather than being
   transferred directly to the seller.
3. **Product Verification:** The product is verified for authenticity,
   condition, and compliance with the agreed specifications through an
   appropriate inspection process.
4. **Transaction Completion:** Once the agreed verification and delivery
   conditions are satisfied, payment is released to the seller.
5. **Dispute Resolution:** If the product does not match the agreed
   conditions or a transaction issue arises, the platform facilitates a
   structured dispute-resolution process based on predefined rules.

### Value Proposition

**For Buyers:** Confidence that the product meets the agreed requirements
before payment is released.

**For Sellers:** Assurance that the buyer has committed the required funds
and that payment will be released when agreed conditions are fulfilled.

**Our Vision:** To build a trusted infrastructure for peer-to-peer and
business transactions where both buyers and sellers can trade with
confidence, transparency, and security.

## Implementation

The app now uses Supabase Auth (email/password and JWT sessions), PostgreSQL
for marketplace state, and Supabase Storage for product photos and private
order evidence. The original static sell.io reference remains read-only.

Razorpay Checkout/Route integration is implemented behind a disabled payment
flag. Route is not yet activated. The four database migrations were applied to
the hosted Supabase project on 2026-11-19; no demo data was imported. Full
authenticated application and payment integration verification remains separate.

The fifth migration, applied on 2026-11-20, enforces Storage-backed product
media. Product photos are referenced by object path in `listing_media`; the API
returns environment-specific public URLs. Navbar branding uses `site-assets`
and `NEXT_PUBLIC_BRAND_LOGO_PATH`. See the Storage section in the activation
runbook for publishing assets and configuring deployments.

See [supabase/README.md](supabase/README.md) for database migrations, Auth email
configuration, operator setup, Storage, payment activation and worker scheduling.
See [ARCHITECTURE.md](ARCHITECTURE.md) for the design and implementation scope.

Apply schema changes from code with `npm run db:plan`, then `npm run db:migrate`.
Check history with `npm run db:status`. These commands use the database password
in ignored `.env.local`; browser/CLI login is not required for this workflow.

## Run locally

Use a Node.js version supported by the installed Next.js release (Node 24 was
used for verification).

```sh
npm install
# Copy .env.example to .env.local and configure your project settings.
# Apply the SQL migrations before using account or marketplace data.
npm run dev
```

The Next.js app lives at the repository root. Open http://localhost:3001.
Development binds to IPv4 port 3001 to keep TrueDeal separate from other local
projects using port 3000. Use the same origin in your Supabase redirect settings.
Create an account at /login?mode=join using an email and password. With
Supabase's Confirm email setting disabled, signup signs you in immediately.
Passwordless demo switching and the reset API have been removed.

## Verify

```sh
npm test
npm run build
npx tsc --noEmit
npx eslint .
```

Tests run against embedded PostgreSQL and mocked payment HTTP boundaries.
Hosted end-to-end verification requires a configured Supabase staging project
and approved Razorpay Route test access. Payments remain disabled by default.

Browser layout checks use the configured catalogue and do not create accounts
or orders. Install Chromium once with `npx playwright install chromium`, then
run `npm run test:browser`. The suite starts/reuses the local dev server and
checks home/sell at desktop, tablet and mobile widths. Screenshots are written
to ignored `test-results/`. Set `PLAYWRIGHT_BASE_URL` to check an existing
production server instead. Tailwind uses the standard PostCSS integration in
`postcss.config.mjs`; do not add a second CSS loader.

## Main modules

- app/api/**: validated API routes and payment webhooks.
- lib/session.ts: verified Supabase identity and current account/role lookup.
- lib/repository.ts and lib/marketplace-api.ts: persistent marketplace access.
- supabase/migrations/: transactional schema, permissions and state changes.
- lib/payments/: Checkout, provider verification and durable payment work.
- utils/supabase/: browser, server, admin and session-refresh clients.
- lib/store.ts and lib/seed.ts: unused historical prototype code, not live state.
- sell.io/: original static reference; read-only.
