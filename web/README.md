# sell.io (Next.js port)

A Next.js rebuild of [`sell.io`](https://github.com/iamdanusabu/sell.io), a
clickable prototype of a verified marketplace for pre-owned computer hardware
in India. Buyers pay into escrow, a bench agent inspects the item, and the
seller is paid only after the buyer has had 48 hours with it.

This version replaces the original's client-only `localStorage` state with a
real (mocked) REST API, backed by an in-memory store that's seeded with the
same sample data on every server start.

> This is a **mock prototype**. No real payments, KYC checks, or courier
> bookings happen — see `UX_AUDIT.md` and the root `AGENTS.md` / `CHANGES.md`
> for full project history and design notes.

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
see `AGENTS.md` at the repo root for the full verification expectations.

## What's where

See `../AGENTS.md` (one level up, at the repo root) for the full map of the
codebase — business logic, API routes, pages, and the mock data/reset model.
Short version:

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
