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

## About this codebase

This repo is a working prototype of that product, built as a Next.js app. It
started as a rebuild of [`sell.io`](https://github.com/iamdanusabu/sell.io) —
a clickable prototype scoped to pre-owned computer hardware in India — and
the current implementation still reflects that scope (hardware categories,
₹ pricing, a Bengaluru hub) pending a broader rework to match the product
description above. State is served through a real (mocked) REST API backed
by an in-memory store, seeded with sample data on every server start, rather
than the original's client-only `localStorage`.

> This is a **mock prototype**. No real payments, KYC checks, or courier
> bookings happen — see `UX_AUDIT.md` and `AGENTS.md` / `CHANGES.md` for full
> project history and design notes.

## Requirements

- Node.js 18.18 or later (Next.js 16 requirement)
- npm (a `package-lock.json` is committed; other package managers aren't tested)

## Run it locally

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign in from `/login` as one of the three demo accounts (buyer, verified
seller, or bench agent) — no password needed, they're one-click. Use
**Reset** behavior via `POST /api/reset` if you want to wipe back to seed
data (there's no UI button for it currently; call it directly, e.g.
`curl -X POST http://localhost:3000/api/reset`).

| Demo account | Role |
|---|---|
| `arjun@example.com` | Buyer, has orders in progress |
| `rhea@example.com` | Verified seller, has a sale to hand over |
| `bench@sellio.example` | Bench agent — inspections, approvals, disputes |

## Other commands

```sh
npm run build        # production build
npm start             # run the production build (after npm run build)
npx tsc --noEmit       # type-check only
npx eslint .           # lint
```

Run all three (`tsc`, `build`, `eslint`) before considering any change done —
see `AGENTS.md` for the full verification expectations.

## What's where

See `AGENTS.md` for the full map of the codebase — business logic, API
routes, pages, and the mock data/reset model. Short version:

- `lib/data.ts`, `lib/seed.ts`, `lib/store.ts` — business rules, seed data,
  and the in-memory mock database + order state machine.
- `app/api/**` — the mock REST API.
- `app/**/page.tsx` — pages (all client components, fetching from `/api/*`).
- `components/` — shared UI.

## Notes on persistence

State lives in `globalThis.__sellioState` for the lifetime of the Node
process — it resets whenever the dev/production server restarts, or on
`POST /api/reset`. There is no database; this is intentional for a mock.

## Deploying

No special configuration needed beyond a standard Next.js deployment
(e.g. Vercel). Since all state is in-memory and per-process, a multi-instance
or serverless deployment will **not** share state between requests/instances
— fine for demoing the UI and flows, not suitable for anything persistent.
