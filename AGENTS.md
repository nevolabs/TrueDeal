<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — repo guide for the next agent/session

## What this repo is

A Next.js port of [`sell.io`](https://github.com/iamdanusabu/sell.io), a clickable
prototype of an escrow marketplace for pre-owned PC hardware in India (buyer pays
into escrow, a bench agent inspects the item, seller is paid after a 48-hour
buyer inspection window). The original is a static, client-only vanilla-JS app
with no backend (state lives in `localStorage`). This repo rebuilds it as a
real Next.js app with a mock API.

This is a **personal/side project**, not Provana client work. It is pushed to
the personal GitHub account `yethu-KL29` (remote alias `github-personal`,
SSH key `~/.ssh/github_personal`), not any Provana org.

## Layout

**The repo root IS the Next.js app** — `package.json`, `app/`, `components/`,
`lib/`, `public/` all live at the top level. Run `npm install`/`npm run dev`
from the repo root directly, no `cd` needed.

```
app/         Pages (App Router) and API routes (app/api/**).
components/  Shared UI.
lib/         Business logic, mock data, and the mock database (see below).
public/      Static assets (product photos, partner logos).
sell.io/     The ORIGINAL cloned reference project (vanilla JS, static site,
             no build step). Read-only — kept as the source of truth for
             business rules, copy and seed data this app was ported from.
             Do not "fix" bugs here; port fixes into the Next.js app instead.
```

(This used to be nested under a `web/` subfolder with `sell.io/` as its
sibling; it was flattened so the repo root is directly runnable as the app.
See CHANGES.md for when/why.)

## Where things live

- `lib/data.ts` — static constants (fees, categories, conditions, checklists,
  couriers, dispute reasons, status labels, step list). Ported 1:1 from
  `sell.io/assets/js/data.js`.
- `lib/seed.ts` — seed data (demo users, listings, orders). Ported from
  `sell.io/assets/js/store.js`'s `seed()`.
- `lib/store.ts` — the mock "database": an in-memory singleton
  (`globalThis.__sellioState`) plus `db` (queries) and `act` (every business
  action — sign in/up, KYC, create/review listing, place order, and the full
  order state machine: handover → receive → verify → dispatch → delivered →
  release/dispute/refund). Ported from `PK.db` / `PK.act` in `store.js`.
- `lib/session.ts` — reads/writes the `sellio_uid` cookie (httpOnly) that
  tracks who's "signed in". There's no real auth; signing in just looks up a
  user by email with no password check (matches the original prototype).
- `app/api/**/route.ts` — the mock REST API. Every route is a thin wrapper
  around `act`/`db` plus an authorization check based on the session cookie.
- `app/**/page.tsx` — pages, one per route in the original's hash router
  (`#/browse` → `app/browse/page.tsx`, etc.). All pages are client components
  that fetch from `/api/*`; there's no server-side data fetching by design
  (see `next.config.ts` — `cacheComponents` is off because of this — turning
  it on will break prerendering on dynamic routes like `/order/[id]`).
- `components/` — shared UI (Header, Footer, ListingCard, ReportCard,
  StatusBadge, RequireAuth guard, DemoAccounts switcher, icons).
- `lib/session-context.tsx` / `lib/toast-context.tsx` — client-side React
  context providers wired up in `app/layout.tsx`.

## Data & "reset"

All state is in-memory for the Node process (`globalThis.__sellioState`), not
a real database. It resets to the seed data on every server restart, or via
`POST /api/reset` (also clears the session cookie). There is no persistence
beyond the process lifetime — this is intentional for a mock/demo, not a bug.

## Demo accounts (no password required, sign-in by email only)

| Email | Role |
|---|---|
| `arjun@example.com` | Buyer, has orders in progress |
| `rhea@example.com` | Verified seller, has a sale to hand over |
| `bench@sellio.example` | Bench agent (`role: 'ops'`) — inspections, approvals, disputes |

`/login` also has one-click demo account buttons wired to `/api/session` (switch
user directly, bypassing email lookup).

## Running it

```sh
npm install   # if node_modules isn't present
npm run dev   # http://localhost:3000
```

Verify changes with `npx tsc --noEmit`, `npm run build`, and `npx eslint .`
before considering a change done — see CHANGES.md and UX_AUDIT.md for what
was verified at each step so far.

## Known gaps / things a future agent should know

- No real payments, KYC, or courier integrations — all "Prototype: no real
  payment is taken" style copy from the original was preserved.
- No automated tests exist yet (no test runner is configured).
- Image assets were copied from `sell.io/assets/img` into `public/img` once
  at port time; if the reference repo's images change, re-copy manually.
- The Next.js auto-generated agent block at the top of this file is
  regenerated by `next dev` — do not strip it; commit it if it reappears.
- The git repo root is this directory itself, initialized separately from
  whatever enclosing repo exists above it in the user's filesystem — do not
  run git commands assuming a different root.

## Remote

`origin` → `github-personal:nevolabs/TrueDeal.git`, branch `master`.
