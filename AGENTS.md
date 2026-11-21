<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — repository guide

This is the personal TrueDeal marketplace project, not Provana client work.
The repository root is the Next.js app. The original sell.io/ directory is
read-only reference material. Do not change it or import its demo financial
records into the live database.

## Current implementation

- Supabase Auth supplies email/password authentication and JWT sessions.
- Email confirmation is disabled at the owner's request (2026-11-20), locally
  and in hosted Auth. Signup establishes a session immediately; password-based
  sign-in, verified JWT checks and email-based password recovery remain active.
- utils/supabase/ contains browser, server, admin and refresh clients; proxy.ts
  refreshes sessions. Protected handlers also verify identity and permissions.
- lib/session.ts resolves verified identity and current profile/roles.
- lib/repository.ts and lib/marketplace-api.ts back the marketplace APIs.
- supabase/migrations/ defines PostgreSQL tables, RLS, grants and transactional
  state changes. supabase/README.md is the deployment and activation runbook.
- lib/payments/ handles Razorpay Checkout/Route, provider reconciliation and
  durable background work through /api/internal/payments/run.
- Product photos use public Supabase Storage; order evidence is private.
- Product image references are canonical `listing_media.storage_path` values;
  the server derives URLs for the configured project. Do not add `/img/`
  catalogue fallbacks. Import inputs live in `scripts/fixtures/catalog`.
- Seller details use basic format/consistency checks, with `kyc.basicStatus`
  separate from identity verification. Completion unlocks listings without
  operator review; it never grants ID verification or payment activation.
  Full PAN/account numbers are not retained. New listings require 1–8 owned
  Storage photos; item galleries use ordered listing_media rows.
- Seller dashboard includes seller/bank details updates and owned listing edits.
  Product edits require a current revision and return to review. Reserved/sold,
  hub-inspected and active-order listings cannot be edited. Activated payout
  accounts require provider-managed changes; basic updates do not move money.
- Navbar branding uses the public `site-assets` bucket and the deployment's
  `NEXT_PUBLIC_BRAND_LOGO_PATH`. Its source is in `assets/brand`.
- The homepage follows the owner's reference screenshots: dark home header,
  three-line hero headline, full-height artwork, integrated dark facts row and
  provider-reference grid. Provider logos use `assets/providers/manifest.json`
  and hosted Storage; they must remain labelled as planned integrations.
- lib/store.ts and lib/seed.ts remain unused historical prototype code.
- /api/reset and passwordless demo account switching have been removed.

## Current activation state

On 2026-11-19 all four migrations were applied to the hosted project using
the owner's supplied database credential and the IPv4 session pooler, with
CA/hostname verification enabled. The existing Auth account was preserved
and its profile backfilled; no operator grants or financial records were seeded.
`npm run db:status` and `npm run db:inspect` verify the current hosted state.
Migration credentials live only in ignored .env.local. Applied migrations
are immutable; use a new migration for subsequent schema changes.

On 2026-11-20 the fifth migration (`202611200001_storage_media.sql`) was applied
for owned Storage image references and branding. The owner-requested sample
catalogue has four sellers, one buyer and 14 live demo listings; photo imports
use Storage APIs and do not create orders, verification claims or operator roles.

Payments default to disabled and the user explicitly requested keeping them
off until Razorpay Route is configured. Do not enable live payments, seed
operators or claim an escrow partnership automatically. Never expose the
Supabase server key, Razorpay secrets or CRON_SECRET to a browser.

## Running and verification

Run npm install and npm run dev from this root. Apply the SQL migrations and
configure Auth before using accounts or marketplace data. There is no mock
fallback. Use real confirmed Auth users; bootstrap ops through SQL Editor.

Required checks: npm test, npx tsc --noEmit, npm run build, npx eslint .
Tests execute actual migrations in PGlite with local Auth/Storage schemas and
mock only external payment HTTP boundaries. They do not establish hosted
integration success. Update CHANGES.md for substantive changes.

## Invariants

All money is integer paise in PostgreSQL. Server/database code calculates
quotes; the browser cannot select payout destinations or amounts. Order
transitions and financial decisions are atomic RPCs. Capture, held allocation,
release authorization, bank settlement, refund and reversal are distinct.
Do not mark a financial operation complete on browser success or an unknown
provider outcome. Unknown money-moving POSTs require reconciliation.

This repository has its own .git directory. Remote origin is
github-personal:nevolabs/TrueDeal.git; branch master. Do not assume the
enclosing filesystem directory is this repository's Git root.
