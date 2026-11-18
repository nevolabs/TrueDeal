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
flag. Route is not yet activated. Hosted schema application and live integration
verification require project access; no demo data is migrated automatically.

See [supabase/README.md](supabase/README.md) for database migrations, Auth email
configuration, operator setup, Storage, payment activation and worker scheduling.
See [ARCHITECTURE.md](ARCHITECTURE.md) for the design and implementation scope.

## Run locally

Use a Node.js version supported by the installed Next.js release (Node 24 was
used for verification).

```sh
npm install
# Copy .env.example to .env.local and configure your project settings.
# Apply the SQL migrations before using account or marketplace data.
npm run dev
```

The Next.js app lives at the repository root. Open http://localhost:3000.
Create a real account at /login?mode=join and confirm its email. Passwordless
demo switching and the reset API have been removed.

## Verify

```sh
npm test
npx tsc --noEmit
npm run build
npx eslint .
```

Tests run against embedded PostgreSQL and mocked payment HTTP boundaries.
Hosted end-to-end verification requires a configured Supabase staging project
and approved Razorpay Route test access. Payments remain disabled by default.

## Main modules

- app/api/**: validated API routes and payment webhooks.
- lib/session.ts: verified Supabase identity and current account/role lookup.
- lib/repository.ts and lib/marketplace-api.ts: persistent marketplace access.
- supabase/migrations/: transactional schema, permissions and state changes.
- lib/payments/: Checkout, provider verification and durable payment work.
- utils/supabase/: browser, server, admin and session-refresh clients.
- lib/store.ts and lib/seed.ts: unused historical prototype code, not live state.
- sell.io/: original static reference; read-only.
