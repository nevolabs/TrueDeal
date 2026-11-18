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
- utils/supabase/ contains browser, server, admin and refresh clients; proxy.ts
  refreshes sessions. Protected handlers also verify identity and permissions.
- lib/session.ts resolves verified identity and current profile/roles.
- lib/repository.ts and lib/marketplace-api.ts back the marketplace APIs.
- supabase/migrations/ defines PostgreSQL tables, RLS, grants and transactional
  state changes. supabase/README.md is the deployment and activation runbook.
- lib/payments/ handles Razorpay Checkout/Route, provider reconciliation and
  durable background work through /api/internal/payments/run.
- Product photos use public Supabase Storage; order evidence is private.
- lib/store.ts and lib/seed.ts remain unused historical prototype code.
- /api/reset and passwordless demo account switching have been removed.

## Current activation state

On 2026-11-18 the code and migrations were implemented locally. No hosted
migrations were applied because the CLI had no authenticated session. Only
the project URL and publishable key were supplied. Consult the runbook and
check the actual deployment state before assuming schema application.

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
