# CHANGES.md

Changelog for this repo, newest entry first. Add a new dated entry here for
any substantive change so the next agent/session has context without needing
to replay `git log`.

---

## 2026-11-19 — Hosted migrations applied through database authentication

- Used the owner's supplied database credential through the project's IPv4
  session pooler in Singapore. Stored credentials only in ignored `.env.local`.
  Added a password-based CLI wrapper, a public Supabase CA certificate and the
  `pg` development dependency for read-only inspection. TLS certificate and
  hostname verification remain enabled; no browser/CLI-account login is needed.
- Inspected the target first: no public tables or migration history, one existing
  Auth account. Previewed exactly the four local migrations, then applied them
  using Supabase CLI. The existing Auth account was preserved and its profile
  backfilled. No operator grants, orders or payment records were seeded.
- Verified all four hosted migration versions match local history; a second
  preview reports up to date. All public tables have RLS, anonymous mutation
  is denied, anonymous browse is permitted, and order evidence is private.
  `/api/listings` now returns HTTP 200 with empty listings; payment configuration
  still reports disabled. No payment credentials or live operations were enabled.
- Updated activation documents to reflect the hosted schema and working
  password-authenticated migration path. Applied migration files are now immutable.

## 2026-11-19 — Project migration commands

- Pinned Supabase CLI 3.2.0 as a development dependency and initialized its
  versioned project configuration. Added `db:login`, `db:plan`, `db:migrate`
  and `db:status` scripts. The remote commands explicitly target TrueDeal's
  project ref, skip Vault changes and do not include seed data.
- Made CLI migrations the preferred setup path; the SQL bundle remains an
  optional manual initial-setup artifact. No automatic migration runs are
  added to app startup or request handling. Hosted application still requires
  the owner's Supabase login before commands can read/apply remote history.
- The first `db:plan` parsed the project configuration and selected the intended
  ref, but stopped with `DbConfigIpv6Error` because direct IPv6 is unavailable.
  No database changes occurred. Authentication/linking and an IPv4 pooler
  connection are the remaining prerequisites for hosted application.

## 2026-11-19 — One-file hosted database setup

- Added `npm run db:bundle` and generated `supabase/setup.sql` for initial setup
  through the Supabase SQL Editor. The four reviewed migrations are combined
  inside one transaction; no demo financial records or operator privileges are
  seeded. Source migrations remain the canonical files.
- CLI access was checked again and still has no authentication token. No hosted
  database changes were applied. The SQL Editor setup is ready for the owner to
  execute without sharing database credentials in chat.

## 2026-11-19 — Fix conflicting local servers and request error handling

- Diagnosed two different Next.js projects answering port 3000: TrueDeal on
  IPv6 and MISMRevamp on IPv4. Their `/api/payments/config` responses differed
  (200 versus 404), allowing localhost connections to reach different apps.
- Moved TrueDeal development to `127.0.0.1:3001` and updated the example site
  origin/setup instructions. Stopped the old TrueDeal listener, and stopped
  MISMRevamp's port-3000 listener at the user's explicit request.
- Separately reproduced repeated Turbopack entry restarts through its actual
  `/_next/hmr` connection. Tailwind's automatic project-root scanning registered
  broad watch dependencies. Restricted scanning to app/components/lib and
  restarted the dev server to clear old dependencies; a fresh six-second HMR
  observation contained only initial connection/sync messages and no restarts.
- Added useful API errors for network failures and unexpected HTML responses.
  The home page now catches listing failures and shows a message instead of
  leaving an unhandled rejected fetch. Supabase setup errors remain visible.
- Added API error regression tests and an actual Tailwind compiler/scanner test
  covering watch scope and utility generation. All 18 tests and the production
  build pass. TypeScript and lint pass.
  A live HMR probe also wrote generated log output repeatedly and observed zero
  restart updates, verifying those writes no longer retrigger compilation.
  Both localhost:3001 and 127.0.0.1:3001 return the TrueDeal configuration.
  Browser automation was unavailable; live browser refresh behavior was not
  directly observed after the fix. Work is on `fix/local-refresh-loop`.

## 2026-11-18 — Supabase persistence, real authentication and gated payments

- Replaced runtime use of the mock store and unsigned demo identity cookie with
  verified Supabase Auth users, database roles and persistent marketplace RPCs.
  Added signup/email confirmation, password login/recovery, and sign-out.
  Removed demo account switching and the reset endpoint.
- Added four transactional migrations for marketplace data, restricted grants,
  row access, immutable quote snapshots, reservations, inspections, disputes,
  provider records, durable jobs, a balanced gross ledger, audit logs and Storage.
  No mock identities or financial records are imported. Existing Auth users can
  receive profile backfill when the initial migration is applied.
- Ported buyer, seller and ops APIs to the persistent read model. Added product
  photo uploads and private order evidence, actual courier tracking input and
  explicit pending payment/refund/settlement UI. The seller review form no longer
  collects simulated PAN/Aadhaar/bank information or claims a penny test occurred.
- Added Razorpay server-order Checkout, held Route allocations, signed callback
  verification, durable signed webhooks, provider reconciliation, operator-verified
  linked-account binding and a secret-protected scheduled worker endpoint.
  Unknown financial outcomes stop for reconciliation. Only confirmed capture,
  refund/reversal or bank settlement changes the matching financial outcome.
- Payments remain disabled as explicitly requested. No Route access or payment
  credentials were supplied; no real payment calls were made. The worker endpoint
  is implemented but no external scheduler has been provisioned.
- Hosted activation is pending: `npx supabase projects list` reported no access
  token, no server key is configured, and the hosted `app_state` RPC returned 404.
  No remote schema migrations or real Auth account writes were performed.
  `supabase/README.md` contains SQL/CLI application, email templates, operator
  bootstrap, onboarding and payment-job setup, plus first-release limitations.
- Added Node/tsx tests with the actual migrations executed in PGlite (local
  Supabase Auth/Storage stand-ins), and external payment HTTP contract tests.
  All 15 tests pass. `npx tsc --noEmit`, `npm run build` and `npx eslint .` pass
  with no lint warnings. Production HTTP smoke checks pass for login/recovery,
  anonymous sessions, removed demo/reset routes, CSRF/auth rejection, and disabled
  payments; missing hosted schema returns a clear 503 setup error.
- The current read model targets a small pilot. Larger-scale pagination,
  automatic linked-account creation, courier/KYC integrations, notification
  delivery, detailed provider-fee/tax ledger entries and operational monitoring
  remain future work described in the activation runbook. Hosted end-to-end
  Auth/Storage/Razorpay verification is still required before live use.

## 2026-11-18 — Supabase connection foundation and architecture proposal

- Installed `@supabase/supabase-js` and `@supabase/ssr`; added browser/server
  client helpers under `utils/supabase/` and a Next.js 16 `proxy.ts` that calls
  `getClaims()` and forwards refreshed cookies and cache headers. Webhooks and
  static assets bypass session refreshing.
- Saved the user-supplied project settings in ignored `.env.local`; added a
  tracked placeholder `.env.example` and setup notes in README.md.
- Added `ARCHITECTURE.md`: proposed Supabase Auth/PostgreSQL/Storage model,
  schema, RLS/grants, transaction boundaries, Razorpay held settlements,
  disputes, refunds, background work and delivery sequence. Route remains
  conditional on provider eligibility and funds-flow acceptance.
- This does **not** switch demo auth/data to Supabase. No remote schema was
  inspected or applied, no real accounts were created and no payment operation
  was attempted. The reference `sell.io/` was left untouched.
- Verified: `npx tsc --noEmit`, `npm run build`, and `npx eslint .` passed
  (the existing two warnings in `app/order/[id]/page.tsx` remain). Production
  smoke checks returned HTTP 200 for `/`, `/browse`, `/login`, `/api/session`
  and `/api/listings`, with an anonymous session returning `user: null`.
- Dependency audit: no production vulnerabilities reported by
  `npm audit --omit=dev`; install reported 14 high-severity development-tree
  advisories. No unrelated dependency upgrades were made.

## 2026-11-18 — README rewritten with the actual product positioning

**What was done**

- Replaced the README's product description (which only described the
  `sell.io` used-hardware prototype) with the user-supplied product
  description for the actual product being built: a general secure
  buyer-seller transaction platform (verification + escrow + dispute
  resolution), renamed in the README to **TrueDeal** with the tagline
  "Verified Products. Protected Payments. Trusted Transactions."
- Flagged honestly in the README that the current codebase still implements
  the narrower `sell.io` scope (PC hardware, India, ₹ pricing, Bengaluru hub)
  and hasn't yet been reworked to match the broader product description —
  this is a known gap for a future session, not something silently glossed
  over.

## 2026-11-18 — Flatten repo root to be the Next.js app directly

**What was done**

- Moved every file out of `web/` up to the repo root via `git mv` (preserving
  history), so `package.json`, `app/`, `components/`, `lib/`, `public/` are
  now at the top level — `npm install`/`npm run dev` work directly from the
  repo root, no `cd web` needed. `sell.io/` (the original reference clone)
  stays as a sibling folder.
- Merged `web/.gitignore` into the root `.gitignore` (kept the fuller
  Next.js-generated one) and merged `web/AGENTS.md`'s Next.js
  auto-generated agent block into the root `AGENTS.md`, which was rewritten
  to describe the flat layout.
- Deleted the now-empty `web/` directory (including its `node_modules`/
  `.next`, which were gitignored anyway) and reinstalled dependencies at the
  repo root.
- Verified: `npx tsc --noEmit`, `npm run build`, `npx eslint .` all clean
  from the new root location.

## 2026-11-18 — UX audit fixes, repo rename, proper README

**What was done**

- Ran a full UX/design audit fix pass (see `UX_AUDIT.md`): found and fixed
  the root cause of most contrast complaints (a leftover
  `prefers-color-scheme: dark` media query in `globals.css` that fought the
  app's light-only theme), then fixed all 25 audit items plus an
  accessibility/mobile pass — header/login/browse/item/home/footer/sell page
  polish, URL-synced + dead-end-aware browse filters, a payout-calculator
  edge case, emoji icons replaced with a small inline SVG set
  (`components/icons.tsx`, no new dependency), `/protection` renamed to
  `/how-it-works`, and site-wide `:focus-visible` + `prefers-reduced-motion`
  CSS added.
- GitHub repo renamed by the user from `PALAM---The-Bridge` to `TrueDeal`;
  updated the git remote URL and every doc reference.
- Replaced the create-next-app boilerplate `README.md` with real setup/run/
  demo-account/verification instructions.

## 2026-11-17 — Initial clone + Next.js port

**What was done**

- Cloned `https://github.com/iamdanusabu/sell.io` into `sell.io/` (reference
  only; its own `.git` history was dropped since it's vendored, not a
  submodule).
- Built a full Next.js 16 / TypeScript / Tailwind v4 port in `web/`:
  - Ported static data/constants (`lib/data.ts`), seed data (`lib/seed.ts`),
    and the entire business-logic/state-machine layer (`lib/store.ts`) from
    the original's `assets/js/data.js` and `assets/js/store.js`.
  - Added a mock REST API (`app/api/**/route.ts`) backed by an in-memory
    singleton store and an httpOnly session cookie (`lib/session.ts`) — no
    real auth, matching the original prototype's "sign in by email" model.
  - Rebuilt every page from the original's hash router as an App Router page:
    home, browse, item detail, how-it-works, login/join, sell landing, KYC
    verification, new listing, seller dashboard, checkout, buyer orders,
    order detail (role-aware: buyer/seller/bench-agent panels + ops
    inspection form), and the bench console (`/ops`).
  - Copied product photos and partner logos into `web/public/img`.
- Disabled `cacheComponents` in `next.config.ts` — it's incompatible with the
  all-client-components-fetch-the-mock-API architecture used here (dynamic
  routes like `/order/[id]` failed to prerender with it on).
- Verified: `npx tsc --noEmit` clean, `npm run build` clean, `npx eslint .`
  clean (two harmless warnings only). Exercised the full API lifecycle via
  curl against a running dev server: signup → KYC submit → listing blocked
  pre-verification → KYC approved by ops → listing created (pending) →
  approved by ops → full order lifecycle (paid → handover → at_hub →
  inspected/verified → dispatched/shipped → delivered → released/completed).
  Reset mock data back to seed state afterward (`POST /api/reset`).
- Initialized a new, separate git repo scoped to this `sellio/` directory
  (the enclosing filesystem tree has its own unrelated git repo one level up
  from here — left untouched) and pushed to the personal GitHub account:
  `origin` → `github-personal:nevolabs/TrueDeal.git`, branch
  `master`. Git identity for this repo: `yethu-KL29 <yethukichu55@gmail.com>`
  (local config only, not global).
- Added `AGENTS.md` (repo root) and this file.

**Known limitations carried forward**

- No persistence beyond the Node process — state resets on restart or via
  `POST /api/reset`. This is intentional for a mock, not a TODO.
- No automated test suite yet.
- No real payments, KYC provider, or courier integration — all mocked,
  matching the original prototype's own disclaimers.
